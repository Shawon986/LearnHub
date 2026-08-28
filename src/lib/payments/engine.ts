import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";
import { createNotification, emailIfEnabled } from "@/lib/notifications";
import { formatBDT } from "@/lib/format";
import { splitFor } from "@/lib/payments/commission";
import { applyCouponAtCompletion } from "@/lib/coupons";
import { getReferralReward } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/constants";
import type { VerifiedWebhookEvent } from "@/lib/payments/types";

// ============================================================
// Payment engine — the ONLY place payment state changes.
// Rules:
//  - Frontend never marks payments complete.
//  - Completion is idempotent: a duplicate webhook is a no-op.
//  - Amounts reported by gateways are checked against the order.
// ============================================================

interface CreateOrderInput {
  studentId: string;
  amount: number;
  purpose: "COURSE_PURCHASE" | "BOOKING";
  courseId?: string | null;
  bookingId?: string | null;
  description: string;
}

/** Create a PENDING order payment (no money has moved yet). */
export async function createOrderPayment(input: CreateOrderInput) {
  return db.payment.create({
    data: {
      studentId: input.studentId,
      amount: input.amount,
      currency: "BDT",
      method: "DEV",
      provider: "DEV",
      status: "PENDING",
      purpose: input.purpose,
      courseId: input.courseId ?? null,
      bookingId: input.bookingId ?? null,
      metadata: { description: input.description },
    },
  });
}

/**
 * Record a server-verified successful payment. Idempotent.
 * Returns the resulting payment (or the existing one on duplicates).
 */
export async function handlePaymentSuccess(
  paymentId: string,
  event: VerifiedWebhookEvent,
): Promise<{ ok: boolean; duplicate?: boolean; mismatch?: boolean }> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });

  if (!payment) {
    console.error(`[payments] unknown payment ${paymentId} in webhook`);
    return { ok: false };
  }

  // Idempotency: duplicate webhooks are no-ops.
  if (payment.status === "COMPLETED") {
    return { ok: true, duplicate: true };
  }

  // Amount mismatch → fail the order, never credit it.
  if (event.amount != null && event.amount !== payment.amount) {
    console.error(
      `[payments] amount mismatch for ${paymentId}: order=${payment.amount} gateway=${event.amount}`,
    );
    await db.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED", providerTrxId: event.trxId ?? null },
    });
    return { ok: false, mismatch: true };
  }

  const teacherId = payment.courseId
    ? (await db.course.findUnique({ where: { id: payment.courseId }, select: { teacherId: true } }))?.teacherId
    : payment.bookingId
      ? (await db.booking.findUnique({ where: { id: payment.bookingId }, select: { teacherId: true } }))?.teacherId
      : payment.liveClassId
        ? (await db.liveClass.findUnique({ where: { id: payment.liveClassId }, select: { teacherId: true } }))?.teacherId
        : null;

  if (!teacherId) {
    console.error(`[payments] no teacher resolvable for payment ${paymentId}`);
    return { ok: false };
  }

  const split = await splitFor(teacherId, payment.amount, payment.courseId);

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "COMPLETED",
        providerPaymentId: event.providerPaymentId ?? payment.providerPaymentId,
        providerTrxId: event.trxId ?? null,
        paidAt: new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        userId: payment.studentId,
        type: "PAYMENT",
        amount: payment.amount,
        description: String((payment.metadata as { description?: string } | null)?.description ?? payment.purpose),
        reference: event.trxId ?? event.providerPaymentId ?? undefined,
        paymentId,
      },
    });

    // Paid live class → registration (if not already registered).
    if (payment.purpose === "LIVE_CLASS" && payment.liveClassId) {
      const existing = await tx.liveClassParticipant.findUnique({
        where: { liveClassId_userId: { liveClassId: payment.liveClassId, userId: payment.studentId } },
      });
      if (!existing) {
        await tx.liveClassParticipant.create({
          data: {
            liveClassId: payment.liveClassId,
            userId: payment.studentId,
            role: "STUDENT",
            attendanceStatus: "REGISTERED",
          },
        });
      }
    }

    // Course purchase → enrollment (if not already enrolled).
    if (payment.purpose === "COURSE_PURCHASE" && payment.courseId) {
      const existing = await tx.enrollment.findUnique({
        where: { studentId_courseId: { studentId: payment.studentId, courseId: payment.courseId } },
      });
      if (!existing) {
        const enrollment = await tx.enrollment.create({
          data: {
            studentId: payment.studentId,
            courseId: payment.courseId,
            status: "ACTIVE",
            pricePaid: payment.amount,
          },
        });
        await tx.courseProgress.create({
          data: {
            enrollmentId: enrollment.id,
            studentId: payment.studentId,
            courseId: payment.courseId,
            percentComplete: 0,
          },
        });
        await tx.course.update({
          where: { id: payment.courseId },
          data: { enrollmentCount: { increment: 1 } },
        });
      }
    }

    // Commission + wallet credit.
    await tx.commission.create({
      data: {
        paymentId,
        teacherId,
        amount: split.commission,
        ratePercent: split.rate,
        status: "CAPTURED",
        capturedAt: new Date(),
      },
    });

    const wallet = await tx.teacherWallet.upsert({
      where: { teacherId },
      update: {},
      create: { teacherId },
    });
    await tx.teacherWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { increment: split.net },
        totalEarnings: { increment: split.net },
        totalCommission: { increment: split.commission },
      },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: split.net,
        description: `Payment received — ${payment.purpose.replace("_", " ").toLowerCase()}`,
        balanceAfter: wallet.availableBalance + split.net,
      },
    });
  });

  // Coupon redemption (idempotent, recorded only on completion).
  const meta = (payment.metadata ?? {}) as { couponId?: string; couponCode?: string; discountAmount?: number };
  if (meta.couponId) {
    await applyCouponAtCompletion(paymentId, meta.couponId, payment.studentId, meta.discountAmount ?? 0);
  }

  // Referral reward: the student's FIRST completed purchase triggers the
  // referrer's reward (settings-driven, min purchase enforced).
  await maybeAwardReferral(payment);

  // Notifications (outside the transaction).
  const courseTitle = payment.courseId
    ? (await db.course.findUnique({ where: { id: payment.courseId }, select: { title: true } }))?.title
    : "1-on-1 session";
  await createNotification({
    userId: payment.studentId,
    type: "PAYMENT_SUCCESS",
    title: "Payment successful ✅",
    body: `${formatBDT(payment.amount)} paid for "${courseTitle}".`,
  });
  // Transactional receipt (opt-in email).
  emailIfEnabled(
    payment.studentId,
    "PAYMENT_SUCCESS",
    `Payment receipt — ${formatBDT(payment.amount)}`,
    `Hi,\n\nYour payment of ${formatBDT(payment.amount)} for "${courseTitle}" was successful.\nTransaction: ${event.trxId ?? event.providerPaymentId ?? "—"}\n\nThanks for learning with LearnHub!`,
  ).catch(() => {});

  await createNotification({
    userId: teacherId,
    type: "PAYMENT_SUCCESS",
    title: `You earned ${formatBDT(split.net)} 💰`,
    body: `Payment received (${formatBDT(payment.amount)} − ${split.rate}% commission).`,
  });

  await logAudit({
    actorId: payment.studentId,
    action: "payment.completed",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { amount: payment.amount, provider: event.providerPaymentId ?? null },
  });

  return { ok: true };
}

/** Record a failed payment (webhook or explicit cancel). */
export async function handlePaymentFailure(
  paymentId: string,
  event?: VerifiedWebhookEvent,
): Promise<void> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || ["COMPLETED", "REFUNDED"].includes(payment.status)) return;

  await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "FAILED",
      providerTrxId: event?.trxId ?? payment.providerTrxId,
    },
  });
  await createNotification({
    userId: payment.studentId,
    type: "PAYMENT_FAILED",
    title: "Payment failed",
    body: "Your payment didn't go through. You can try again from checkout.",
  });
}

async function maybeAwardReferral(payment: { id: string; studentId: string; amount: number }) {
  const referral = await db.referral.findFirst({
    where: { refereeId: payment.studentId, status: "PENDING" },
  });
  if (!referral) return;

  const [reward, minPurchase] = await Promise.all([
    getReferralReward(),
    db.platformSetting.findUnique({ where: { key: SETTING_KEYS.REFERRAL_MIN_PURCHASE } }),
  ]);
  const min = typeof (minPurchase?.value as unknown) === "number" ? (minPurchase!.value as number) : 500;
  if (payment.amount < min) return;

  await db.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: { status: "REWARDED", rewardAmount: reward, rewardedAt: new Date() },
    });
    await tx.studentProfile.update({
      where: { userId: referral.referrerId },
      data: { referralBalance: { increment: reward } },
    });
    await tx.transaction.create({
      data: {
        userId: referral.referrerId,
        type: "REFERRAL_REWARD",
        amount: reward,
        description: `Referral reward — your friend's first purchase`,
      },
    });
  });

  await createNotification({
    userId: referral.referrerId,
    type: "SYSTEM",
    title: `Referral reward: +৳${reward.toLocaleString()} 🎁`,
    body: "A friend you referred made their first purchase.",
  });
}

/** Admin-initiated refund: reverses payment, commission and enrollment. */
export async function refundPayment(
  paymentId: string,
  input: { reason?: string | null },
  actor: { id: string; email: string },
): Promise<{ ok: boolean; error?: string }> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { commission: true, refund: true },
  });
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status !== "COMPLETED") return { ok: false, error: "Only completed payments can be refunded." };
  if (payment.refund) return { ok: false, error: "This payment was already refunded." };

  const teacherId = payment.commission?.teacherId;
  const split = teacherId
    ? await splitFor(teacherId, payment.amount, payment.courseId)
    : null;

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });
    await tx.refund.create({
      data: {
        paymentId,
        amount: payment.amount,
        reason: input.reason ?? null,
        status: "PROCESSED",
        processedById: actor.id,
        processedAt: new Date(),
      },
    });
    await tx.transaction.create({
      data: {
        userId: payment.studentId,
        type: "REFUND",
        amount: payment.amount,
        description: `Refund — ${input.reason ?? "admin refund"}`,
        paymentId,
      },
    });

    if (teacherId && split) {
      await tx.commission.update({
        where: { id: payment.commission!.id },
        data: { status: "REVERSED" },
      });
      const wallet = await tx.teacherWallet.findUnique({ where: { teacherId } });
      if (wallet) {
        const decrement = Math.min(split.net, wallet.availableBalance);
        await tx.teacherWallet.update({
          where: { id: wallet.id },
          data: {
            availableBalance: { decrement },
            totalEarnings: { decrement: split.net },
            totalCommission: { decrement: split.commission },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "DEBIT",
            amount: split.net,
            description: `Refund reversal — ${payment.purpose.replace("_", " ").toLowerCase()}`,
            balanceAfter: wallet.availableBalance - decrement,
          },
        });
      }
    }

    if (payment.courseId) {
      await tx.enrollment.updateMany({
        where: { studentId: payment.studentId, courseId: payment.courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
        data: { status: "REFUNDED" },
      });
      await tx.course.update({
        where: { id: payment.courseId },
        data: { enrollmentCount: { decrement: 1 } },
      });
    }
  });

  await createNotification({
    userId: payment.studentId,
    type: "PAYMENT_FAILED",
    title: "Refund issued 💸",
    body: `${formatBDT(payment.amount)} has been refunded (${input.reason ?? "admin refund"}).`,
  });
  if (teacherId) {
    await createNotification({
      userId: teacherId,
      type: "SYSTEM",
      title: "Payment refunded",
      body: `${formatBDT(split?.net ?? 0)} was reversed from your wallet for a refunded payment.`,
    });
  }

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "payment.refund",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { amount: payment.amount, reason: input.reason ?? null },
  });

  return { ok: true };
}

/**
 * Is the DEV sandbox completion path enabled?
 * Operator-controlled via PAYMENT_PROVIDERS: the sandbox exists only while
 * "DEV" is listed there. Production deployments must set real providers
 * and remove DEV — see docs/payments.md. Sandbox payments are always
 * recorded with provider="DEV" so they're auditable and never mistaken
 * for real money.
 */
export function devPaymentsEnabled(): boolean {
  const providers = (env.PAYMENT_PROVIDERS ?? "DEV").toUpperCase().split(",").map((s) => s.trim());
  return providers.includes("DEV");
}
