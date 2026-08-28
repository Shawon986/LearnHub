import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatNumber } from "@/lib/format";
import { CourseReviewActions } from "./course-review-actions";

export const metadata: Metadata = { title: "Course Review" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  REVIEW: "gold",
  PUBLISHED: "success",
  UNPUBLISHED: "neutral",
  ARCHIVED: "danger",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/courses");
  const { status } = await searchParams;

  const courses = await db.course.findMany({
    where: status && status !== "ALL" ? { status } : {},
    include: { teacher: true, category: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const reviewCount = courses.filter((c) => c.status === "REVIEW").length;

  const filters = ["ALL", "REVIEW", "PUBLISHED", "DRAFT", "UNPUBLISHED", "ARCHIVED"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Courses</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {reviewCount} course{reviewCount === 1 ? "" : "s"} awaiting review.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Course status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/courses" : `/admin/courses?status=${f}`}
            className={
              (status ?? "ALL") === f
                ? "shrink-0 rounded-full bg-brand px-4 py-1.5 text-[12px] font-bold text-white"
                : "shrink-0 rounded-full border border-line bg-card px-4 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
            }
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={<BookOpen />} title="No courses here" description="Courses appear as teachers submit them." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Course</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Price</th>
                <th className="hidden px-4 py-3 md:table-cell">Students</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {courses.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-card-2/50">
                  <td className="max-w-80 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/courses/${c.slug}`}
                          className="block truncate text-[13px] font-bold text-foreground hover:text-brand-fg"
                        >
                          {c.title}
                        </Link>
                        <p className="text-[11px] text-faint-fg">
                          {c.category.name} · {c.totalLessons} lessons
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.teacher.name} src={c.teacher.avatarUrl} size="xs" />
                      <span className="text-[12px] font-semibold text-muted-fg">{c.teacher.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] font-bold text-foreground">
                    {c.price === 0 ? "Free" : formatBDT(c.price)}
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {formatNumber(c.enrollmentCount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <CourseReviewActions
                      courseId={c.id}
                      courseTitle={c.title}
                      status={c.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
