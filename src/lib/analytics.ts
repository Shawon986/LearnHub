import { db } from "@/lib/db";

// Analytics query helpers. All windows end "today" (server local).

function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  label: string; // "Aug 3"
  value: number;
}

function labelOf(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Daily completed-payment revenue for the last N days. */
export async function getRevenueSeries(days: number): Promise<DailyPoint[]> {
  const from = daysAgo(days - 1);
  const payments = await db.payment.findMany({
    where: { status: "COMPLETED", paidAt: { gte: from } },
    select: { amount: true, paidAt: true },
  });
  return bucketDaily(payments.map((p) => ({ at: p.paidAt ?? new Date(), value: p.amount })), days);
}

/** Daily enrollments for the last N days. */
export async function getEnrollmentSeries(days: number): Promise<DailyPoint[]> {
  const from = daysAgo(days - 1);
  const rows = await db.enrollment.findMany({
    where: { purchasedAt: { gte: from } },
    select: { purchasedAt: true },
  });
  return bucketDaily(rows.map((r) => ({ at: r.purchasedAt, value: 1 })), days);
}

function bucketDaily(rows: { at: Date; value: number }[], days: number): DailyPoint[] {
  const map = new Map<string, number>();
  const start = daysAgo(days - 1);
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60_000);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.at.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.value);
  }
  return [...map.entries()].map(([date, value]) => {
    const d = new Date(`${date}T00:00:00`);
    return { date, label: labelOf(d), value };
  });
}

/** Headline KPIs for a window. */
export async function getAdminKpis(days: number) {
  const from = daysAgo(days - 1);
  const [
    revenue,
    completedOrders,
    refunds,
    commissions,
    newUsers,
    newEnrollments,
    paymentsCount,
  ] = await Promise.all([
    db.payment.aggregate({ where: { status: "COMPLETED", paidAt: { gte: from } }, _sum: { amount: true } }),
    db.payment.count({ where: { status: "COMPLETED", paidAt: { gte: from } } }),
    db.refund.aggregate({ where: { status: "PROCESSED", processedAt: { gte: from } }, _sum: { amount: true } }),
    db.commission.aggregate({ where: { status: "CAPTURED", capturedAt: { gte: from } }, _sum: { amount: true } }),
    db.user.count({ where: { createdAt: { gte: from } } }),
    db.enrollment.count({ where: { purchasedAt: { gte: from } } }),
    db.payment.count({ where: { createdAt: { gte: from } } }),
  ]);

  const rev = revenue._sum.amount ?? 0;
  const refundTotal = refunds._sum.amount ?? 0;
  const aov = completedOrders > 0 ? Math.round(rev / completedOrders) : 0;
  const conversion = paymentsCount > 0 ? Math.round((completedOrders / paymentsCount) * 100) : 0;
  const refundRate = rev > 0 ? Math.round((refundTotal / rev) * 1000) / 10 : 0;

  return {
    revenue: rev,
    orders: completedOrders,
    enrollments: newEnrollments,
    newUsers,
    commission: commissions._sum.amount ?? 0,
    refunds: refundTotal,
    refundRate,
    aov,
    conversion,
  };
}

/** Top courses by revenue (enrollment pricePaid). */
export async function getTopCourses(days: number) {
  const from = daysAgo(days - 1);
  const rows = await db.enrollment.findMany({
    where: { purchasedAt: { gte: from } },
    include: { course: { select: { title: true } } },
  });
  const byCourse = new Map<string, { title: string; students: number; revenue: number }>();
  for (const r of rows) {
    const entry = byCourse.get(r.courseId) ?? { title: r.course.title, students: 0, revenue: 0 };
    entry.students += 1;
    entry.revenue += r.pricePaid;
    byCourse.set(r.courseId, entry);
  }
  return [...byCourse.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
}

/** Payment method split (completed). */
export async function getMethodSplit(days: number) {
  const from = daysAgo(days - 1);
  const rows = await db.payment.groupBy({
    by: ["method"],
    where: { status: "COMPLETED", paidAt: { gte: from } },
    _sum: { amount: true },
  });
  return rows
    .map((r) => ({ label: r.method, value: r._sum.amount ?? 0 }))
    .sort((a, b) => b.value - a.value);
}

/** Top teachers by credited earnings. */
export async function getTopTeachers(days: number) {
  const from = daysAgo(days - 1);
  const rows = await db.walletTransaction.findMany({
    where: { type: "CREDIT", createdAt: { gte: from } },
    include: { wallet: { include: { teacher: { select: { name: true } } } } },
  });
  const byTeacher = new Map<string, { name: string; amount: number }>();
  for (const r of rows) {
    const name = r.wallet?.teacher?.name ?? "Teacher";
    const entry = byTeacher.get(r.walletId) ?? { name, amount: 0 };
    entry.amount += r.amount;
    byTeacher.set(r.walletId, entry);
  }
  return [...byTeacher.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
}

/** Teacher dashboard: own earnings series + course performance. */
export async function getTeacherAnalytics(teacherId: string, days: number) {
  const from = daysAgo(days - 1);
  const [walletRows, courses, courseEnrollments] = await Promise.all([
    db.walletTransaction.findMany({
      where: { type: "CREDIT", createdAt: { gte: from }, wallet: { teacherId } },
      select: { amount: true, createdAt: true },
    }),
    db.course.findMany({
      where: { teacherId, status: { in: ["PUBLISHED", "UNPUBLISHED"] } },
      include: { category: { select: { name: true } } },
    }),
    db.enrollment.findMany({
      where: { purchasedAt: { gte: from }, course: { teacherId } },
      select: { courseId: true, pricePaid: true, status: true },
    }),
  ]);

  const earningsSeries = bucketDaily(walletRows.map((r) => ({ at: r.createdAt, value: r.amount })), days);

  const performance = courses.map((c) => {
    const rows = courseEnrollments.filter((e) => e.courseId === c.id);
    return {
      title: c.title,
      category: c.category.name,
      students: rows.length,
      completed: rows.filter((r) => r.status === "COMPLETED").length,
      revenue: rows.reduce((sum, r) => sum + r.pricePaid, 0),
    };
  });

  const totals = {
    earnings: walletRows.reduce((sum, r) => sum + r.amount, 0),
    students: new Set(courseEnrollments.map((e) => e.courseId)).size,
    enrollments: courseEnrollments.length,
  };

  return { earningsSeries, performance, totals };
}
