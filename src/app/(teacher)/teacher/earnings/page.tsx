import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Clock3, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getWithdrawalMinimum, getWithdrawalFeeRate } from "@/lib/earnings";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";
import { WithdrawalForm } from "./withdrawal-form";

export const metadata: Metadata = { title: "Earnings" };

const W_STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  APPROVED: "accent",
  PAID: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/earnings");

  const [wallet, walletTxs, withdrawals, minimum, feePercent] = await Promise.all([
    db.teacherWallet.findUnique({ where: { teacherId: user.id } }),
    db.walletTransaction.findMany({
      where: { wallet: { teacherId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.withdrawal.findMany({
      where: { teacherId: user.id },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),
    getWithdrawalMinimum(),
    getWithdrawalFeeRate(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Earnings</h1>
        <p className="mt-1 text-sm text-muted-fg">
          15% platform commission applies (configurable). You keep 85% of every sale.
        </p>
      </div>

      {/* Wallet stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Available balance"
          value={formatBDT(wallet?.availableBalance ?? 0)}
          icon={<Wallet />}
          tone="success"
        />
        <StatCard
          label="Pending (in review)"
          value={formatBDT(wallet?.pendingBalance ?? 0)}
          icon={<Clock3 />}
          tone="gold"
        />
        <StatCard
          label="Total earnings"
          value={formatBDT(wallet?.totalEarnings ?? 0)}
          icon={<CircleDollarSign />}
          tone="accent"
        />
        <StatCard
          label="Total withdrawn"
          value={formatBDT(wallet?.totalWithdrawn ?? 0)}
          icon={<ArrowUpRight />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Withdrawal form */}
        <Card>
          <CardContent className="p-6">
            <WithdrawalForm
              availableBalance={wallet?.availableBalance ?? 0}
              minimum={minimum}
              feePercent={feePercent}
            />
          </CardContent>
        </Card>

        {/* Withdrawal history */}
        <section aria-labelledby="wd-history">
          <h2 id="wd-history" className="mb-4 font-display text-base font-bold text-foreground">
            Withdrawal history
          </h2>
          {withdrawals.length === 0 ? (
            <EmptyState
              compact
              icon={<ArrowUpRight />}
              title="No withdrawals yet"
              description="Request a withdrawal once your available balance reaches the minimum."
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {withdrawals.map((w) => (
                  <li key={w.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card-2 text-muted-fg">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground">
                        {formatBDT(w.amount)} · {w.method}
                      </p>
                      <p className="text-[11px] text-faint-fg">{formatDateTime(w.requestedAt)}</p>
                    </div>
                    <Badge variant={W_STATUS_VARIANT[w.status] ?? "neutral"}>{w.status}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>

      {/* Wallet transactions */}
      <section aria-labelledby="wt-history">
        <h2 id="wt-history" className="mb-4 font-display text-base font-bold text-foreground">
          Wallet transactions
        </h2>
        {walletTxs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
            No transactions yet — they appear when students buy your courses.
          </p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {walletTxs.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card-2 text-muted-fg">
                    {t.type.includes("DEBIT") ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground">{t.description ?? t.type}</p>
                    <p className="text-[11px] text-faint-fg">
                      {formatDateTime(t.createdAt)} · balance {formatBDT(t.balanceAfter ?? 0)}
                    </p>
                  </div>
                  <Badge variant="neutral">{t.type.replace("_", " ")}</Badge>
                  <span
                    className={`w-24 text-right font-display text-[14px] font-extrabold ${
                      t.type.includes("DEBIT") ? "text-danger" : "text-success"
                    }`}
                  >
                    {t.type.includes("DEBIT") ? "−" : "+"}
                    {formatBDT(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
