"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import {
  createOrderPayment,
  devPaymentsEnabled,
  handlePaymentFailure,
  handlePaymentSuccess,
  refundPayment,
} from "@/lib/payments/engine";
import { getPaymentProvider } from "@/lib/payments";
import { type ActionResult } from "@/lib/actions/shared";

/** Flatten the "ok" result of a payment action. */
function actionError(message: string): { ok: false; error: string } {
  return { ok: false, error: message };
}

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

type CheckoutResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

/** Start a course purchase: creates a PENDING order payment, returns checkout URL. */
export async function initiateCoursePurchase(
  courseId: string,
): Promise<CheckoutResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return actionError("Course not found.");
    if (course.status !== "PUBLISHED") return actionError("This course is not available.");
    if (course.price <= 0) return actionError("This course is free — enroll directly.");
    if (course.teacherId === user.id) return actionError("You cannot buy your own course.");

    const existing = await db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (existing) return actionError("You are already enrolled in this course.");

    // Reuse an open PENDING order if one exists.
    const openOrder = await db.payment.findFirst({
      where: {
        studentId: user.id,
        courseId,
        purpose: "COURSE_PURCHASE",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });
    const payment = openOrder
      ? openOrder
      : await createOrderPayment({
          studentId: user.id,
          amount: course.price,
          purpose: "COURSE_PURCHASE",
          courseId,
          description: `Course: ${course.title}`,
        });

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "checkout.initiated",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { courseId },
    });
    revalidatePath(`/courses/${course.slug}`);
    return { ok: true, redirectUrl: `/checkout/${payment.id}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Hand the customer to the gateway for a PENDING payment.
 * Returns the gateway redirect URL (or the DEV sandbox page).
 */
export async function startPayment(
  paymentId: string,
  method: string,
): Promise<CheckoutResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const payment = await db.payment.findFirst({
      where: { id: paymentId, studentId: user.id },
      include: { student: true },
    });
    if (!payment) return actionError("Payment not found.");
    if (payment.status !== "PENDING") {
      return actionError("This payment is no longer open.");
    }

    const provider = getPaymentProvider(method);
    const returnUrl = `${env.APP_URL}/checkout/${payment.id}/return?provider=${method}`;

    const init = await provider.createPayment({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      description: String((payment.metadata as { description?: string } | null)?.description ?? "LearnHub order"),
      customer: {
        name: payment.student.name,
        email: payment.student.email,
        phone: payment.student.phone,
      },
      returnUrl,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        method,
        provider: method.toUpperCase(),
        providerPaymentId: init.providerPaymentId ?? null,
      },
    });
    return { ok: true, redirectUrl: init.redirectUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * DEV sandbox completion — exercises the exact engine path real
 * webhooks use. Hard-blocked in production builds.
 */
export async function completeDevPayment(
  paymentId: string,
  outcome: "success" | "cancel",
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    if (!devPaymentsEnabled()) {
      return actionError("Sandbox payments are disabled in production.");
    }
    const payment = await db.payment.findFirst({
      where: { id: paymentId, studentId: user.id },
    });
    if (!payment) return actionError("Payment not found.");
    if (payment.provider !== "DEV") return actionError("This is not a sandbox payment.");

    if (outcome === "cancel") {
      await handlePaymentFailure(paymentId, { status: "FAILED" });
      return { ok: true };
    }

    const result = await handlePaymentSuccess(paymentId, {
      providerPaymentId: `DEVPAY-${payment.id.slice(-8)}`,
      trxId: `DEVTRX-${Date.now().toString(36).toUpperCase()}`,
      amount: payment.amount,
      status: "COMPLETED",
    });
    if (!result.ok) return actionError("The sandbox payment could not be completed.");
    revalidatePath("/checkout/success");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Apply a validated coupon to a PENDING order (amount + metadata). */
export async function applyCouponToPayment(
  paymentId: string,
  code: string,
): Promise<ActionResult & { discountAmount?: number; finalAmount?: number }> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const { validateCoupon } = await import("@/lib/coupons");
    const payment = await db.payment.findFirst({
      where: { id: paymentId, studentId: user.id },
    });
    if (!payment) return actionError("Payment not found.");
    if (payment.status !== "PENDING") return actionError("This payment can no longer be changed.");

    const result = await validateCoupon(code, payment.amount, payment.courseId, user.id);
    if (!result.ok) return actionError(result.error ?? "Invalid coupon.");

    await db.payment.update({
      where: { id: paymentId },
      data: {
        amount: result.finalAmount!,
        metadata: {
          ...((payment.metadata as object) ?? {}),
          couponId: result.couponId,
          couponCode: code.trim().toUpperCase(),
          discountAmount: result.discountAmount,
        },
      },
    });
    revalidatePath(`/checkout/${paymentId}`);
    return { ok: true, discountAmount: result.discountAmount, finalAmount: result.finalAmount };
  } catch (e) {
    return err(e);
  }
}

/** Cancel an open PENDING order. */
export async function cancelPayment(paymentId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const payment = await db.payment.findFirst({
      where: { id: paymentId, studentId: user.id },
    });
    if (!payment) return actionError("Payment not found.");
    if (payment.status !== "PENDING") return actionError("This payment can no longer be cancelled.");
    await handlePaymentFailure(paymentId);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Admin refund. */
export async function refundPaymentAction(
  paymentId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const result = await refundPayment(paymentId, { reason: reason ?? null }, { id: actor.id, email: actor.email });
    if (!result.ok) return actionError(result.error ?? "Refund failed.");
    revalidatePath("/admin/payments");
    revalidatePath("/dashboard/payments");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
