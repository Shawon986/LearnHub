import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crown, Flame, Trophy } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLeaderboard, updateStreak } from "@/lib/gamification";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/leaderboard");

  // Visiting the dashboard counts as activity for the streak.
  const [rows, myStreak, myProfile] = await Promise.all([
    getLeaderboard(15),
    updateStreak(user.id),
    db.studentProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const myRank = rows.findIndex((r) => r.userId === user.id);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Top learners by XP — updated live as everyone learns.
          </p>
        </div>
        <Badge variant="gold" size="md">
          <Flame className="h-3.5 w-3.5" /> {myStreak}-day streak
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {rows.map((row, i) => (
            <li
              key={row.userId}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5",
                row.userId === user.id && "bg-brand-soft/40",
              )}
            >
              <span className="w-8 text-center font-display text-lg font-extrabold text-muted-fg">
                {i < 3 ? MEDALS[i] : i + 1}
              </span>
              <Avatar name={row.user.name} src={row.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {row.user.name}
                  {row.userId === user.id && <span className="ml-1 text-[10px] font-bold text-faint-fg">(you)</span>}
                </p>
                <p className="text-[11px] text-faint-fg">Level {row.level} · {row.streakDays}-day streak</p>
              </div>
              <span className="flex items-center gap-1 font-display text-[15px] font-extrabold text-foreground">
                <Trophy className="h-4 w-4 text-gold" />
                {row.xp.toLocaleString()} XP
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {myRank >= 0 && (
        <p className="text-center text-[13px] text-muted-fg">
          You&apos;re <strong className="text-foreground">#{myRank + 1}</strong> with{" "}
          <strong className="text-foreground">{(myProfile?.xp ?? 0).toLocaleString()} XP</strong> — complete lessons and
          quizzes to climb!
        </p>
      )}

      {myRank === 0 && (
        <p className="flex items-center justify-center gap-2 text-center text-sm font-bold text-gold">
          <Crown className="h-5 w-5" /> You&apos;re the top learner this week!
        </p>
      )}
    </div>
  );
}
