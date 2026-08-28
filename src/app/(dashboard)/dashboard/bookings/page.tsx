import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/action-button";
import { cancelBooking } from "@/lib/actions/student";
import { formatBDT, formatDate, formatTime } from "@/lib/format";
import type { BookingStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "1-on-1 Bookings" };

const STATUS_VARIANT: Record<BookingStatus, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PENDING: "brand",
  ACCEPTED: "accent",
  COMPLETED: "success",
  DECLINED: "neutral",
  CANCELLED: "neutral",
  NO_SHOW: "danger",
};

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/bookings");

  const bookings = await db.booking.findMany({
    where: { studentId: user.id },
    include: { teacher: true },
    orderBy: { startsAt: "desc" },
  });

  // Open payment orders for accepted bookings (payment confirms the seat).
  const openPayments = await db.payment.findMany({
    where: {
      studentId: user.id,
      purpose: "BOOKING",
      status: "PENDING",
      bookingId: { in: bookings.map((b) => b.id) },
    },
    select: { id: true, bookingId: true },
  });
  const paymentByBooking = new Map(openPayments.map((p) => [p.bookingId, p.id]));

  const upcoming = bookings.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status));
  const past = bookings.filter((b) => !["PENDING", "ACCEPTED"].includes(b.status));
  const reviewable = past.filter((b) => b.status === "COMPLETED" && !b.reviewed);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">1-on-1 Bookings</h1>
        <p className="mt-1 text-sm text-muted-fg">Your private tutoring sessions with teachers.</p>
      </div>

      <section aria-labelledby="upcoming-b">
        <h2 id="upcoming-b" className="mb-4 font-display text-base font-bold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarDays />}
            title="No upcoming sessions"
            description="Book a session from a teacher's profile (Phase 5) — your confirmed sessions appear here."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-center gap-4 p-5">
                <Avatar name={b.teacher.name} src={b.teacher.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-foreground">{b.teacher.name}</h3>
                    <Badge variant={STATUS_VARIANT[b.status as BookingStatus]}>{b.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-fg">
                    {formatDate(b.startsAt)} · {formatTime(b.startsAt)}–{formatTime(b.endsAt)} ·{" "}
                    {b.durationMinutes} min
                  </p>
                  {b.topic && <p className="mt-1 line-clamp-1 text-[12px] text-faint-fg">{b.topic}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-[15px] font-extrabold text-foreground">
                    {formatBDT(b.price)}
                  </span>
                  {b.status === "ACCEPTED" && paymentByBooking.get(b.id) && (
                    <Link
                      href={`/checkout/${paymentByBooking.get(b.id)}`}
                      className="inline-flex h-9 items-center rounded-xl bg-brand px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
                    >
                      Complete payment →
                    </Link>
                  )}
                  {b.status === "ACCEPTED" && !paymentByBooking.get(b.id) && b.price === 0 && (
                    <Badge variant="success">Confirmed</Badge>
                  )}
                  <ActionButton
                    variant="outline"
                    size="sm"
                    action={cancelBooking.bind(null, b.id)}
                    confirm="Cancel this booking?"
                  >
                    Cancel
                  </ActionButton>
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
            No past sessions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((b) => (
              <Card key={b.id} className="flex items-center gap-4 p-5 opacity-80">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-2 text-muted-fg">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-foreground">{b.teacher.name}</h3>
                    <Badge variant={STATUS_VARIANT[b.status as BookingStatus]}>{b.status}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-fg">
                    {formatDate(b.startsAt)} · {formatTime(b.startsAt)} · {formatBDT(b.price)}
                  </p>
                </div>
                {reviewable.some((r) => r.id === b.id) && (
                  <Link
                    href={`/teachers/${b.teacherId}`}
                    className="shrink-0 rounded-xl bg-gold-soft px-3 py-2 text-[12px] font-bold text-gold transition-colors hover:bg-gold-soft/70"
                  >
                    Leave a review ⭐
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
