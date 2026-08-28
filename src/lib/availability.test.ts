import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../vitest.setup";
import { isBookingWindowValid } from "./availability";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

// Helper: next occurrence of a weekday at a given hour.
function nextAt(dayOfWeek: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7 || 7));
  d.setHours(hour, 0, 0, 0);
  return d;
}

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
  const db = await testDb();
  // Weekly availability every day 09:00–18:00.
  for (let day = 0; day <= 6; day++) {
    await db.availabilitySlot.create({
      data: { teacherId: fixtures.teacher.id, dayOfWeek: day, startTime: "09:00", endTime: "18:00" },
    });
  }
});

describe("isBookingWindowValid", () => {
  it("accepts a window inside a weekly slot", async () => {
    const at = nextAt(2, 10); // next Tuesday 10:00
    const result = await isBookingWindowValid(fixtures.teacher.id, at, 60);
    expect(result.valid).toBe(true);
  });

  it("rejects windows outside slots", async () => {
    const at = nextAt(2, 19); // 19:00 — outside 09–18
    const result = await isBookingWindowValid(fixtures.teacher.id, at, 60);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("outside");
  });

  it("rejects past times", async () => {
    const result = await isBookingWindowValid(
      fixtures.teacher.id,
      new Date(Date.now() - 60_000),
      60,
    );
    expect(result.valid).toBe(false);
  });

  it("rejects blocked dates", async () => {
    const db = await testDb();
    const at = nextAt(3, 10);
    const dayStart = new Date(at);
    dayStart.setHours(0, 0, 0, 0);
    await db.availabilityException.create({
      data: { teacherId: fixtures.teacher.id, date: dayStart, isBlocked: true },
    });
    const result = await isBookingWindowValid(fixtures.teacher.id, at, 60);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("not available on this date");
  });

  it("rejects conflicts with an existing booking", async () => {
    const db = await testDb();
    const at = nextAt(4, 10);
    await db.booking.create({
      data: {
        studentId: fixtures.student.id,
        teacherId: fixtures.teacher.id,
        startsAt: at,
        endsAt: new Date(at.getTime() + 60 * 60_000),
        durationMinutes: 60,
        price: 800,
        status: "ACCEPTED",
      },
    });
    const result = await isBookingWindowValid(fixtures.teacher.id, at, 60);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("conflicts");
  });
});
