import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

// XP, levels, streaks and badges. All awards are server-side —
// progress events call awardXp; dashboards call updateStreak.

const XP_PER_LEVEL = 500;

export const XP_AWARDS = {
  LESSON_COMPLETE: 10,
  QUIZ_PASSED: 20,
  COURSE_COMPLETE: 100,
  RECORDING_COMPLETE: 15,
} as const;

/** Award XP, recalculate level, notify on level-up. */
export async function awardXp(userId: string, amount: number): Promise<{ xp: number; level: number }> {
  const profile = await db.studentProfile.findUnique({ where: { userId } });
  if (!profile) return { xp: 0, level: 1 };

  const xp = profile.xp + amount;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  await db.studentProfile.update({
    where: { userId },
    data: { xp, level, totalLearningMinutes: { increment: Math.max(1, Math.round(amount / 2)) } },
  });

  if (level > profile.level) {
    await createNotification({
      userId,
      type: "SYSTEM",
      title: `Level up! 🎮 You're now level ${level}`,
      body: `Keep learning to climb the leaderboard.`,
    });
  }
  return { xp, level };
}

/** Daily streak: called when a student is active. */
export async function updateStreak(userId: string): Promise<number> {
  const profile = await db.studentProfile.findUnique({ where: { userId } });
  if (!profile) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  let streak = profile.streakDays;
  if (profile.lastStreakDate) {
    const last = new Date(profile.lastStreakDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.round((todayMs - last.getTime()) / (24 * 60 * 60_000));
    if (diffDays === 0) {
      return streak; // already counted today
    }
    if (diffDays === 1) {
      streak += 1;
    } else {
      streak = 1; // broken
    }
  } else {
    streak = 1;
  }

  await db.studentProfile.update({
    where: { userId },
    data: { streakDays: streak, lastStreakDate: new Date() },
  });

  // Streak badges.
  for (const code of ["STREAK_7", "STREAK_30"] as const) {
    const threshold = code === "STREAK_7" ? 7 : 30;
    if (streak >= threshold) {
      const badge = await db.badge.findUnique({ where: { code } });
      if (badge) {
        const exists = await db.achievement.findFirst({ where: { userId, badgeId: badge.id } });
        if (!exists) {
          await db.achievement.create({ data: { userId, badgeId: badge.id, status: "EARNED" } });
          await createNotification({
            userId,
            type: "SYSTEM",
            title: `Badge unlocked: ${badge.name} 🏅`,
            body: badge.description,
          });
        }
      }
    }
  }
  return streak;
}

/** Leaderboard: students by XP. */
export async function getLeaderboard(limit = 10) {
  return db.studentProfile.findMany({
    where: { user: { role: "STUDENT", status: "ACTIVE" } },
    include: { user: { select: { name: true, avatarUrl: true } } },
    orderBy: { xp: "desc" },
    take: limit,
  });
}
