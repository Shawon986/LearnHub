import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatNumber } from "@/lib/format";
import { CreateCourseModal } from "./create-course-modal";

export const metadata: Metadata = { title: "Courses" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  REVIEW: "gold",
  PUBLISHED: "success",
  UNPUBLISHED: "neutral",
  ARCHIVED: "neutral",
};

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/courses");

  const [courses, categories] = await Promise.all([
    db.course.findMany({
      where: { teacherId: user.id },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const published = courses.filter((c) => c.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Courses</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {courses.length} courses · {published} published. Courses go to the admin team for approval, then appear in the course section.
          </p>
        </div>
        <CreateCourseModal categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="Create your first course"
          description="Start with a title and category — you'll build the curriculum module by module."
          action={
            <CreateCourseModal
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              trigger={
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-fg">
                  <Plus className="h-4 w-4" /> New course
                </span>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((c) => (
            <Card key={c.id} hoverable className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="line-clamp-1 text-[14px] font-bold text-foreground">{c.title}</h2>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "neutral"}>{c.status}</Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-muted-fg">
                  {c.category.name} · {c.totalLessons} lessons · {formatNumber(c.enrollmentCount)} students
                </p>
                <p className="mt-1 text-[13px] font-extrabold text-foreground">
                  {c.price === 0 ? "Free" : formatBDT(c.price)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
