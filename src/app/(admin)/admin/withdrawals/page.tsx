import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { WithdrawalActions } from "./withdrawal-actions";
import { formatBDT, formatDateTime } from "@/lib/format";
import { WITHDRAWAL_METHOD_LABELS } from "@/lib/constants";

export const metadata: Metadata = { title: "Withdrawals" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  APPROVED: "accent",
  PAID: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/withdrawals");
  const { status } = await searchParams;

  const [withdrawals, pendingTotal] = await Promise.all([
    db.withdrawal.findMany({
      where: status && status !== "ALL" ? { status } : {},
      include: { teacher: { select: { name: true, avatarUrl: true, email: true } } },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
    db.withdrawal.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
  ]);

  // New requests must be unmissable: PENDING always sorts to the top
  // (statuses sort alphabetically in SQL, which buried PENDING 4th).
  const statusPriority: Record<string, number> = { PENDING: 0, APPROVED: 1, PAID: 2, REJECTED: 3, CANCELLED: 4 };
  withdrawals.sort(
    (a, b) =>
      (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9) ||
      b.requestedAt.getTime() - a.requestedAt.getTime(),
  );

  const filters = ["ALL", "PENDING", "APPROVED", "PAID", "REJECTED"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Withdrawals</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {formatBDT(pendingTotal._sum.amount ?? 0)} pending payout.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Withdrawal status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/withdrawals" : `/admin/withdrawals?status=${f}`}
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

      {withdrawals.length === 0 ? (
        <EmptyState icon={<Wallet />} title="No withdrawals" description="Teacher payout requests appear here." />
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => {
            const details = safeJsonParse<{ accountNumber?: string; accountHolder?: string }>(w.accountDetails, {});
            return (
              <Card key={w.id} className="flex flex-wrap items-center gap-4 p-5">
                <Avatar name={w.teacher.name} src={w.teacher.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13px] font-bold text-foreground">{w.teacher.name}</p>
                    <Badge variant={STATUS_VARIANT[w.status] ?? "neutral"}>{w.status}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-fg">
                    {WITHDRAWAL_METHOD_LABELS[w.method] ?? w.method} · {details.accountNumber ?? "—"} ·{" "}
                    {formatDateTime(w.requestedAt)}
                  </p>
                  {w.rejectionReason && (
                    <p className="mt-1 text-[11px] font-semibold text-danger">{w.rejectionReason}</p>
                  )}
                </div>
                <p className="font-display text-[15px] font-extrabold text-foreground">{formatBDT(w.amount)}</p>
                <WithdrawalActions id={w.id} status={w.status} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
