import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flame, Lock, Target, Trophy, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements" };

const BADGE_ICONS: Record<string, typeof Trophy> = {
  trophy: Trophy,
  flame: Flame,
  target: Target,
  crown: Trophy,
  video: Video,
};

export default async function AchievementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/achievements");

  const [profile, badges, earned] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: user.id } }),
    db.badge.findMany(),
    db.achievement.findMany({ where: { userId: user.id }, include: { badge: true } }),
  ]);

  const earnedMap = new Map(earned.map((a) => [a.badgeId, a]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Achievements</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {earned.length} of {badges.length} badges earned.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4 text-center shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-faint-fg">XP · Level</p>
          <p className="font-display text-lg font-extrabold text-foreground">
            {profile?.xp ?? 0} XP · Lv {profile?.level ?? 1}
          </p>
          <ProgressBar value={((profile?.xp ?? 0) % 500) / 5} className="mt-2 w-36" color="gold" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => {
          const achievement = earnedMap.get(badge.id);
          const Icon = (badge.icon && BADGE_ICONS[badge.icon]) || Trophy;
          const unlocked = Boolean(achievement);
          return (
            <Card
              key={badge.id}
              className={cn(
                "flex items-center gap-4 p-5 transition-all",
                !unlocked && "opacity-60 grayscale",
              )}
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  unlocked ? "bg-gold-soft text-gold" : "bg-card-2 text-faint-fg",
                )}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-foreground">{badge.name}</p>
                <p className="text-[12px] leading-relaxed text-muted-fg">{badge.description}</p>
                {achievement ? (
                  <p className="mt-1 text-[11px] font-semibold text-accent">
                    Earned {formatDate(achievement.earnedAt)}
                  </p>
                ) : (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-faint-fg">
                    <Lock className="h-3 w-3" /> Locked
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
