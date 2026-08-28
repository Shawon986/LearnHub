import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT, formatDateTime } from "@/lib/format";
import { ResolveDispute } from "./resolve-dispute";
import { DisputeThread } from "@/app/(dashboard)/dashboard/disputes/dispute-thread";

export const metadata: Metadata = { title: "Dispute Detail" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "danger" | "neutral"> = {
  OPEN: "brand",
  TEACHER_RESPONSE: "accent",
  UNDER_REVIEW: "gold",
  RESOLVED_REFUNDED: "success",
  RESOLVED_RELEASED: "success",
  CLOSED: "neutral",
};

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/disputes");

  const dispute = await db.dispute.findUnique({
    where: { id },
    include: {
      openedBy: { select: { name: true, email: true, avatarUrl: true } },
      payment: { include: { course: { select: { title: true, slug: true } } } },
      booking: { include: { teacher: { select: { name: true } }, student: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      resolvedBy: { select: { name: true } },
    },
  });
  if (!dispute) notFound();

  const isOpen = ["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"].includes(dispute.status);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All disputes
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Opener description */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-[16px] font-bold text-foreground">
                Dispute by {dispute.openedBy.name}
              </h1>
              <Badge variant={STATUS_VARIANT[dispute.status] ?? "neutral"}>{dispute.status}</Badge>
              <Badge variant="neutral">{dispute.reason.replace(/_/g, " ")}</Badge>
            </div>
            <p className="mt-3 rounded-xl bg-card-2 p-4 text-[13px] leading-relaxed text-muted-fg">
              {dispute.description}
            </p>
            {dispute.resolution && (
              <div className="mt-3 rounded-xl border border-success/30 bg-success-soft p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-success">
                  Resolution {dispute.resolvedBy && `· by ${dispute.resolvedBy.name}`}
                </p>
                <p className="mt-1 text-[13px] text-foreground">{dispute.resolution}</p>
              </div>
            )}
          </Card>

          {/* Thread */}
          <Card className="p-5">
            <DisputeThread
              disputeId={dispute.id}
              messages={dispute.messages.map((m) => ({
                id: m.id,
                senderName: m.sender.name,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
              }))}
              closed={!isOpen}
            />
          </Card>
        </div>

        {/* Evidence + resolution */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-foreground">
              <Scale className="h-4 w-4 text-brand-fg" /> Evidence
            </h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">Opened by</dt>
                <dd className="mt-0.5 font-semibold text-foreground">
                  {dispute.openedBy.name} · {dispute.openedBy.email}
                </dd>
              </div>
              {dispute.payment && (
                <div>
                  <dt className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">Payment</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    {formatBDT(dispute.payment.amount)} · {dispute.payment.status.toLowerCase()}
                    {dispute.payment.course && (
                      <Link
                        href={`/courses/${dispute.payment.course.slug}`}
                        className="ml-1 text-brand-fg hover:underline"
                      >
                        {dispute.payment.course.title}
                      </Link>
                    )}
                  </dd>
                </div>
              )}
              {dispute.booking && (
                <div>
                  <dt className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">Booking</dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    {dispute.booking.student.name} ↔ {dispute.booking.teacher.name}
                    <span className="block text-[11px] text-faint-fg">
                      {formatDateTime(dispute.booking.startsAt)} · {dispute.booking.status.toLowerCase()}
                    </span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">Opened</dt>
                <dd className="mt-0.5 font-semibold text-foreground">{formatDateTime(dispute.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          {isOpen && <ResolveDispute disputeId={dispute.id} hasPayment={Boolean(dispute.paymentId)} />}
        </div>
      </div>
    </div>
  );
}
