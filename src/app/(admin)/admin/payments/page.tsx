import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleDollarSign } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { RefundButton } from "./refund-button";
import { formatBDT, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  COMPLETED: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/payments");
  const { status } = await searchParams;

  const [payments, revenue] = await Promise.all([
    db.payment.findMany({
      where: status && status !== "ALL" ? { status } : {},
      include: {
        student: { select: { name: true, email: true, avatarUrl: true } },
        course: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
  ]);

  const filters = ["ALL", "COMPLETED", "PENDING", "FAILED", "REFUNDED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Lifetime revenue:{" "}
            <strong className="text-foreground">{formatBDT(revenue._sum.amount ?? 0)}</strong>
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Payment status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/payments" : `/admin/payments?status=${f}`}
            className={
              (status ?? "ALL") === f
                ? "shrink-0 rounded-full bg-brand px-4 py-1.5 text-[12px] font-bold text-white"
                : "shrink-0 rounded-full border border-line bg-card px-4 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
            }
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState icon={<CircleDollarSign />} title="No payments here" description="Payments appear as orders are created." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Student</th>
                <th className="px-4 py-3">For</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 lg:table-cell">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.student.name} src={p.student.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-foreground">{p.student.name}</p>
                        <p className="truncate text-[11px] text-faint-fg">{p.student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-52 px-4 py-3.5">
                    <p className="truncate text-[12px] font-semibold text-muted-fg">
                      {p.course?.title ?? p.purpose.replace("_", " ").toLowerCase()}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-display text-[13px] font-extrabold text-foreground">
                    {formatBDT(p.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-muted-fg">{p.method}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[p.status] ?? "neutral"}>{p.status}</Badge>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg lg:table-cell">
                    {formatDateTime(p.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {p.status === "COMPLETED" && <RefundButton paymentId={p.id} />}
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
