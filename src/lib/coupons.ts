import { db } from "@/lib/db";

// Coupon validation + application. Validation happens at checkout init;
// redemption is recorded (and usedCount incremented) only when the
// payment completes — the engine applies applyCouponAtCompletion.

export interface CouponValidation {
  ok: boolean;
  error?: string;
  couponId?: string;
  discountAmount?: number;
  finalAmount?: number;
  type?: string;
  value?: number;
}

export async function validateCoupon(
  code: string,
  amount: number,
  courseId: string | null,
  userId: string,
): Promise<CouponValidation> {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return { ok: false, error: "This coupon doesn't exist." };
  if (coupon.status !== "ACTIVE") return { ok: false, error: "This coupon is no longer active." };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { ok: false, error: "This coupon has expired." };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (coupon.courseId && coupon.courseId !== courseId) {
    return { ok: false, error: "This coupon is for a different course." };
  }
  if (amount < coupon.minPurchase) {
    return { ok: false, error: `This coupon requires a minimum purchase of ৳${coupon.minPurchase.toLocaleString()}.` };
  }

  const myRedemptions = await db.couponRedemption.count({
    where: { couponId: coupon.id, userId },
  });
  if (myRedemptions >= coupon.perUserLimit) {
    return { ok: false, error: "You've already used this coupon." };
  }

  const discountAmount =
    coupon.type === "PERCENTAGE"
      ? Math.round((amount * coupon.value) / 100)
      : Math.min(coupon.value, amount);

  return {
    ok: true,
    couponId: coupon.id,
    discountAmount,
    finalAmount: amount - discountAmount,
    type: coupon.type,
    value: coupon.value,
  };
}

/** Record the redemption once the payment completes (idempotent). */
export async function applyCouponAtCompletion(
  paymentId: string,
  couponId: string,
  userId: string,
  discountAmount: number,
): Promise<void> {
  const existing = await db.couponRedemption.findFirst({
    where: { couponId, userId },
  });
  if (existing) return;

  const coupon = await db.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return;

  const willDeplete = coupon.maxUses !== null && coupon.usedCount + 1 >= coupon.maxUses;
  await db.couponRedemption.create({
    data: { couponId, userId, paymentId, discountAmount },
  });
  await db.coupon.update({
    where: { id: couponId },
    data: {
      usedCount: { increment: 1 },
      ...(willDeplete ? { status: "DEPLETED" } : {}),
    },
  });
}
