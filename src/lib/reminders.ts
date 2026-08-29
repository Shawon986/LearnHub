import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * Opportunistic booking reminders: accepted sessions starting within the
 * next 24h get one reminder to both parties (once — tracked by remindedAt).
 * Called from dashboard pages; moves to a scheduled job in Phase 9+.
 */
export async function sendDueBookingReminders(): Promise<number> {
  const now = new Date();
  const window = new Date(now.getTime() + 24 * 60 * 60_000);

  const due = await db.booking.findMany({
    where: {
      status: "ACCEPTED",
      remindedAt: null,
      startsAt: { gt: now, lte: window },
    },
    include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
    take: 20,
  });

  // Live-class reminders use the same opportunistic pattern.
  const dueClasses = await db.liveClass.findMany({
    where: {
      status: "SCHEDULED",
      remindedAt: null,
      startsAt: { gt: now, lte: window },
    },
    include: { participants: { select: { userId: true } }, teacher: { select: { name: true } } },
    take: 20,
  });
  for (const live of dueClasses) {
    for (const p of live.participants) {
      await createNotification({
        userId: p.userId,
        type: "LIVE_CLASS_REMINDER",
        title: "Live class reminder ⏰",
        body: `"${live.title}" starts in under 24 hours (${live.startsAt.toDateString()}) — join: ${live.meetingUrl}`,
        data: { liveClassId: live.id },
      });
    }
    await db.liveClass.update({ where: { id: live.id }, data: { remindedAt: now } });
  }

  for (const booking of due) {
    await createNotification({
      userId: booking.studentId,
      type: "LIVE_CLASS_REMINDER",
      title: "Session reminder ⏰",
      body: `Your 1-on-1 session with ${booking.teacher.name} starts in under 24 hours (${booking.startsAt.toDateString()}).`,
      data: { bookingId: booking.id },
    });
    await createNotification({
      userId: booking.teacherId,
      type: "LIVE_CLASS_REMINDER",
      title: "Session reminder ⏰",
      body: `Your session with ${booking.student.name} starts in under 24 hours.`,
      data: { bookingId: booking.id },
    });
    await db.booking.update({
      where: { id: booking.id },
      data: { remindedAt: now },
    });
  }
  return due.length;
}
