import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, CircleDollarSign, Clock3, MonitorPlay, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatBDT, formatDate, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Teacher Dashboard" };

const QUICK_ACTIONS = [
  { href: "/teacher/courses", label: "Create a course", icon: BookOpen, blurb: "Build modules, lessons & quizzes" },
  { href: "/teacher/live-classes", label: "Schedule live class", icon: MonitorPlay, blurb: "Set date, capacity & materials" },
  { href: "/teacher/availability", label: "Set availability", icon: Clock3, blurb: "Define weekly tutoring slots" },
  { href: "/teacher/earnings", label: "View earnings", icon: CircleDollarSign, blurb: "Wallet, commissions & withdrawals" },
];

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher");

  const [profile, wallet, studentGroup, courseCount, liveCount, upcomingLive, latestNotifications] =
    await Promise.all([
      db.teacherProfile.findUnique({ where: { userId: user.id } }),
      db.teacherWallet.findUnique({ where: { teacherId: user.id } }),
      db.enrollment.groupBy({
        by: ["studentId"],
        where: { course: { teacherId: user.id }, status: "ACTIVE" },
      }),
      db.course.count({ where: { teacherId: user.id, status: "PUBLISHED" } }),
      db.liveClass.count({ where: { teacherId: user.id, status: { in: ["SCHEDULED", "LIVE"] } } }),
      db.liveClass.findMany({
        where: { teacherId: user.id, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } },
        orderBy: { startsAt: "asc" },
        take: 4,
      }),
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">
          Welcome, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {profile?.headline ?? "Here is how your teaching business is doing."}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active students" value={String(studentGroup.length)} icon={<Users />} tone="accent" />
        <StatCard label="Published courses" value={String(courseCount)} icon={<BookOpen />} tone="brand" />
        <StatCard
          label="Available balance"
          value={formatBDT(wallet?.availableBalance ?? 0)}
          icon={<CircleDollarSign />}
          tone="gold"
        />
        <StatCard label="Upcoming classes" value={String(liveCount)} icon={<CalendarDays />} />
      </div>

      {/* Quick actions */}
      <section aria-labelledby="qa-heading">
        <h2 id="qa-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map((qa) => (
            <Link key={qa.href} href={qa.href} className="group">
              <Card hoverable className="h-full p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent [&>svg]:h-5 [&>svg]:w-5">
                  <qa.icon />
                </div>
                <p className="mt-3 text-sm font-bold text-foreground">{qa.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">{qa.blurb}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming classes */}
        <section className="lg:col-span-2" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="mb-4 font-display text-lg font-bold text-foreground">
            Your upcoming live classes
          </h2>
          {upcomingLive.length === 0 ? (
            <EmptyState
              compact
              icon={<MonitorPlay />}
              title="Nothing scheduled"
              description="Schedule your first live class to reach students in real time."
            />
          ) : (
            <div className="space-y-3">
              {upcomingLive.map((l) => (
                <Card key={l.id} hoverable className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                    <MonitorPlay className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{l.title}</p>
                    <p className="text-[12px] text-faint-fg">
                      {formatDate(l.startsAt)} · {formatTime(l.startsAt)} · {l.durationMinutes} min
                    </p>
                  </div>
                  <Badge variant={l.status === "LIVE" ? "success" : "accent"}>
                    {l.status === "LIVE" ? "Live now" : "Scheduled"}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-4 font-display text-lg font-bold text-foreground">
            Recent activity
          </h2>
          <Card>
            <CardContent className="space-y-4">
              {latestNotifications.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-faint-fg">No recent activity</p>
              ) : (
                latestNotifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3">
                    <Avatar name={n.title.charAt(0)} size="xs" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{n.title}</p>
                      {n.body && <p className="truncate text-[12px] text-muted-fg">{n.body}</p>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
