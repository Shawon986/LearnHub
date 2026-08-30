import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { LearnShell, type SerializedCourse } from "./learn-shell";
import { AiAssistant } from "./ai-assistant";

export const metadata: Metadata = { title: "Learning" };

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { courseId } = await params;
  const { lesson: lessonParam } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/dashboard/courses/${courseId}/learn`);

  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: user.id, courseId } },
  });
  if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-xl font-extrabold text-foreground">You&apos;re not enrolled</h1>
        <p className="mt-2 text-sm text-muted-fg">
          Enroll in this course to access its lessons.
        </p>
        <Link href="/dashboard/courses" className="mt-6 inline-block text-sm font-bold text-brand-fg hover:underline">
          ← Back to my courses
        </Link>
      </div>
    );
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: {
              quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
              assignments: true,
            },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const [progress, lessonProgress, mySubmissionRows, aiConversation] = await Promise.all([
    db.courseProgress.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    }),
    db.lessonProgress.findMany({ where: { studentId: user.id, lesson: { module: { courseId } } } }),
    db.assignmentSubmission.findMany({
      where: { studentId: user.id, assignment: { courseId } },
    }),
    db.aIConversation.findFirst({
      where: { userId: user.id, type: "STUDY_ASSISTANT" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const completedSet = new Set(
    lessonProgress.filter((p) => p.completed).map((p) => p.lessonId),
  );
  const submissionByAssignment = new Map(mySubmissionRows.map((s) => [s.assignmentId, s]));

  const serialized: SerializedCourse = {
    id: course.id,
    title: course.title,
    teacherName: course.teacherId ? (await db.user.findUnique({ where: { id: course.teacherId }, select: { name: true } }))?.name ?? "" : "",
    percentComplete: progress?.percentComplete ?? 0,
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => {
        const lessonAssignment = l.assignments[0] ?? null;
        const mySubmission = lessonAssignment
          ? submissionByAssignment.get(lessonAssignment.id)
          : undefined;
        return {
          id: l.id,
          title: l.title,
          type: l.type,
          durationMinutes: l.durationMinutes,
          completed: completedSet.has(l.id),
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
                  points: q.points,
                  explanation: q.explanation,
                })),
              }
            : null,
          assignment: lessonAssignment
            ? {
                id: lessonAssignment.id,
                title: lessonAssignment.title,
                description: lessonAssignment.description,
                dueDate: lessonAssignment.dueDate ? lessonAssignment.dueDate.toISOString().slice(0, 10) : null,
                maxScore: lessonAssignment.maxScore,
                mySubmission: mySubmission
                  ? {
                      content: mySubmission.content,
                      status: mySubmission.status,
                      score: mySubmission.score,
                      feedback: mySubmission.feedback,
                    }
                  : null,
              }
            : null,
        };
      }),
    })),
  };

  const flat = serialized.modules.flatMap((m) => m.lessons);
  const currentId = lessonParam ?? flat[0]?.id ?? "";
  if (flat.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <h1 className="font-display text-xl font-extrabold text-foreground">Curriculum coming soon</h1>
        <p className="mt-2 text-sm text-muted-fg">
          The teacher is still building this course. Check back soon!
        </p>
        <Link href="/dashboard/courses" className="mt-6 inline-block text-sm font-bold text-brand-fg hover:underline">
          ← Back to my courses
        </Link>
      </div>
    );
  }

  const currentLesson = flat.find((l) => l.id === currentId) ?? flat[0];

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/courses"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> My courses
      </Link>
      <LearnShell course={serialized} currentLessonId={currentId} />
      <AiAssistant
        courseTitle={course.title}
        lessonTitle={currentLesson.title}
        articleSnippet={currentLesson.articleContent ?? undefined}
        initialConversationId={aiConversation?.id ?? null}
        initialMessages={
          aiConversation?.messages
            ? [...aiConversation.messages]
                .reverse()
                .map((m) => ({ id: m.id, role: m.role as "USER" | "ASSISTANT", content: m.content }))
            : []
        }
      />
    </div>
  );
}
