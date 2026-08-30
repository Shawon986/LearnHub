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
import { DashboardGrid } from "@/components/admin/dashboard-grid";
import { formatBDT, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin Dashboard" };

const ROLE_VARIANT: Record<string, "brand" | "accent" | "gold" | "neutral" | "danger"> = {
  STUDENT: "neutral",
  TEACHER: "accent",
  ADMIN: "brand",
  MODERATOR: "gold",
  SUPPORT: "gold",
  SUPER_ADMIN: "danger",
};

/** Admin-panel destination for a notification's payload keys. */
function adminLinkFor(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  if (data.withdrawalId) return "/admin/withdrawals";
  if (data.teacherId) return "/admin/verification";
  if (data.disputeId) return "/admin/disputes";
  if (data.courseId) return "/admin/courses";
  if (data.bookingId) return "/admin/bookings";
  if (data.paymentId) return "/admin/payments";
  if (data.conversationId) return `/messages/${data.conversationId}`;
  if (data.liveClassId) return "/admin";
  return null;
}

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
    reviewQueue,
    latestNotifications,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "TEACHER" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.liveClass.count({ where: { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED"] } } }),
    db.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
    db.teacherVerification.count({ where: { status: "PENDING" } }),
    db.withdrawal.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "TEACHER_RESPONSE", "UNDER_REVIEW"] } } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.course.count({ where: { status: "REVIEW" } }),
    // Newest first — teacher verification/withdrawal messages land on top.
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const moderation = [
    { label: "Pending verifications", value: pendingVerifications, href: "/admin/verification", icon: ShieldCheck },
    { label: "Pending withdrawals", value: pendingWithdrawals, href: "/admin/withdrawals", icon: Wallet },
    { label: "Open disputes", value: openDisputes, href: "/admin/disputes", icon: ShieldCheck },
    { label: "Courses in review", value: reviewQueue, href: "/admin/courses?status=REVIEW", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Platform overview</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Signed in as <span className="font-semibold text-foreground">{user.name}</span> ({user.role}) ·
          every widget below can be shown, hidden or reordered.
        </p>
      </div>

      <DashboardGrid
        widgets={[
          {
            key: "latest-notifications",
            title: "Latest notifications",
            content: (
              <Card>
                <CardContent className="p-0">
                  {latestNotifications.length === 0 ? (
                    <p className="px-5 py-8 text-center text-[12px] text-faint-fg">
                      No notifications yet — new teacher applications and withdrawal
                      requests will appear here.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {latestNotifications.map((n) => {
                        const link = adminLinkFor((n.data ?? null) as Record<string, unknown> | null);
                        const inner = (
                          <span className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                                n.read ? "bg-transparent" : "bg-brand",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "text-[13px]",
                                    n.read ? "font-medium text-foreground" : "font-bold text-foreground",
                                  )}
                                >
                                  {n.title}
                                </span>
                                {!n.read && <Badge variant="brand" size="sm">New</Badge>}
                                <span className="ml-auto text-[11px] text-faint-fg">
                                  {timeAgo(n.createdAt)}
                                </span>
                              </span>
                              {n.body && (
                                <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-fg line-clamp-2">
                                  {n.body}
                                </span>
                              )}
                              {link && (
                                <span className="mt-1 inline-block text-[12px] font-bold text-brand-fg">
                                  Open →
                                </span>
                              )}
                            </span>
                          </span>
                        );
                        return (
                          <li key={n.id} className="px-5 py-3.5 transition-colors hover:bg-card-2">
                            {link ? (
                              <Link href={link} className="block">
                                {inner}
                              </Link>
                            ) : (
                              inner
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            key: "stats",
            title: "Key statistics",
            span: "full",
            content: (
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
            ),
          },
          {
            key: "moderation",
            title: "Needs your attention",
            content: (
              <div className="grid gap-4 sm:grid-cols-2">
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
            ),
          },
          {
            key: "signups",
            title: "Recent signups",
            content: (
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
            ),
          },
          {
            key: "quicklinks",
            title: "Quick actions",
            content: (
              <Card className="p-5">
                <ul className="space-y-2">
                  {[
                    { href: "/admin/recorded-classes/upload", label: "Upload a recorded class" },
                    { href: "/admin/coupons", label: "Create a coupon" },
                    { href: "/admin/notifications", label: "Send an announcement" },
                    { href: "/admin/users", label: "Manage users" },
                    { href: "/admin/analytics", label: "Open analytics" },
                    { href: "/admin/settings", label: "Platform settings" },
                  ].map((q) => (
                    <li key={q.href}>
                      <Link
                        href={q.href}
                        className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-[13px] font-bold text-foreground transition-colors hover:border-brand hover:text-brand-fg"
                      >
                        {q.label}
                        <span aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
