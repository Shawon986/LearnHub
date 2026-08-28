import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../vitest.setup";
import { awardXp, updateStreak } from "./gamification";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
});

describe("awardXp", () => {
  it("adds XP and levels up at 500", async () => {
    const db = await testDb();
    await db.studentProfile.update({
      where: { userId: fixtures.student.id },
      data: { xp: 490 },
    });
    const result = await awardXp(fixtures.student.id, 20);
    expect(result.xp).toBe(510);
    expect(result.level).toBe(2);
  });
});

describe("updateStreak", () => {
  it("starts a streak at 1", async () => {
    const streak = await updateStreak(fixtures.student.id);
    expect(streak).toBe(1);
  });

  it("continues a streak from yesterday", async () => {
    const db = await testDb();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await db.studentProfile.update({
      where: { userId: fixtures.student.id },
      data: { streakDays: 3, lastStreakDate: yesterday },
    });
    const streak = await updateStreak(fixtures.student.id);
    expect(streak).toBe(4);
  });

  it("resets a broken streak", async () => {
    const db = await testDb();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    await db.studentProfile.update({
      where: { userId: fixtures.student.id },
      data: { streakDays: 9, lastStreakDate: threeDaysAgo },
    });
    const streak = await updateStreak(fixtures.student.id);
    expect(streak).toBe(1);
  });

  it("does not double-count the same day", async () => {
    await updateStreak(fixtures.student.id);
    const streak = await updateStreak(fixtures.student.id);
    expect(streak).toBe(1);
  });
});
