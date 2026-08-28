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

export default async function AdminCouponsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/coupons");

  const [coupons, courses] = await Promise.all([
    db.coupon.findMany({
      include: { course: { select: { title: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Coupons</h1>
          <p className="mt-1 text-sm text-muted-fg">Discount codes applied at checkout and recorded on completion.</p>
        </div>
        <CouponFormModal courses={courses} />
      </div>

      {coupons.length === 0 ? (
        <EmptyState icon={<Tags />} title="No coupons yet" description="Create your first discount code." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Course</th>
                <th className="hidden px-4 py-3 md:table-cell">Usage</th>
                <th className="hidden px-4 py-3 lg:table-cell">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-[13px] font-bold text-foreground">{c.code}</p>
                    <p className="text-[11px] text-faint-fg">by {c.createdBy.name}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-foreground">
                    {c.type === "PERCENTAGE" ? `${c.value}%` : formatBDT(c.value)}
                    {c.minPurchase > 0 && (
                      <span className="block text-[11px] font-semibold text-faint-fg">
                        min {formatBDT(c.minPurchase)}
                      </span>
                    )}
                  </td>
                  <td className="max-w-40 px-4 py-3.5">
                    <span className="block truncate text-[12px] text-muted-fg">
                      {c.course?.title ?? "Global"}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {c.usedCount}/{c.maxUses ?? "∞"} · {c.perUserLimit}/user
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg lg:table-cell">
                    {c.expiresAt ? formatDate(c.expiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <CouponFormModal
                      courses={courses}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
