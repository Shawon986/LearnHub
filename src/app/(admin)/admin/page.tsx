import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CircleDollarSign,
  GraduationCap,
  ShieldCheck,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatBDT, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Admin Dashboard" };

const ROLE_VARIANT: Record<string, "brand" | "accent" | "gold" | "neutral" | "danger"> = {
  STUDENT: "neutral",
  TEACHER: "accent",
  ADMIN: "brand",
  MODERATOR: "gold",
  SUPPORT: "gold",
  SUPER_ADMIN: "danger",
};

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const [
    totalUsers,
    students,
    teachers,
    publishedCourses,
    upcomingLive,
    revenue,
    pendingVerifications,
    pendingWithdrawals,
    openDisputes,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TEACHER" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.liveClass.count({ where: { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    db.teacherVerification.count({ where: { status: "PENDING" } }),
    db.withdrawal.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"] } } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const moderation = [
    { label: "Pending verifications", value: pendingVerifications, href: "/admin/verification", icon: ShieldCheck },
    { label: "Pending withdrawals", value: pendingWithdrawals, href: "/admin/withdrawals", icon: Wallet },
    { label: "Open disputes", value: openDisputes, href: "/admin/disputes", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Signed in as <span className="font-semibold text-foreground">{user.name}</span> ({user.role})
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total users" value={String(totalUsers)} icon={<Users />} tone="brand" />
        <StatCard label="Students" value={String(students)} icon={<GraduationCap />} tone="accent" />
        <StatCard label="Teachers" value={String(teachers)} icon={<Users />} tone="accent" />
        <StatCard label="Published courses" value={String(publishedCourses)} icon={<BookOpen />} />
        <StatCard label="Upcoming live" value={String(upcomingLive)} icon={<Video />} />
        <StatCard
          label="Gross revenue"
          value={formatBDT(revenue._sum.amount ?? 0)}
          icon={<CircleDollarSign />}
          tone="gold"
        />
      </div>

      {/* Moderation queue */}
      <section aria-labelledby="mod-heading">
        <h2 id="mod-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Needs your attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {moderation.map((m) => (
            <Link key={m.label} href={m.href}>
              <Card hoverable className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold [&>svg]:h-5 [&>svg]:w-5">
                  <m.icon />
                </div>
                <div>
                  <p className="font-display text-xl font-extrabold text-foreground">{m.value}</p>
                  <p className="text-[12px] font-semibold text-muted-fg">{m.label}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent signups */}
      <section aria-labelledby="signups-heading">
        <h2 id="signups-heading" className="mb-4 font-display text-lg font-bold text-foreground">
          Recent signups
        </h2>
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-line">
              {recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">{u.name}</p>
                    <p className="truncate text-[11px] text-faint-fg">{u.email}</p>
                  </div>
                  <Badge variant={ROLE_VARIANT[u.role] ?? "neutral"}>{u.role}</Badge>
                  <span className="hidden w-20 text-right text-[11px] text-faint-fg sm:block">
                    {timeAgo(u.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
