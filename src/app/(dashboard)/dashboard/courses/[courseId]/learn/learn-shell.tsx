"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  FileText,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { completeLesson } from "@/lib/actions/enroll";
import { QuizTaker } from "./quiz-taker";
import { AssignmentPanel } from "./assignment-panel";

export interface SerializedQuestionL {
  id: string;
  text: string;
  options: string[];
  points: number;
  explanation: string | null;
}
export interface SerializedQuizL {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number | null;
  questions: SerializedQuestionL[];
}
export interface SerializedAssignmentL {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  mySubmission: {
    content: string | null;
    status: string;
    score: number | null;
    feedback: string | null;
  } | null;
}
export interface SerializedLessonL {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  completed: boolean;
  articleContent: string | null;
  quiz: SerializedQuizL | null;
  assignment: SerializedAssignmentL | null;
}
export interface SerializedModuleL {
  id: string;
  title: string;
  lessons: SerializedLessonL[];
}
export interface SerializedCourse {
  id: string;
  title: string;
  teacherName: string;
  percentComplete: number;
  modules: SerializedModuleL[];
}

const TYPE_ICON: Record<string, typeof PlayCircle> = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  QUIZ: ListChecks,
  ASSIGNMENT: ClipboardList,
  LIVE: PlayCircle,
  RESOURCE: FileText,
};

export function LearnShell({
  course,
  currentLessonId,
}: {
  course: SerializedCourse;
  currentLessonId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const flat = course.modules.flatMap((m) => m.lessons);
  const idx = flat.findIndex((l) => l.id === currentLessonId);
  const lesson = flat[Math.max(0, idx)];
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;

  function go(lessonId: string) {
    router.push(`/dashboard/courses/${course.id}/learn?lesson=${lessonId}`);
  }

  function markComplete() {
    startTransition(async () => {
      const result = await completeLesson(lesson.id);
      if (result.ok) {
        toast({ title: "Lesson completed ✓", description: "Progress saved.", variant: "success" });
        router.refresh();
        if (next) go(next.id);
      } else {
        toast({ title: result.error ?? "Could not save progress.", variant: "error" });
      }
    });
  }

  const LessonIcon = TYPE_ICON[lesson.type] ?? PlayCircle;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sidebar — below the lesson on mobile, left column on desktop. */}
      <aside className="order-2 lg:order-none lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4">
            <p className="line-clamp-2 text-[13px] font-bold text-foreground">{course.title}</p>
            <p className="mt-0.5 text-[11px] text-faint-fg">{course.teacherName}</p>
            <div className="mt-3 flex items-center gap-2">
              <ProgressBar value={course.percentComplete} className="flex-1" />
              <span className="text-[11px] font-bold tabular-nums text-muted-fg">
                {Math.round(course.percentComplete)}%
              </span>
            </div>
          </div>
          <nav className="max-h-[60vh] overflow-y-auto p-3" aria-label="Course curriculum">
            {course.modules.map((m, mi) => (
              <div key={m.id} className="mb-1">
                <p className="px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                  {mi + 1}. {m.title}
                </p>
                <ul>
                  {m.lessons.map((l) => {
                    const active = l.id === lesson.id;
                    const Icon = TYPE_ICON[l.type] ?? PlayCircle;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => go(l.id)}
                          aria-current={active ? "step" : undefined}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors",
                            active
                              ? "bg-brand-soft font-bold text-brand-fg"
                              : "text-muted-fg hover:bg-card-2 hover:text-foreground",
                          )}
                        >
                          {l.completed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-line-strong" />
                          )}
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                          {l.durationMinutes > 0 && (
                            <span className="shrink-0 text-[10px] tabular-nums text-faint-fg">
                              {l.durationMinutes}m
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Card>
      </aside>

      {/* Main content — lesson/video first on mobile. */}
      <main className="order-1 min-w-0 space-y-5 lg:order-none">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand" size="md">
              <LessonIcon className="h-3.5 w-3.5" />
              {lesson.type}
            </Badge>
            {lesson.completed && (
              <Badge variant="success" size="md">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </Badge>
            )}
          </div>
          <h1 className="mt-3 font-display text-xl font-extrabold text-foreground">{lesson.title}</h1>

          <div className="mt-5">
            {lesson.type === "ARTICLE" || lesson.type === "RESOURCE" ? (
              <article className="whitespace-pre-wrap rounded-xl border border-line bg-card-2/50 p-5 text-[14px] leading-relaxed text-foreground">
                {lesson.articleContent ?? "No content has been added to this lesson yet."}
              </article>
            ) : lesson.type === "QUIZ" ? (
              lesson.quiz ? (
                <QuizTaker quiz={lesson.quiz} lessonCompleted={lesson.completed} />
              ) : (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
                  The teacher hasn&apos;t added questions to this quiz yet.
                </p>
              )
            ) : lesson.type === "ASSIGNMENT" ? (
              lesson.assignment ? (
                <AssignmentPanel assignment={lesson.assignment} />
              ) : (
                <p className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
                  The teacher hasn&apos;t configured this assignment yet.
                </p>
              )
            ) : (
              /* Video placeholder — real player arrives in Phase 8 */
              <div className="relative flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-brand via-blue-700 to-accent">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
                  <PlayCircle className="h-8 w-8 fill-white text-white" />
                </span>
                <Badge
                  variant="neutral"
                  size="md"
                  className="absolute bottom-4 bg-black/50 text-white border-transparent"
                >
                  Video playback arrives in Phase 8
                </Badge>
              </div>
            )}
          </div>

          {/* Actions */}
          {lesson.type !== "QUIZ" && lesson.type !== "ASSIGNMENT" && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={!prev}
                onClick={() => prev && go(prev.id)}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={markComplete} loading={pending}>
                  {lesson.completed ? "Completed ✓" : "Mark complete"}
                </Button>
                <Button
                  size="sm"
                  disabled={!next}
                  onClick={() => next && go(next.id)}
                  rightIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          {(lesson.type === "QUIZ" || lesson.type === "ASSIGNMENT") && (
            <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
              <Button
                variant="outline"
                size="sm"
                disabled={!prev}
                onClick={() => prev && go(prev.id)}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <Button
                size="sm"
                disabled={!next}
                onClick={() => next && go(next.id)}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
