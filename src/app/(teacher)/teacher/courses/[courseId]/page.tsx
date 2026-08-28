import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ActionButton } from "@/components/action-button";
import { submitCourseForReview } from "@/lib/actions/course";
import { OverviewForm } from "./overview-form";
import { CurriculumEditor, type SerializedModule } from "./curriculum-editor";
import { AiTeacherTools } from "./ai-teacher-tools";

export const metadata: Metadata = { title: "Course Builder" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  REVIEW: "gold",
  PUBLISHED: "success",
  UNPUBLISHED: "neutral",
  ARCHIVED: "danger",
};

export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/courses");
  if (user.role !== "TEACHER" && !isAdminRole(user.role)) redirect("/teacher");

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      category: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              quiz: {
                include: { questions: { orderBy: { sortOrder: "asc" } } },
              },
              assignments: {
                include: {
                  submissions: {
                    orderBy: { submittedAt: "desc" },
                    include: { student: { select: { name: true, avatarUrl: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();
  if (course.teacherId !== user.id && !isAdminRole(user.role)) redirect("/teacher/courses");

  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const editable = ["DRAFT", "REVIEW", "UNPUBLISHED"].includes(course.status);

  const modules: SerializedModule[] = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      type: l.type,
      durationMinutes: l.durationMinutes,
      isPreview: l.isPreview,
      articleContent: l.articleContent,
      quiz: l.quiz
        ? {
            id: l.quiz.id,
            title: l.quiz.title,
            passingScore: l.quiz.passingScore,
            timeLimitMinutes: l.quiz.timeLimitMinutes,
            questions: l.quiz.questions.map((q) => ({
              id: q.id,
              text: q.text,
              options: safeJsonParse<string[]>(q.options, []),
              correctIndex: safeJsonParse<{ index?: number }>(q.correctAnswer, {}).index ?? 0,
              points: q.points,
              explanation: q.explanation,
            })),
          }
        : null,
      assignment: l.assignments[0]
        ? {
            id: l.assignments[0].id,
            title: l.assignments[0].title,
            description: l.assignments[0].description,
            dueDate: l.assignments[0].dueDate ? l.assignments[0].dueDate.toISOString().slice(0, 10) : null,
            maxScore: l.assignments[0].maxScore,
            submissions: l.assignments[0].submissions.map((s) => ({
              id: s.id,
              studentName: s.student.name,
              studentAvatarUrl: s.student.avatarUrl,
              content: s.content,
              status: s.status,
              score: s.score,
              feedback: s.feedback,
            })),
          }
        : null,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All courses
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl font-extrabold text-foreground">{course.title}</h1>
            <Badge variant={STATUS_VARIANT[course.status] ?? "neutral"}>{course.status}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-fg">
            {course.category.name} · {course.totalLessons} lessons ·{" "}
            {Math.round(course.totalDurationMinutes / 60)}h total
          </p>
        </div>

        {editable && (
          <ActionButton
            size="lg"
            action={submitCourseForReview.bind(null, course.id)}
            confirm="Submit this course for admin review? You won't be able to edit it while it's under review."
            successMessage="Submitted for review — the admin team has been notified."
          >
            Submit for review
          </ActionButton>
        )}
        {course.status === "REVIEW" && (
          <Badge variant="gold" size="md">
            Under review — you can keep editing. The admin team approves your latest version.
          </Badge>
        )}
        {course.status === "PUBLISHED" && (
          <ButtonLink slug={course.slug} />
        )}
      </div>

      <AiTeacherTools courseTitle={course.title} />

      <OverviewForm
        courseId={course.id}
        editable={editable}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          title: course.title,
          subtitle: course.subtitle ?? "",
          description: course.description ?? "",
          categoryId: course.categoryId,
          type: course.type,
          difficulty: course.difficulty,
          price: course.price,
          compareAtPrice: course.compareAtPrice ?? 0,
          language: course.language,
          requirements: safeJsonParse<string[]>(course.requirements, []).join("\n"),
          outcomes: safeJsonParse<string[]>(course.outcomes, []).join("\n"),
          tags: safeJsonParse<string[]>(course.tags, []).join(", "),
        }}
      />

      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-[15px] font-bold text-foreground">Curriculum</h2>
            <p className="text-[12px] text-muted-fg">
              {editable
                ? "Build modules and lessons, then submit for review."
                : "This course is locked while it's published — unpublish (admin) to edit."}
            </p>
          </div>
        </CardContent>
      </Card>

      <CurriculumEditor courseId={course.id} editable={editable} modules={modules} />
    </div>
  );
}

function ButtonLink({ slug }: { slug: string }) {
  return <Button href={`/courses/${slug}`} variant="secondary" size="sm">View public page ↗</Button>;
}
