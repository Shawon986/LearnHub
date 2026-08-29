import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  ACCEPTED: "accent",
  COMPLETED: "success",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/bookings");
  const { status } = await searchParams;

  const bookings = await db.booking.findMany({
    where: status && status !== "ALL" ? { status } : {},
    include: {
      student: { select: { name: true, email: true, avatarUrl: true } },
      teacher: { select: { name: true, avatarUrl: true } },
      payment: { select: { status: true, amount: true } },
    },
    orderBy: { startsAt: "desc" },
    take: 100,
  });

  const filters = ["ALL", "PENDING", "ACCEPTED", "COMPLETED", "CANCELLED", "NO_SHOW"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Bookings</h1>
        <p className="mt-1 text-sm text-muted-fg">Every 1-on-1 session across the platform.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Booking status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/bookings" : `/admin/bookings?status=${f}`}
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

      {bookings.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No bookings" description="Bookings appear as students request sessions." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Student</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="hidden px-4 py-3 md:table-cell">When</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={b.student.name} src={b.student.avatarUrl} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-foreground">{b.student.name}</p>
                        <p className="truncate text-[11px] text-faint-fg">{b.student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={b.teacher.name} src={b.teacher.avatarUrl} size="xs" />
                      <span className="text-[12px] font-semibold text-muted-fg">{b.teacher.name}</span>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {formatDateTime(b.startsAt)}
                  </td>
                  <td className="px-4 py-3.5 font-display text-[13px] font-extrabold text-foreground">
                    {formatBDT(b.price)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={b.payment ? (b.payment.status === "COMPLETED" ? "success" : "gold") : "neutral"} size="sm">
                      {b.payment ? b.payment.status.toLowerCase() : "unpaid"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[b.status] ?? "neutral"}>{b.status}</Badge>
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
