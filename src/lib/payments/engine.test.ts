import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../../vitest.setup";
import { createOrderPayment, handlePaymentSuccess, refundPayment } from "./engine";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
  const db = await testDb();
  await db.platformSetting.create({ data: { key: "commission.ratePercent", value: 15 } });
  await db.platformSetting.create({ data: { key: "referral.rewardAmountBdt", value: 100 } });
  await db.platformSetting.create({ data: { key: "referral.minPurchaseBdt", value: 500 } });
});

describe("payment engine", () => {
  it("completes a payment: enrollment + commission + wallet credit", async () => {
    const db = await testDb();
    const order = await createOrderPayment({
      studentId: fixtures.student.id,
      amount: fixtures.course.price,
      purpose: "COURSE_PURCHASE",
      courseId: fixtures.course.id,
      description: "Test course",
    });

    const result = await handlePaymentSuccess(order.id, {
      providerPaymentId: "GW-1",
      trxId: "TRX-1",
      amount: fixtures.course.price,
      status: "COMPLETED",
    });
    expect(result.ok).toBe(true);

    const payment = await db.payment.findUniqueOrThrow({ where: { id: order.id } });
    expect(payment.status).toBe("COMPLETED");

    const enrollment = await db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: fixtures.student.id, courseId: fixtures.course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");

    const commission = await db.commission.findUnique({ where: { paymentId: order.id } });
    expect(commission?.amount).toBe(150);
    expect(commission?.ratePercent).toBe(15);

    const wallet = await db.teacherWallet.findUniqueOrThrow({ where: { teacherId: fixtures.teacher.id } });
    expect(wallet.availableBalance).toBe(850);
  });

  it("is idempotent — a replayed webhook credits nothing twice", async () => {
    const db = await testDb();
    const order = await createOrderPayment({
      studentId: fixtures.student.id,
      amount: fixtures.course.price,
      purpose: "COURSE_PURCHASE",
      courseId: fixtures.course.id,
      description: "Test",
    });
    const event = { providerPaymentId: "GW-1", trxId: "TRX-1", amount: fixtures.course.price, status: "COMPLETED" as const };

    const first = await handlePaymentSuccess(order.id, event);
    const replay = await handlePaymentSuccess(order.id, event);

    expect(first.ok).toBe(true);
    expect(replay).toEqual({ ok: true, duplicate: true });

    const wallet = await db.teacherWallet.findUniqueOrThrow({ where: { teacherId: fixtures.teacher.id } });
    expect(wallet.availableBalance).toBe(850); // not 1700

    const transactions = await db.transaction.count({ where: { paymentId: order.id } });
    expect(transactions).toBe(1);
  });

  it("rejects amount mismatches and credits nothing", async () => {
    const db = await testDb();
    const order = await createOrderPayment({
      studentId: fixtures.student.id,
      amount: fixtures.course.price,
      purpose: "COURSE_PURCHASE",
      courseId: fixtures.course.id,
      description: "Test",
    });

    const result = await handlePaymentSuccess(order.id, {
      providerPaymentId: "GW-1",
      trxId: "TRX-1",
      amount: 1,
      status: "COMPLETED",
    });
    expect(result).toEqual({ ok: false, mismatch: true });

    const payment = await db.payment.findUniqueOrThrow({ where: { id: order.id } });
    expect(payment.status).toBe("FAILED");
    const wallet = await db.teacherWallet.findUniqueOrThrow({ where: { teacherId: fixtures.teacher.id } });
    expect(wallet.availableBalance).toBe(0);
  });

  it("rewards the referrer on the referred student's first purchase", async () => {
    const db = await testDb();
    await db.referral.create({
      data: { referrerId: fixtures.otherStudent.id, refereeId: fixtures.student.id, status: "PENDING" },
    });
    const order = await createOrderPayment({
      studentId: fixtures.student.id,
      amount: fixtures.course.price,
      purpose: "COURSE_PURCHASE",
      courseId: fixtures.course.id,
      description: "Test",
    });

    await handlePaymentSuccess(order.id, {
      providerPaymentId: "GW-1",
      trxId: "TRX-1",
      amount: fixtures.course.price,
      status: "COMPLETED",
    });

    const referral = await db.referral.findFirstOrThrow({ where: { refereeId: fixtures.student.id } });
    expect(referral.status).toBe("REWARDED");
    expect(referral.rewardAmount).toBe(100);

    const referrerProfile = await db.studentProfile.findUniqueOrThrow({
      where: { userId: fixtures.otherStudent.id },
    });
    expect(referrerProfile.referralBalance).toBe(100);
  });

  it("refunds atomically: payment, commission, wallet and enrollment all reverse", async () => {
    const db = await testDb();
    const order = await createOrderPayment({
      studentId: fixtures.student.id,
      amount: fixtures.course.price,
      purpose: "COURSE_PURCHASE",
      courseId: fixtures.course.id,
      description: "Test",
    });
    await handlePaymentSuccess(order.id, {
      providerPaymentId: "GW-1",
      trxId: "TRX-1",
      amount: fixtures.course.price,
      status: "COMPLETED",
    });

    const result = await refundPayment(order.id, { reason: "Test refund" }, { id: fixtures.admin.id, email: fixtures.admin.email });
    expect(result.ok).toBe(true);

    const payment = await db.payment.findUniqueOrThrow({ where: { id: order.id } });
    expect(payment.status).toBe("REFUNDED");

    const commission = await db.commission.findUnique({ where: { paymentId: order.id } });
    expect(commission?.status).toBe("REVERSED");

    const wallet = await db.teacherWallet.findUniqueOrThrow({ where: { teacherId: fixtures.teacher.id } });
    expect(wallet.availableBalance).toBe(0);

    const enrollment = await db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: fixtures.student.id, courseId: fixtures.course.id } },
    });
    expect(enrollment?.status).toBe("REFUNDED");
  });
});
