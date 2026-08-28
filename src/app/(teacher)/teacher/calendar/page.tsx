import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TeacherCalendar } from "./teacher-calendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/calendar");

  // Load a 3-month window around today for smooth navigation.
  const from = new Date();
  from.setDate(1);
  from.setMonth(from.getMonth() - 1);
  const to = new Date();
  to.setMonth(to.getMonth() + 2, 1);

  const [bookings, liveClasses] = await Promise.all([
    db.booking.findMany({
      where: {
        teacherId: user.id,
        startsAt: { gte: from, lt: to },
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: { student: { select: { name: true } } },
    }),
    db.liveClass.findMany({
      where: { teacherId: user.id, startsAt: { gte: from, lt: to }, status: { in: ["SCHEDULED", "LIVE"] } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Calendar</h1>
        <p className="mt-1 text-sm text-muted-fg">Your bookings and live classes at a glance.</p>
      </div>

      <TeacherCalendar
        events={[
          ...bookings.map((b) => ({
            date: b.startsAt.toISOString(),
            kind: "booking" as const,
            label: `1-on-1 · ${b.student.name}`,
            time: b.startsAt.toISOString(),
          })),
          ...liveClasses.map((l) => ({
            date: l.startsAt.toISOString(),
            kind: "live" as const,
            label: l.title,
            time: l.startsAt.toISOString(),
          })),
        ]}
      />
    </div>
  );
}
