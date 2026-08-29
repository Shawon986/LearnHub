"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ClipboardList,
  FileText,
  ListChecks,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  deleteLesson,
  deleteModule,
  moveLesson,
  moveModule,
  upsertAssignment,
  upsertLesson,
  upsertModule,
  upsertQuiz,
  upsertQuestion,
  deleteQuestion,
} from "@/lib/actions/course";
import { gradeSubmission } from "@/lib/actions/enroll";

/* ---------------- Serialized types (from the server page) ---------------- */

export interface SerializedQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string | null;
}
export interface SerializedQuiz {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMinutes: number | null;
  questions: SerializedQuestion[];
}
export interface SerializedSubmission {
  id: string;
  studentName: string;
  studentAvatarUrl: string | null;
  content: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
}
export interface SerializedAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  submissions: SerializedSubmission[];
}
export interface SerializedLesson {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number;
  isPreview: boolean;
  articleContent: string | null;
  quiz: SerializedQuiz | null;
  assignment: SerializedAssignment | null;
}
export interface SerializedModule {
  id: string;
  title: string;
  description: string | null;
  lessons: SerializedLesson[];
}

const TYPE_META: Record<string, { icon: typeof BookOpen; label: string }> = {
  VIDEO: { icon: PlayCircle, label: "Video" },
  ARTICLE: { icon: FileText, label: "Article" },
  QUIZ: { icon: ListChecks, label: "Quiz" },
  ASSIGNMENT: { icon: ClipboardList, label: "Assignment" },
  LIVE: { icon: PlayCircle, label: "Live" },
  RESOURCE: { icon: FileText, label: "Resource" },
};

/* ---------------- Main editor ---------------- */

export function CurriculumEditor({
  courseId,
  editable,
  modules,
}: {
  courseId: string;
  editable: boolean;
  modules: SerializedModule[];
}) {
  const [moduleModal, setModuleModal] = useState<{ module?: SerializedModule } | null>(null);
  const [lessonModal, setLessonModal] = useState<{ moduleId: string; lesson?: SerializedLesson } | null>(null);
  const [quizModal, setQuizModal] = useState<{ lessonId: string; lesson: SerializedLesson } | null>(null);
  const [assignmentModal, setAssignmentModal] = useState<{ lessonId: string; lesson: SerializedLesson } | null>(null);
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set(modules.slice(0, 2).map((m) => m.id)),
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (success) toast({ title: success, variant: "success" });
        router.refresh();
      } else {
        toast({ title: result.error ?? "Something went wrong.", variant: "error" });
      }
    });
  }

  const toggleModule = (id: string) =>
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {modules.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-8 text-center text-[13px] text-faint-fg">
          No modules yet — add your first one to start building.
        </p>
      )}

      {modules.map((m, mi) => (
        <div key={m.id} className="overflow-hidden rounded-2xl border border-line bg-card shadow-soft">
          {/* Module header */}
          <div className="flex items-center gap-3 bg-card-2/60 px-5 py-4">
            <button
              type="button"
              onClick={() => toggleModule(m.id)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-expanded={openModules.has(m.id)}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-faint-fg transition-transform duration-200",
                  !openModules.has(m.id) && "-rotate-90",
                )}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                  Module {mi + 1}
                </p>
                <h3 className="truncate font-display text-[15px] font-bold text-foreground">{m.title}</h3>
              </div>
              <Badge variant="neutral" size="sm">
                {m.lessons.length} lessons
              </Badge>
            </button>

            {editable && (
              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label={`Move module ${m.title} up`} onClick={() => run(() => moveModule(m.id, "up"))}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={`Move module ${m.title} down`} onClick={() => run(() => moveModule(m.id, "down"))}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={`Edit module ${m.title}`} onClick={() => setModuleModal({ module: m })}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  label={`Delete module ${m.title}`}
                  danger
                  onClick={() => {
                    if (window.confirm(`Delete "${m.title}" and all its lessons? This cannot be undone.`)) {
                      run(() => deleteModule(m.id));
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            )}
          </div>

          {/* Lessons */}
          {openModules.has(m.id) && (
            <ul className="divide-y divide-line">
              {m.lessons.map((l, li) => {
                const meta = TYPE_META[l.type] ?? TYPE_META.VIDEO;
                return (
                  <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card-2 text-muted-fg">
                      <meta.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {li + 1}. {l.title}
                      </p>
                      <p className="text-[11px] text-faint-fg">
                        {meta.label}
                        {l.durationMinutes > 0 && ` · ${l.durationMinutes} min`}
                        {l.isPreview && " · Preview"}
                        {l.quiz && ` · ${l.quiz.questions.length} questions`}
                        {l.assignment && ` · ${l.assignment.submissions.length} submissions`}
                      </p>
                    </div>

                    {l.type === "QUIZ" && editable && (
                      <Button size="sm" variant="secondary" onClick={() => setQuizModal({ lessonId: l.id, lesson: l })}>
                        <ListChecks className="h-3.5 w-3.5" /> Quiz
                      </Button>
                    )}
                    {l.type === "ASSIGNMENT" && editable && (
                      <Button size="sm" variant="secondary" onClick={() => setAssignmentModal({ lessonId: l.id, lesson: l })}>
                        <ClipboardList className="h-3.5 w-3.5" /> Submissions
                        {l.assignment && l.assignment.submissions.length > 0 && (
                          <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] font-extrabold text-white">
                            {l.assignment.submissions.length}
                          </span>
                        )}
                      </Button>
                    )}

                    {editable && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <IconBtn label={`Move lesson ${l.title} up`} onClick={() => run(() => moveLesson(l.id, "up"))}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label={`Move lesson ${l.title} down`} onClick={() => run(() => moveLesson(l.id, "down"))}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          label={`Edit lesson ${l.title}`}
                          onClick={() => setLessonModal({ moduleId: m.id, lesson: l })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn
                          label={`Delete lesson ${l.title}`}
                          danger
                          onClick={() => {
                            if (window.confirm(`Delete lesson "${l.title}"?`)) {
                              run(() => deleteLesson(l.id));
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    )}
                  </li>
                );
              })}
              {m.lessons.length === 0 && (
                <li className="px-5 py-4 text-[12px] text-faint-fg">No lessons in this module yet.</li>
              )}
            </ul>
          )}

          {editable && (
            <div className="border-t border-line px-5 py-3">
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setLessonModal({ moduleId: m.id })}
              >
                Add lesson
              </Button>
            </div>
          )}
        </div>
      ))}

      {editable && (
        <Button
          variant="secondary"
          className="w-full border-dashed"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setModuleModal({})}
        >
          Add module
        </Button>
      )}

      {/* Modals */}
      {moduleModal && (
        <ModuleModal
          courseId={courseId}
          module={moduleModal.module}
          onClose={() => setModuleModal(null)}
        />
      )}
      {lessonModal && (
        <LessonModal
          moduleId={lessonModal.moduleId}
          lesson={lessonModal.lesson}
          onClose={() => setLessonModal(null)}
          onConfigured={(l) => {
            setLessonModal(null);
            if (l.type === "QUIZ") setQuizModal({ lessonId: l.id, lesson: l });
            if (l.type === "ASSIGNMENT") setAssignmentModal({ lessonId: l.id, lesson: l });
          }}
        />
      )}
      {quizModal && (
        <QuizModal
          lesson={quizModal.lesson}
          onClose={() => setQuizModal(null)}
        />
      )}
      {assignmentModal && (
        <AssignmentModal
          lesson={assignmentModal.lesson}
          onClose={() => setAssignmentModal(null)}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  label,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-card-2 hover:text-foreground",
        danger && "hover:bg-danger-soft hover:text-danger",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Module modal ---------------- */

function ModuleModal({
  courseId,
  module,
  onClose,
}: {
  courseId: string;
  module?: SerializedModule;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertModule(courseId, {
        id: module?.id,
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
      });
      if (result.ok) {
        onClose();
        router.refresh();
      } else setError(result.error ?? "Could not save module.");
    });
  }

  return (
    <Modal open onClose={onClose} title={module ? "Edit module" : "Add module"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Title" name="title" defaultValue={module?.title ?? ""} placeholder="e.g. Getting Started" required />
        <Textarea label="Description (optional)" name="description" rows={2} defaultValue={module?.description ?? ""} />
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>{module ? "Save" : "Add module"}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Lesson modal ---------------- */

function LessonModal({
  moduleId,
  lesson,
  onClose,
  onConfigured,
}: {
  moduleId: string;
  lesson?: SerializedLesson;
  onClose: () => void;
  onConfigured: (lesson: SerializedLesson & { id: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(lesson?.type ?? "VIDEO");
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertLesson(moduleId, {
        id: lesson?.id,
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        type,
        durationMinutes: Number(form.get("durationMinutes") ?? 0),
        isPreview: form.get("isPreview") === "on",
        articleContent: String(form.get("articleContent") ?? ""),
      });
      if (result.ok) {
        router.refresh();
        if (type === "QUIZ" || type === "ASSIGNMENT") {
          onConfigured({
            ...(lesson ?? { id: "", title: "", description: null, durationMinutes: 0, isPreview: false, articleContent: null, quiz: null, assignment: null }),
            id: lesson?.id ?? "",
            type,
          });
        } else {
          onClose();
        }
      } else setError(result.error ?? "Could not save lesson.");
    });
  }

  return (
    <Modal open onClose={onClose} title={lesson ? "Edit lesson" : "Add lesson"} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={Object.entries(TYPE_META).map(([value, meta]) => ({ value, label: meta.label }))}
        />
        <Input label="Title" name="title" defaultValue={lesson?.title ?? ""} required />
        <Textarea label="Description (optional)" name="description" rows={2} defaultValue={lesson?.description ?? ""} />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration (minutes)"
            name="durationMinutes"
            type="number"
            min={0}
            defaultValue={lesson?.durationMinutes ?? 0}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2 text-[13px] font-semibold text-muted-fg">
            <input
              type="checkbox"
              name="isPreview"
              defaultChecked={lesson?.isPreview ?? false}
              className="h-4 w-4 rounded border-line accent-[var(--brand)]"
            />
            Free preview
          </label>
        </div>
        {type === "ARTICLE" && (
          <Textarea
            label="Article content (markdown-friendly)"
            name="articleContent"
            rows={8}
            defaultValue={lesson?.articleContent ?? ""}
            hint="Shown to enrolled students in the lesson viewer."
          />
        )}
        {type === "QUIZ" && (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-[12px] font-semibold text-brand-fg">
            After saving, the quiz editor opens so you can add questions.
          </p>
        )}
        {type === "ASSIGNMENT" && (
          <p className="rounded-lg bg-brand-soft px-3 py-2 text-[12px] font-semibold text-brand-fg">
            After saving, the assignment editor opens for details and submissions.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={pending}>{lesson ? "Save lesson" : "Add lesson"}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Quiz modal ---------------- */

function QuizModal({ lesson, onClose }: { lesson: SerializedLesson; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<SerializedQuestion[]>(lesson.quiz?.questions ?? []);
  const [editing, setEditing] = useState<SerializedQuestion | "new" | null>(null);
  const router = useRouter();

  function saveMeta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertQuiz(lesson.id, {
        title: String(form.get("title")),
        passingScore: Number(form.get("passingScore") ?? 50),
        timeLimitMinutes: form.get("timeLimitMinutes") ? Number(form.get("timeLimitMinutes")) : null,
      });
      if (result.ok) router.refresh();
      else setError(result.error ?? "Could not save quiz.");
    });
  }

  function saveQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const options = String(form.get("options") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) {
      setError("Add at least two options (one per line).");
      return;
    }
    setError(null);
    const editingId = editing !== "new" && editing ? editing.id : undefined;
    startTransition(async () => {
      if (!lesson.quiz) {
        // Quiz row must exist before questions — create it silently first.
        await upsertQuiz(lesson.id, { title: "Quiz", passingScore: 50 });
        router.refresh();
        setError("Quiz row created — save the question again.");
        return;
      }
      const result = await upsertQuestion(lesson.quiz.id, {
        id: editingId,
        text: String(form.get("text")),
        options,
        correctIndex: Number(form.get("correctIndex") ?? 0),
        points: Number(form.get("points") ?? 1),
        explanation: String(form.get("explanation") ?? ""),
      });
      if (result.ok) {
        setQuestions((prev) => {
          if (editingId) {
            return prev.map((q) =>
              q.id === editingId
                ? { ...q, text: String(form.get("text")), options, correctIndex: Number(form.get("correctIndex") ?? 0), points: Number(form.get("points") ?? 1), explanation: String(form.get("explanation") ?? "") || null }
                : q,
            );
          }
          return [...prev, { id: `pending-${Date.now()}`, text: String(form.get("text")), options, correctIndex: Number(form.get("correctIndex") ?? 0), points: Number(form.get("points") ?? 1), explanation: String(form.get("explanation") ?? "") || null }];
        });
        setEditing(null);
        router.refresh();
      } else setError(result.error ?? "Could not save question.");
    });
  }

  return (
    <Modal open onClose={onClose} title="Quiz editor" size="lg">
      <div className="space-y-6">
        <form onSubmit={saveMeta} className="space-y-4 rounded-xl border border-line bg-card-2/50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-faint-fg">Quiz settings</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Quiz title" name="title" defaultValue={lesson.quiz?.title ?? "Quiz"} required />
            <Input label="Passing score (%)" name="passingScore" type="number" min={0} max={100} defaultValue={lesson.quiz?.passingScore ?? 50} />
            <Input label="Time limit (min, optional)" name="timeLimitMinutes" type="number" min={1} defaultValue={lesson.quiz?.timeLimitMinutes ?? ""} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary" loading={pending}>Save settings</Button>
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wide text-faint-fg">
              Questions ({questions.length})
            </p>
            <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setEditing("new")}>
              Add question
            </Button>
          </div>

          {questions.length === 0 && (
            <p className="rounded-xl border border-dashed border-line p-5 text-center text-[12px] text-faint-fg">
              No questions yet — students need at least one to take the quiz.
            </p>
          )}

          {questions.map((q, i) => (
            <div key={q.id} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground">
                  {i + 1}. {q.text}
                </p>
                <p className="mt-1 text-[11px] text-faint-fg">
                  {q.options.length} options · answer #{q.correctIndex + 1} · {q.points} pt
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconBtn label="Edit question" onClick={() => setEditing(q)}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  label="Delete question"
                  danger
                  onClick={() => {
                    if (window.confirm("Delete this question?")) {
                      startTransition(async () => {
                        await deleteQuestion(q.id);
                        setQuestions((prev) => prev.filter((x) => x.id !== q.id));
                        router.refresh();
                      });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}

        {editing !== null && (
          <QuestionForm
            key={editing === "new" ? "new" : editing.id}
            question={editing === "new" ? null : editing}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSubmit={saveQuestion}
          />
        )}
      </div>
    </Modal>
  );
}

function QuestionForm({
  question,
  pending,
  onCancel,
  onSubmit,
}: {
  question: SerializedQuestion | null;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const options = question?.options.join("\n") ?? "";
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-brand/30 bg-brand-soft/30 p-4">
      <p className="text-xs font-extrabold uppercase tracking-wide text-brand-fg">
        {question ? "Edit question" : "New question"}
      </p>
      <Textarea label="Question" name="text" rows={2} defaultValue={question?.text ?? ""} required />
      <Textarea
        label="Options (one per line — first is option 1)"
        name="options"
        rows={4}
        defaultValue={options}
        hint="2–6 options. Mark the correct one below."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Correct option #" name="correctIndex" type="number" min={1} max={6} defaultValue={question ? question.correctIndex + 1 : 1} />
        <Input label="Points" name="points" type="number" min={1} defaultValue={question?.points ?? 1} />
        <Input label="Explanation (optional)" name="explanation" defaultValue={question?.explanation ?? ""} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={pending}>{question ? "Save question" : "Add question"}</Button>
      </div>
    </form>
  );
}

/* ---------------- Assignment modal ---------------- */

function AssignmentModal({ lesson, onClose }: { lesson: SerializedLesson; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const assignment = lesson.assignment;

  function saveMeta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertAssignment(lesson.id, {
        title: String(form.get("title")),
        description: String(form.get("description") ?? ""),
        dueDate: String(form.get("dueDate") ?? "") || null,
        maxScore: Number(form.get("maxScore") ?? 100),
      });
      if (result.ok) router.refresh();
      else setError(result.error ?? "Could not save assignment.");
    });
  }

  return (
    <Modal open onClose={onClose} title="Assignment" size="lg">
      <div className="space-y-6">
        <form onSubmit={saveMeta} className="space-y-4 rounded-xl border border-line bg-card-2/50 p-4">
          <p className="text-xs font-extrabold uppercase tracking-wide text-faint-fg">Assignment settings</p>
          <Input label="Title" name="title" defaultValue={assignment?.title ?? ""} required />
          <Textarea label="Instructions" name="description" rows={3} defaultValue={assignment?.description ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due date (optional)" name="dueDate" type="date" defaultValue={assignment?.dueDate ?? ""} />
            <Input label="Max score" name="maxScore" type="number" min={1} defaultValue={assignment?.maxScore ?? 100} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary" loading={pending}>Save settings</Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wide text-faint-fg">
            Submissions ({assignment?.submissions.length ?? 0})
          </p>
          {(assignment?.submissions.length ?? 0) === 0 && (
            <p className="rounded-xl border border-dashed border-line p-5 text-center text-[12px] text-faint-fg">
              No submissions yet.
            </p>
          )}
          {assignment?.submissions.map((s) => (
            <SubmissionCard key={s.id} submission={s} maxScore={assignment.maxScore} />
          ))}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function SubmissionCard({ submission, maxScore }: { submission: SerializedSubmission; maxScore: number }) {
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-3">
        <Avatar name={submission.studentName} src={submission.studentAvatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-foreground">{submission.studentName}</p>
          <Badge variant={submission.status === "GRADED" ? "success" : "brand"} size="sm">
            {submission.status}
          </Badge>
        </div>
      </div>
      {submission.content && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg bg-card-2 p-3 text-[13px] leading-relaxed text-muted-fg">
          {submission.content}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="w-28">
          <Input label={`Score / ${maxScore}`} type="number" min={0} max={maxScore} value={score} onChange={(e) => setScore(e.target.value)} />
        </div>
        <div className="min-w-40 flex-1">
          <Input label="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, what to improve…" />
        </div>
        <Button
          size="sm"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await gradeSubmission(submission.id, {
                score: Number(score),
                feedback: feedback || null,
              });
              if (result.ok) {
                toast({ title: "Submission graded", variant: "success" });
                router.refresh();
              } else {
                toast({ title: result.error ?? "Could not grade.", variant: "error" });
              }
            })
          }
        >
          Grade
        </Button>
      </div>
    </div>
  );
}
