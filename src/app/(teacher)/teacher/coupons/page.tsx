import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tags } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDate } from "@/lib/format";
import { CouponFormModal } from "@/components/shared/coupon-form-modal";

export const metadata: Metadata = { title: "Coupons" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  EXPIRED: "neutral",
  DEPLETED: "danger",
};

export default async function TeacherCouponsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/coupons");

  const [coupons, myCourses] = await Promise.all([
    db.coupon.findMany({
      where: { teacherId: user.id },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.course.findMany({
      where: { teacherId: user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Coupons</h1>
          <p className="mt-1 text-sm text-muted-fg">Offer discounts on your courses to boost sales.</p>
        </div>
        <CouponFormModal courses={myCourses} teacherMode />
      </div>

      {coupons.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="No coupons yet"
          description="Create a discount code attached to one of your courses."
        />
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Tags className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[14px] font-bold text-foreground">{c.code}</p>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <p className="text-[12px] text-muted-fg">
                  {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatBDT(c.value)} off`} ·{" "}
                  {c.course?.title ?? "Global"} · {c.usedCount}/{c.maxUses ?? "∞"} used
                  {c.expiresAt && ` · expires ${formatDate(c.expiresAt)}`}
                </p>
              </div>
              <CouponFormModal
                courses={myCourses}
                teacherMode
                initial={{
                  id: c.id,
                  code: c.code,
                  type: c.type,
                  value: c.value,
                  minPurchase: c.minPurchase,
                  maxUses: c.maxUses,
                  perUserLimit: c.perUserLimit,
                  expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
                  courseId: c.courseId,
                  status: c.status,
                }}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
