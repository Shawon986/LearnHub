import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  CalendarDays,
  Flame,
  PlayCircle,
  Sparkles,
  Trophy,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CourseCard, type CourseCardData } from "@/components/shared/course-card";
import { LiveClassCard, type LiveClassCardData } from "@/components/shared/live-class-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Student Dashboard" };

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "STUDENT") redirect("/teacher");

  const [profile, enrollments, progress, liveClasses, recommendations, achievements, unread] =
    await Promise.all([
      db.studentProfile.findUnique({ where: { userId: user.id } }),
      db.enrollment.findMany({
        where: { studentId: user.id, status: "ACTIVE" },
        include: { course: { include: { teacher: true, category: true } } },
        orderBy: { purchasedAt: "desc" },
        take: 5,
      }),
      db.courseProgress.findMany({ where: { studentId: user.id } }),
      db.liveClass.findMany({
        where: { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED"] } },
        include: { teacher: true },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.course.findMany({
        where: { status: "PUBLISHED", enrollments: { none: { studentId: user.id } } },
        include: { teacher: true, category: true },
        orderBy: { enrollmentCount: "desc" },
        take: 4,
      }),
      db.achievement.findMany({
        where: { userId: user.id },
        include: { badge: true },
        orderBy: { earnedAt: "desc" },
        take: 4,
      }),
      db.notification.count({ where: { userId: user.id, read: false } }),
    ]);

  const progressByCourse = new Map(progress.map((p) => [p.courseId, p]));
  const completedCount = enrollments.filter((e) => progressByCourse.get(e.courseId)?.percentComplete === 100).length;

  const recCards: CourseCardData[] = recommendations.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    type: c.type,
    price: c.price,
    compareAtPrice: c.compareAtPrice,
    thumbnailUrl: c.thumbnailUrl,
    teacherName: c.teacher.name,
    teacherAvatarUrl: c.teacher.avatarUrl,
    categoryName: c.category.name,
    avgRating: c.avgRating,
    reviewCount: c.reviewCount,
    enrollmentCount: c.enrollmentCount,
    totalDurationMinutes: c.totalDurationMinutes,
    totalLessons: c.totalLessons,
  }));

  const liveCards: LiveClassCardData[] = liveClasses.map((l) => ({
    id: l.id,
    title: l.title,
    startsAt: l.startsAt.toISOString(),
    endsAt: l.endsAt.toISOString(),
    status: l.status,
    teacherName: l.teacher.name,
    teacherAvatarUrl: l.teacher.avatarUrl,
    durationSeconds: l.durationMinutes * 60,
  }));

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            {greeting()}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Here&apos;s what&apos;s happening with your learning today.
          </p>
        </div>
        <Badge variant="gold" size="md">
          <Flame className="h-3.5 w-3.5" />
          {profile?.streakDays ?? 0}-day streak
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Enrolled" value={String(enrollments.length)} icon={<BookOpen />} tone="brand" />
        <StatCard label="In progress" value={String(enrollments.filter((e) => (progressByCourse.get(e.courseId)?.percentComplete ?? 0) < 100).length)} icon={<PlayCircle />} tone="accent" />
        <StatCard label="Completed" value={String(completedCount)} icon={<Award />} tone="gold" />
        <StatCard label="Unread alerts" value={String(unread)} icon={<CalendarDays />} />
      </div>

      {/* Continue learning */}
      <section aria-labelledby="continue-heading">
        <h2 id="continue-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Continue learning
        </h2>
        {enrollments.length === 0 ? (
          <EmptyState
            compact
            icon={<BookOpen />}
            title="No courses yet"
            description="Enroll in a course and it will show up here."
            action={
              <Link href="/#courses" className="text-sm font-bold text-brand-fg hover:underline">
                Browse courses →
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enrollments.map((e) => {
              const p = progressByCourse.get(e.courseId)?.percentComplete ?? 0;
              return (
                <Card key={e.id} hoverable className="flex items-center gap-4 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{e.course.title}</p>
                    <p className="truncate text-[11px] text-faint-fg">by {e.course.teacher.name}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={p} className="flex-1" />
                      <span className="text-[11px] font-bold tabular-nums text-muted-fg">{Math.round(p)}%</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming live classes */}
      <section aria-labelledby="live-heading">
        <h2 id="live-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Upcoming live classes
        </h2>
        {liveCards.length === 0 ? (
          <EmptyState compact icon={<CalendarDays />} title="No upcoming classes" description="Live classes scheduled by your teachers will appear here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveCards.map((l) => (
              <LiveClassCard key={l.id} liveClass={l} />
            ))}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section aria-labelledby="ach-heading">
        <h2 id="ach-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Achievements
        </h2>
        {achievements.length === 0 ? (
          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No badges yet — but they&apos;re waiting for you</p>
              <p className="text-[13px] text-muted-fg">Complete your first course to earn the &ldquo;First Course Completed&rdquo; badge.</p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-3">
            {achievements.map((a) => (
              <Card key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-soft text-gold">
                  <Trophy className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-foreground">{a.badge.name}</p>
                  <p className="text-[11px] text-faint-fg">{a.badge.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section aria-labelledby="rec-heading">
        <div className="mb-4 flex items-center gap-2">
          <h2 id="rec-heading" className="font-display text-lg font-bold text-foreground">
            Recommended for you
          </h2>
          <Sparkles className="h-4 w-4 text-gold" aria-hidden />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {recCards.map((c) => (
            <CourseCard key={c.id} course={c} href={`/courses/${c.slug}`} />
          ))}
        </div>
      </section>

      {/* My teachers */}
      <section aria-labelledby="teachers-heading">
        <h2 id="teachers-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Your teachers
        </h2>
        <div className="flex flex-wrap gap-3">
          {[...new Map(enrollments.map((e) => [e.course.teacherId, e.course.teacher])).values()].map((t) => (
            <Card key={t.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={t.name} src={t.avatarUrl} size="sm" />
              <div>
                <p className="text-[13px] font-bold text-foreground">{t.name}</p>
                <p className="text-[11px] text-faint-fg">Course instructor</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
