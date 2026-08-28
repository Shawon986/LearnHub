import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../vitest.setup";
import { validateCoupon } from "./coupons";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
});

async function createCoupon(data: Record<string, unknown>) {
  const db = await testDb();
  return db.coupon.create({
    data: {
      code: "TEST10",
      type: "PERCENTAGE",
      value: 10,
      minPurchase: 0,
      perUserLimit: 1,
      status: "ACTIVE",
      createdById: fixtures.admin.id,
      ...data,
    },
  });
}

describe("validateCoupon", () => {
  it("applies a percentage discount", async () => {
    await createCoupon({});
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(true);
    expect(result.discountAmount).toBe(100);
    expect(result.finalAmount).toBe(900);
  });

  it("rejects unknown codes", async () => {
    const result = await validateCoupon("NOPE", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("doesn't exist");
  });

  it("rejects expired coupons", async () => {
    await createCoupon({ expiresAt: new Date(Date.now() - 60_000) });
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("rejects under the minimum purchase", async () => {
    await createCoupon({ minPurchase: 2000 });
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("minimum purchase");
  });

  it("rejects course-mismatched coupons", async () => {
    const db = await testDb();
    const otherCourse = await db.course.create({
      data: {
        teacherId: fixtures.teacher.id,
        categoryId: fixtures.category.id,
        title: "Other Course",
        slug: "other-course",
        price: 500,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    });
    await createCoupon({ courseId: otherCourse.id });
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("different course");
  });

  it("rejects exhausted coupons", async () => {
    await createCoupon({ maxUses: 0 });
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
  });

  it("rejects when the user already redeemed it", async () => {
    const coupon = await createCoupon({});
    const db = await testDb();
    await db.couponRedemption.create({
      data: { couponId: coupon.id, userId: fixtures.student.id, discountAmount: 100 },
    });
    const result = await validateCoupon("TEST10", 1000, fixtures.course.id, fixtures.student.id);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already used");
  });
});
