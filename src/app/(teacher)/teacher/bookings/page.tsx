import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/action-button";
import { respondBooking } from "@/lib/actions/teacher";
import { formatBDT, formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  ACCEPTED: "accent",
  COMPLETED: "success",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/bookings");

  const bookings = await db.booking.findMany({
    where: { teacherId: user.id },
    include: { student: { select: { name: true, email: true, avatarUrl: true } } },
    orderBy: { startsAt: "desc" },
  });

  const pending = bookings.filter((b) => b.status === "PENDING");
  const upcoming = bookings.filter((b) => b.status === "ACCEPTED");
  const past = bookings.filter((b) => !["PENDING", "ACCEPTED"].includes(b.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Bookings</h1>
        <p className="mt-1 text-sm text-muted-fg">1-on-1 session requests from students.</p>
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="pending-b">
          <h2 id="pending-b" className="mb-4 font-display text-base font-bold text-foreground">
            Needs your response ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center gap-4 border-brand/30 p-5">
                <Avatar name={b.student.name} src={b.student.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-bold text-foreground">{b.student.name}</h3>
                  <p className="text-[12px] text-muted-fg">
                    {formatDate(b.startsAt)} · {formatTime(b.startsAt)}–{formatTime(b.endsAt)} ·{" "}
                    {b.durationMinutes} min · <strong>{formatBDT(b.price)}</strong>
                  </p>
                  {b.topic && <p className="mt-1 line-clamp-1 text-[12px] text-faint-fg">“{b.topic}”</p>}
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    size="sm"
                    action={respondBooking.bind(null, { bookingId: b.id, action: "ACCEPT" })}
                    successMessage="Booking accepted — the student has been notified."
                  >
                    Accept
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    size="sm"
                    action={respondBooking.bind(null, { bookingId: b.id, action: "DECLINE" })}
                    confirm="Decline this booking?"
                  >
                    Decline
                  </ActionButton>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="upcoming-b">
        <h2 id="upcoming-b" className="mb-4 font-display text-base font-bold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState compact icon={<CalendarDays />} title="No confirmed sessions" description="Accepted bookings appear here." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <Card key={b.id} className="flex items-center gap-4 p-5">
                <Avatar name={b.student.name} src={b.student.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-foreground">{b.student.name}</h3>
                    <Badge variant="accent">ACCEPTED</Badge>
                  </div>
                  <p className="text-[12px] text-muted-fg">
                    {formatDate(b.startsAt)} · {formatTime(b.startsAt)} · {formatBDT(b.price)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="past-b">
        <h2 id="past-b" className="mb-4 font-display text-base font-bold text-foreground">
          History
        </h2>
        {past.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
            No past bookings yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((b) => (
              <Card key={b.id} className="flex items-center gap-4 p-5 opacity-80">
                <Avatar name={b.student.name} src={b.student.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-foreground">{b.student.name}</h3>
                    <Badge variant={STATUS_VARIANT[b.status] ?? "neutral"}>{b.status}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-fg">
                    {formatDate(b.startsAt)} · {formatBDT(b.price)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
