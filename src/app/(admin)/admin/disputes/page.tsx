import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Disputes" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "danger" | "neutral"> = {
  OPEN: "brand",
  TEACHER_RESPONSE: "accent",
  UNDER_REVIEW: "gold",
  RESOLVED_REFUNDED: "success",
  RESOLVED_RELEASED: "success",
  CLOSED: "neutral",
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/disputes");
  const { status } = await searchParams;

  const disputes = await db.dispute.findMany({
    where: status && status !== "ALL" ? { status } : {},
    include: {
      openedBy: { select: { name: true, avatarUrl: true } },
      payment: { select: { amount: true, course: { select: { title: true } } } },
      booking: { select: { teacher: { select: { name: true } } } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  const openCount = disputes.filter((d) => ["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"].includes(d.status)).length;
  const filters = ["ALL", "OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW", "RESOLVED_REFUNDED", "RESOLVED_RELEASED", "CLOSED"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Disputes</h1>
        <p className="mt-1 text-sm text-muted-fg">{openCount} dispute{openCount === 1 ? "" : "s"} need attention.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Dispute status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/disputes" : `/admin/disputes?status=${f}`}
            className={
              (status ?? "ALL") === f
                ? "shrink-0 rounded-full bg-brand px-4 py-1.5 text-[12px] font-bold text-white"
                : "shrink-0 rounded-full border border-line bg-card px-4 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
            }
          >
            {f.replace(/_/g, " ").toLowerCase()}
          </Link>
        ))}
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={<Scale />} title="No disputes" description="Disputes appear when students open them." />
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Link key={d.id} href={`/admin/disputes/${d.id}`} className="block">
              <Card hoverable className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar name={d.openedBy.name} src={d.openedBy.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-foreground">{d.openedBy.name}</p>
                      <Badge variant={STATUS_VARIANT[d.status] ?? "neutral"}>{d.status}</Badge>
                      {d.payment && <Badge variant="neutral">{formatBDT(d.payment.amount)}</Badge>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-fg">
                      {d.reason.replace(/_/g, " ")} ·{" "}
                      {d.payment?.course?.title ?? `Session with ${d.booking?.teacher.name ?? "teacher"}`} ·{" "}
                      {timeAgo(d.updatedAt)} · {d._count.messages} message{d._count.messages === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
