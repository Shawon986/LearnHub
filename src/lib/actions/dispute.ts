"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { refundPayment } from "@/lib/payments/engine";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

const openDisputeSchema = z.object({
  paymentId: z.string().optional().nullable(),
  bookingId: z.string().optional().nullable(),
  reason: z.enum(["PAYMENT_ISSUE", "COURSE_ISSUE", "BOOKING_ISSUE", "OTHER"]),
  description: z.string().trim().min(10, "Describe the issue (min 10 characters).").max(2000),
});

/** Student opens a dispute on a payment or booking. */
export async function openDispute(input: {
  paymentId?: string | null;
  bookingId?: string | null;
  reason: string;
  description: string;
}): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT");
    const data = openDisputeSchema.parse(input);
    if (!data.paymentId && !data.bookingId) {
      return actionError("A payment or booking is required.");
    }

    // Ownership + no active dispute on the same target.
    if (data.paymentId) {
      const payment = await db.payment.findFirst({
        where: { id: data.paymentId, studentId: user.id },
      });
      if (!payment) return actionError("Payment not found.");
      const existing = await db.dispute.findFirst({
        where: { paymentId: data.paymentId, status: { notIn: ["CLOSED"] } },
      });
      if (existing) return actionError("This payment already has an open dispute.");
    }
    if (data.bookingId) {
      const booking = await db.booking.findFirst({
        where: { id: data.bookingId, studentId: user.id },
      });
      if (!booking) return actionError("Booking not found.");
      const existing = await db.dispute.findFirst({
        where: { bookingId: data.bookingId, status: { notIn: ["CLOSED"] } },
      });
      if (existing) return actionError("This booking already has an open dispute.");
    }

    const dispute = await db.dispute.create({
      data: {
        openedById: user.id,
        paymentId: data.paymentId ?? null,
        bookingId: data.bookingId ?? null,
        reason: data.reason,
        description: data.description,
        status: "OPEN",
      },
    });

    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    });
    await createNotificationMany(admins.map((a) => a.id), {
      type: "SYSTEM",
      title: "New dispute opened ⚖️",
      body: `${user.name} opened a dispute: ${data.reason}.`,
      data: { disputeId: dispute.id },
    });
    await createNotification({
      userId: user.id,
      type: "SYSTEM",
      title: "Dispute received",
      body: "Our team will review it within 2–3 working days.",
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "dispute.open",
      entityType: "Dispute",
      entityId: dispute.id,
    });
    revalidatePath("/dashboard/disputes");
    revalidatePath("/admin/disputes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const disputeMessageSchema = z.object({
  content: z.string().trim().min(2).max(2000),
});

/** Message in a dispute thread (opener, involved teacher, or admin). */
export async function disputeMessage(
  disputeId: string,
  content: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = disputeMessageSchema.parse({ content });

    const dispute = await db.dispute.findUnique({
      where: { id: disputeId },
      include: { booking: { select: { teacherId: true } }, payment: { select: { studentId: true } } },
    });
    if (!dispute) return actionError("Dispute not found.");

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);
    const isOpener = dispute.openedById === user.id;
    const isTeacher = dispute.booking?.teacherId === user.id;
    if (!isAdmin && !isOpener && !isTeacher) {
      return actionError("You are not part of this dispute.");
    }

    await db.disputeMessage.create({
      data: { disputeId, senderId: user.id, content: data.content },
    });
    await db.dispute.update({
      where: { id: disputeId },
      data: {
        updatedAt: new Date(),
        ...(isAdmin && dispute.status === "OPEN" ? { status: "UNDER_REVIEW" } : {}),
      },
    });

    revalidatePath(`/admin/disputes/${disputeId}`);
    revalidatePath("/dashboard/disputes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const resolveDisputeSchema = z.object({
  outcome: z.enum(["RESOLVED_REFUNDED", "RESOLVED_RELEASED", "CLOSED"]),
  resolution: z.string().trim().min(5, "Explain the resolution.").max(2000),
});

/** Admin resolves a dispute — refunding calls the payment engine. */
export async function resolveDispute(
  disputeId: string,
  input: { outcome: string; resolution: string },
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const data = resolveDisputeSchema.parse(input);

    const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) return actionError("Dispute not found.");
    if (!["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"].includes(dispute.status)) {
      return actionError("This dispute is already resolved.");
    }

    let refundResult: { ok: boolean; error?: string } | null = null;
    if (data.outcome === "RESOLVED_REFUNDED") {
      if (!dispute.paymentId) return actionError("This dispute has no payment to refund.");
      refundResult = await refundPayment(
        dispute.paymentId,
        { reason: `Dispute resolution: ${data.resolution.slice(0, 200)}` },
        { id: actor.id, email: actor.email },
      );
      if (!refundResult.ok) return actionError(refundResult.error ?? "Refund failed.");
    }

    await db.dispute.update({
      where: { id: disputeId },
      data: {
        status: data.outcome,
        resolution: data.resolution,
        refundAmount: refundResult ? (await db.payment.findUnique({ where: { id: dispute.paymentId! } }))?.amount ?? null : null,
        resolvedById: actor.id,
      },
    });

    const recipients = new Set<string>([dispute.openedById]);
    if (dispute.bookingId) {
      const booking = await db.booking.findUnique({ where: { id: dispute.bookingId } });
      if (booking) recipients.add(booking.teacherId);
    }
    for (const userId of recipients) {
      await createNotification({
        userId,
        type: "SYSTEM",
        title: `Dispute ${data.outcome.replace("_", " ").toLowerCase()}`,
        body: data.resolution,
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `dispute.resolve.${data.outcome}`,
      entityType: "Dispute",
      entityId: disputeId,
      metadata: { refunded: Boolean(refundResult?.ok) },
    });
    revalidatePath(`/admin/disputes/${disputeId}`);
    revalidatePath("/admin/disputes");
    revalidatePath("/dashboard/disputes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
