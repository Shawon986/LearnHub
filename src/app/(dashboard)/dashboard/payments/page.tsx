import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

const PAYMENT_STATUS_VARIANT = {
  COMPLETED: "success",
  PENDING: "gold",
  FAILED: "danger",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "neutral",
} as const;

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/payments");

  const [payments, transactions] = await Promise.all([
    db.payment.findMany({
      where: { studentId: user.id },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Payments</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Every payment is verified server-side — nothing here comes from the browser.
        </p>
      </div>

      <section aria-labelledby="payments-heading">
        <h2 id="payments-heading" className="mb-4 font-display text-base font-bold text-foreground">
          Payment history
        </h2>
        {payments.length === 0 ? (
          <EmptyState
            compact
            icon={<Receipt />}
            title="No payments yet"
            description="Your course purchases and bookings will appear here with full receipts."
          />
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card-2 text-muted-fg">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">
                      {p.course?.title ?? `Booking payment`}
                    </p>
                    <p className="text-[11px] text-faint-fg">
                      {formatDateTime(p.createdAt)} · {p.method} · {p.providerTrxId ?? p.providerPaymentId ?? "—"}
                    </p>
                  </div>
                  <Badge variant={PAYMENT_STATUS_VARIANT[p.status as keyof typeof PAYMENT_STATUS_VARIANT] ?? "neutral"}>
                    {p.status}
                  </Badge>
                  <span className="w-24 text-right font-display text-[14px] font-extrabold text-foreground">
                    {formatBDT(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-labelledby="tx-heading">
        <h2 id="tx-heading" className="mb-4 font-display text-base font-bold text-foreground">
          Account transactions
        </h2>
        {transactions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
            No transactions yet.
          </p>
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card-2 text-muted-fg">
                    <ArrowDownLeft className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">
                      {t.description ?? t.type}
                    </p>
                    <p className="text-[11px] text-faint-fg">
                      {formatDateTime(t.createdAt)} · {t.type} · {t.reference ?? "—"}
                    </p>
                  </div>
                  <span className="font-display text-[14px] font-extrabold text-foreground">
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
