"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9-]+$/, "Only letters, numbers and dashes."),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().int().min(1).max(90),
  minPurchase: z.coerce.number().int().min(0).default(0),
  maxUses: z.coerce.number().int().min(1).max(100000).optional().nullable(),
  perUserLimit: z.coerce.number().int().min(1).max(10).default(1),
  expiresAt: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

/**
 * Admin: create/edit coupons for any course (or global).
 * Teacher: create/edit coupons for their own courses only.
 */
export async function upsertCoupon(input: {
  id?: string;
  code: string;
  type: string;
  value: number;
  minPurchase?: number;
  maxUses?: number | null;
  perUserLimit?: number;
  expiresAt?: string | null;
  courseId?: string | null;
  status?: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = couponSchema.parse(input);
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(actor.role);

    // Teachers can only attach coupons to their own courses.
    if (!isAdmin && data.courseId) {
      const owned = await db.course.findFirst({ where: { id: data.courseId, teacherId: actor.id } });
      if (!owned) return actionError("You can only attach coupons to your own courses.");
    }
    if (!isAdmin && !data.courseId) {
      return actionError("Teacher coupons must be attached to one of your courses.");
    }

    const code = data.code.toUpperCase();
    const clash = await db.coupon.findFirst({ where: { code, id: { not: data.id } } });
    if (clash) return actionError("This coupon code is already in use.");

    if (data.id) {
      // BOLA guard: teachers may only edit their OWN coupons; admins any.
      if (!isAdmin) {
        const existing = await db.coupon.findFirst({ where: { id: data.id, teacherId: actor.id } });
        if (!existing) return actionError("Coupon not found.");
      }
      await db.coupon.update({
        where: { id: data.id },
        data: {
          code,
          type: data.type,
          value: data.value,
          minPurchase: data.minPurchase,
          maxUses: data.maxUses ?? null,
          perUserLimit: data.perUserLimit,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          courseId: isAdmin ? data.courseId ?? null : data.courseId,
          status: data.status,
        },
      });
    } else {
      await db.coupon.create({
        data: {
          code,
          type: data.type,
          value: data.value,
          minPurchase: data.minPurchase,
          maxUses: data.maxUses ?? null,
          perUserLimit: data.perUserLimit,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          courseId: isAdmin ? data.courseId ?? null : data.courseId,
          status: data.status,
          teacherId: isAdmin ? null : actor.id,
          createdById: actor.id,
        },
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: data.id ? "coupon.update" : "coupon.create",
      entityType: "Coupon",
      metadata: { code },
    });
    revalidatePath("/admin/coupons");
    revalidatePath("/teacher/coupons");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Apply a coupon at checkout init (validation only — redemption happens at completion). */
export async function validateCheckoutCoupon(
  code: string,
  amount: number,
  courseId: string | null,
): Promise<{ ok: boolean; error?: string; couponId?: string; discountAmount?: number; finalAmount?: number }> {
  const { validateCoupon } = await import("@/lib/coupons");
  const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
  const result = await validateCoupon(code, amount, courseId, user.id);
  return result;
}
