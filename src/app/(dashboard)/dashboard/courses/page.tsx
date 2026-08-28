import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { formatBDT, formatDate } from "@/lib/format";
import { gradientFor } from "@/lib/utils";

export const metadata: Metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/courses");

  const [enrollments, progress, certificates] = await Promise.all([
    db.enrollment.findMany({
      where: { studentId: user.id },
      include: { course: { include: { teacher: true, category: true } } },
      orderBy: { purchasedAt: "desc" },
    }),
    db.courseProgress.findMany({ where: { studentId: user.id } }),
    db.certificate.findMany({ where: { studentId: user.id }, select: { enrollmentId: true, certificateNumber: true } }),
  ]);

  const progressByCourse = new Map(progress.map((p) => [p.courseId, p]));
  const certByEnrollment = new Map(certificates.map((c) => [c.enrollmentId, c.certificateNumber]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">My Courses</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {enrollments.length} course{enrollments.length === 1 ? "" : "s"} enrolled.
        </p>
      </div>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No courses yet"
          description="Enroll in a course and it will show up here with your progress."
          action={
            <Link href="/#courses" className="text-sm font-bold text-brand-fg hover:underline">
              Browse courses →
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {enrollments.map((e) => {
            const p = progressByCourse.get(e.courseId);
            const pct = p?.percentComplete ?? 0;
            const completed = pct >= 100;
            return (
              <Card key={e.id} hoverable className="overflow-hidden">
                <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${gradientFor(e.course.title)}`}>
                  <BookOpen className="h-8 w-8 text-white/80" aria-hidden />
                  {completed ? (
                    <Badge variant="success" className="absolute left-3 top-3">
                      <CheckCircle2 className="h-3 w-3" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="absolute left-3 top-3 bg-black/40 text-white border-transparent">
                      {e.status}
                    </Badge>
                  )}
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-faint-fg">
                      {e.course.category.name}
                    </p>
                    <h2 className="mt-0.5 line-clamp-2 font-display text-[15px] font-bold leading-snug text-foreground">
                      {e.course.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Avatar name={e.course.teacher.name} src={e.course.teacher.avatarUrl} size="xs" />
                    <span className="text-xs text-muted-fg">{e.course.teacher.name}</span>
                    <span className="ml-auto text-xs text-faint-fg">
                      Purchased {formatDate(e.purchasedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={pct} className="flex-1" color={completed ? "success" : "brand"} />
                    <span className="text-xs font-bold tabular-nums text-muted-fg">{Math.round(pct)}%</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-faint-fg">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(e.course.totalDurationMinutes / 60)}h · {e.course.totalLessons} lessons
                    </span>
                    <span className="font-bold text-muted-fg">
                      {e.pricePaid === 0 ? "Free" : formatBDT(e.pricePaid)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/dashboard/courses/${e.courseId}/learn`}
                      className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-fg transition-colors hover:underline"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {completed ? "Review course" : pct > 0 ? "Continue learning" : "Start learning"}
                    </Link>
                    {completed && certByEnrollment.get(e.id) && (
                      <Link
                        href={`/verify/${certByEnrollment.get(e.id)}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-gold transition-colors hover:underline"
                      >
                        <Award className="h-3.5 w-3.5" /> View certificate
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
