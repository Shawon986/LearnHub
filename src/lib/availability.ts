import { db } from "@/lib/db";

// Booking availability engine: weekly slots minus blocked dates minus
// existing commitments (bookings + live classes).

const DAYS_IN_ADVANCE = 14;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** All distinct start times (every 30 min) inside a slot range. */
function startTimesWithin(start: string, end: string): string[] {
  const out: string[] = [];
  let t = toMinutes(start);
  const max = toMinutes(end) - 30; // must fit at least a 30-min session
  while (t <= max) {
    out.push(toTimeString(t));
    t += 30;
  }
  return out;
}

/** ISO date (YYYY-MM-DD) → Date at local midnight. */
function parseDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`);
}

/** Teachers' commitments (bookings + live classes) overlapping a window. */
export async function hasCommitmentOverlap(
  teacherId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  const [bookings, liveClasses] = await Promise.all([
    db.booking.findMany({
      where: {
        teacherId,
        status: { in: ["PENDING", "ACCEPTED"] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
    db.liveClass.findMany({
      where: {
        teacherId,
        status: { in: ["SCHEDULED", "LIVE"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
      select: { id: true },
    }),
  ]);
  return bookings.length > 0 || liveClasses.length > 0;
}

/** Is this booking window valid for the teacher right now? */
export async function isBookingWindowValid(
  teacherId: string,
  startsAt: Date,
  durationMinutes: number,
  excludeBookingId?: string,
): Promise<{ valid: boolean; reason?: string }> {
  const now = new Date();
  if (startsAt <= now) return { valid: false, reason: "Start time must be in the future." };
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (endsAt <= startsAt) return { valid: false, reason: "Invalid duration." };

  const dayOfWeek = startsAt.getDay();

  // Blocked date?
  const dayStart = new Date(startsAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
  const exception = await db.availabilityException.findFirst({
    where: { teacherId, date: { gte: dayStart, lt: dayEnd } },
  });
  if (exception) return { valid: false, reason: "The teacher is not available on this date." };

  // Within a weekly slot?
  const slots = await db.availabilitySlot.findMany({ where: { teacherId, dayOfWeek } });
  if (slots.length === 0) return { valid: false, reason: "The teacher is not available on this day." };

  const startMin = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endMin = startMin + durationMinutes;
  const covered = slots.some((s) => {
    const slotStart = toMinutes(s.startTime);
    const slotEnd = toMinutes(s.endTime);
    return startMin >= slotStart && endMin <= slotEnd;
  });
  if (!covered) {
    return { valid: false, reason: "This time is outside the teacher's availability." };
  }

  // Conflict with existing commitments?
  const overlap = await hasCommitmentOverlap(teacherId, startsAt, endsAt, excludeBookingId);
  if (overlap) return { valid: false, reason: "This time conflicts with another booking or live class." };

  return { valid: true };
}

/** Dates (next N days) where the teacher has at least one bookable slot. */
export async function getAvailableDates(teacherId: string): Promise<string[]> {
  const slots = await db.availabilitySlot.findMany({ where: { teacherId } });
  if (slots.length === 0) return [];

  const daySet = new Set(slots.map((s) => s.dayOfWeek));
  const exceptions = await db.availabilityException.findMany({
    where: {
      teacherId,
      date: { gte: parseDate(todayIso()) },
    },
    select: { date: true },
  });
  const blocked = new Set(exceptions.map((e) => localIso(e.date)));

  const out: string[] = [];
  for (let i = 1; i <= DAYS_IN_ADVANCE; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = localIso(d);
    if (!blocked.has(iso) && daySet.has(d.getDay())) out.push(iso);
  }
  return out;
}

/** Free 30-min start times for a teacher on a given date. */
export async function getAvailableSlots(teacherId: string, isoDate: string): Promise<string[]> {
  const date = parseDate(isoDate);
  if (Number.isNaN(date.getTime())) return [];

  const dayOfWeek = date.getDay();
  const slots = await db.availabilitySlot.findMany({ where: { teacherId, dayOfWeek } });
  if (slots.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  const [exception, commitments] = await Promise.all([
    db.availabilityException.findFirst({
      where: { teacherId, date: { gte: dayStart, lt: dayEnd } },
    }),
    Promise.all([
      db.booking.findMany({
        where: {
          teacherId,
          status: { in: ["PENDING", "ACCEPTED"] },
          startsAt: { gte: dayStart, lt: dayEnd },
        },
        select: { startsAt: true, endsAt: true },
      }),
      db.liveClass.findMany({
        where: {
          teacherId,
          status: { in: ["SCHEDULED", "LIVE"] },
          startsAt: { gte: dayStart, lt: dayEnd },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]).then(([b, l]) => [...b, ...l]),
  ]);

  if (exception) return [];

  const busy = commitments.map((c) => ({
    start: c.startsAt.getHours() * 60 + c.startsAt.getMinutes(),
    end: c.endsAt.getHours() * 60 + c.endsAt.getMinutes(),
  }));

  const allStarts = new Set<string>();
  for (const s of slots) {
    for (const t of startTimesWithin(s.startTime, s.endTime)) allStarts.add(t);
  }

  // Drop times that would overlap any commitment (assume 60-min sessions).
  const out: string[] = [];
  for (const t of allStarts) {
    const startMin = toMinutes(t);
    const endMin = startMin + 60;
    const clash = busy.some((b) => startMin < b.end && endMin > b.start);
    if (!clash) out.push(t);
  }
  return out.sort();
}

/** Local-timezone YYYY-MM-DD (matches how the UI + booking action parse dates). */
function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayIso(): string {
  return localIso(new Date());
}
