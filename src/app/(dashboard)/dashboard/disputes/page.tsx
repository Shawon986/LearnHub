import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";
import { OpenDisputeModal } from "./open-dispute-modal";
import { DisputeThread } from "./dispute-thread";

export const metadata: Metadata = { title: "Disputes" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "danger" | "neutral"> = {
  OPEN: "brand",
  TEACHER_RESPONSE: "accent",
  UNDER_REVIEW: "gold",
  RESOLVED_REFUNDED: "success",
  RESOLVED_RELEASED: "success",
  CLOSED: "neutral",
};

export default async function DisputesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/disputes");

  const [disputes, openPayments, openBookings] = await Promise.all([
    db.dispute.findMany({
      where: { openedById: user.id },
      include: {
        payment: { include: { course: { select: { title: true } } } },
        booking: { include: { teacher: { select: { name: true } } } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    // COMPLETED payments without an active dispute (disputable).
    db.payment.findMany({
      where: {
        studentId: user.id,
        status: "COMPLETED",
        dispute: null,
      },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.booking.findMany({
      where: { studentId: user.id, status: { in: ["ACCEPTED", "COMPLETED"] }, dispute: null },
      include: { teacher: { select: { name: true } } },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Disputes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Something wrong with a payment or booking? Our team reviews every case.
          </p>
        </div>
        <OpenDisputeModal
          payments={openPayments.map((p) => ({
            id: p.id,
            amount: p.amount,
            label: p.course?.title ?? "Payment",
          }))}
          bookings={openBookings.map((b) => ({
            id: b.id,
            teacherName: b.teacher.name,
          }))}
        />
      </div>

      {disputes.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="No disputes"
          description="If a payment or session goes wrong, open a dispute and we'll investigate."
        />
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[15px] font-bold text-foreground">
                  {d.payment?.course?.title ?? `Session with ${d.booking?.teacher.name ?? "teacher"}`}
                </h2>
                <Badge variant={STATUS_VARIANT[d.status] ?? "neutral"}>{d.status}</Badge>
                {d.payment && (
                  <Badge variant="neutral">{formatBDT(d.payment.amount)}</Badge>
                )}
              </div>
              <p className="mt-1 text-[12px] text-faint-fg">
                {d.reason.replace("_", " ")} · opened {formatDateTime(d.createdAt)}
              </p>
              <p className="mt-3 rounded-xl bg-card-2 p-3 text-[13px] leading-relaxed text-muted-fg">
                {d.description}
              </p>
              {d.resolution && (
                <div className="mt-3 rounded-xl border border-success/30 bg-success-soft p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-success">Resolution</p>
                  <p className="mt-1 text-[13px] text-foreground">{d.resolution}</p>
                </div>
              )}
              <div className="mt-4 border-t border-line pt-3">
                <DisputeThread
                  disputeId={d.id}
                  messages={d.messages.map((m) => ({
                    id: m.id,
                    senderName: m.sender.name,
                    content: m.content,
                    createdAt: m.createdAt.toISOString(),
                  }))}
                  closed={!["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"].includes(d.status)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
