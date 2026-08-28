"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotificationMany } from "@/lib/notifications";
import { splitList } from "@/lib/validation/course";
import {
  assignmentSchema,
  courseUpdateSchema,
  lessonSchema,
  moduleSchema,
  questionSchema,
  quizSchema,
} from "@/lib/validation/course";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Owner check: the course must belong to the caller. */
async function ownCourse(courseId: string, userId: string) {
  const course = await db.course.findFirst({ where: { id: courseId, teacherId: userId } });
  if (!course) throw new Error("Course not found.");
  return course;
}

/** Editable while drafting, under review, or unpublished. */
function assertEditable(status: string) {
  if (!["DRAFT", "REVIEW", "UNPUBLISHED"].includes(status)) {
    throw new Error("Published courses can't be edited — ask an admin to unpublish first.");
  }
}

/** Recompute cached lesson count + duration. */
async function recalcCourse(courseId: string) {
  const [totalLessons, duration] = await Promise.all([
    db.lesson.count({ where: { module: { courseId } } }),
    db.lesson.aggregate({
      where: { module: { courseId } },
      _sum: { durationMinutes: true },
    }),
  ]);
  await db.course.update({
    where: { id: courseId },
    data: {
      totalLessons,
      totalDurationMinutes: duration._sum.durationMinutes ?? 0,
    },
  });
}

/* ---------------- Course meta ---------------- */

export async function updateCourse(
  courseId: string,
  input: {
    title: string;
    subtitle?: string | null;
    description?: string | null;
    categoryId: string;
    type: string;
    difficulty: string;
    price: number;
    compareAtPrice?: number | null;
    language: string;
    requirements?: string | null;
    outcomes?: string | null;
    tags?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const course = await ownCourse(courseId, user.id);
    assertEditable(course.status);
    const data = courseUpdateSchema.parse(input);

    await db.course.update({
      where: { id: courseId },
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        categoryId: data.categoryId,
        type: data.type,
        difficulty: data.difficulty,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        language: data.language,
        requirements: splitList(data.requirements),
        outcomes: splitList(data.outcomes),
        tags: splitList(data.tags),
      },
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "course.update",
      entityType: "Course",
      entityId: courseId,
    });
    revalidatePath(`/teacher/courses/${courseId}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function submitCourseForReview(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const course = await ownCourse(courseId, user.id);
    if (!["DRAFT", "UNPUBLISHED"].includes(course.status)) {
      return actionError("This course cannot be submitted for review right now.");
    }
    const [modules, lessons] = await Promise.all([
      db.courseModule.count({ where: { courseId } }),
      db.lesson.count({ where: { module: { courseId } } }),
    ]);
    if (modules === 0 || lessons === 0) {
      return actionError("Add at least one module and one lesson before submitting.");
    }

    await db.course.update({ where: { id: courseId }, data: { status: "REVIEW" } });

    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    });
    await createNotificationMany(admins.map((a) => a.id), {
      type: "SYSTEM",
      title: "Course submitted for review",
      body: `"${course.title}" by ${user.name} is waiting for approval.`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "course.submitReview",
      entityType: "Course",
      entityId: courseId,
    });
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath("/teacher/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Modules ---------------- */

export async function upsertModule(
  courseId: string,
  input: { id?: string; title: string; description?: string | null },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const course = await ownCourse(courseId, user.id);
    assertEditable(course.status);
    const data = moduleSchema.parse(input);

    if (data.id) {
      const owned = await db.courseModule.findFirst({ where: { id: data.id, courseId } });
      if (!owned) return actionError("Module not found.");
      await db.courseModule.update({
        where: { id: data.id },
        data: { title: data.title, description: data.description ?? null },
      });
    } else {
      const last = await db.courseModule.findFirst({
        where: { courseId },
        orderBy: { sortOrder: "desc" },
      });
      await db.courseModule.create({
        data: {
          courseId,
          title: data.title,
          description: data.description ?? null,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    }
    revalidatePath(`/teacher/courses/${courseId}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteModule(moduleId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const mod = await db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) return actionError("Module not found.");
    const course = await ownCourse(mod.courseId, user.id);
    assertEditable(course.status);

    await db.courseModule.delete({ where: { id: moduleId } });
    await recalcCourse(course.id);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function moveModule(moduleId: string, dir: "up" | "down"): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const mod = await db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) return actionError("Module not found.");
    const course = await ownCourse(mod.courseId, user.id);
    assertEditable(course.status);

    const siblings = await db.courseModule.findMany({
      where: { courseId: mod.courseId },
      orderBy: { sortOrder: "asc" },
    });
    const idx = siblings.findIndex((m) => m.id === moduleId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return { ok: true };

    const swap = siblings[swapIdx];
    await db.$transaction([
      db.courseModule.update({ where: { id: mod.id }, data: { sortOrder: swap.sortOrder } }),
      db.courseModule.update({ where: { id: swap.id }, data: { sortOrder: mod.sortOrder } }),
    ]);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Lessons ---------------- */

export async function upsertLesson(
  moduleId: string,
  input: {
    id?: string;
    title: string;
    description?: string | null;
    type: string;
    durationMinutes: number;
    isPreview: boolean;
    articleContent?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const mod = await db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) return actionError("Module not found.");
    const course = await ownCourse(mod.courseId, user.id);
    assertEditable(course.status);
    const data = lessonSchema.parse(input);

    if (data.id) {
      const owned = await db.lesson.findFirst({ where: { id: data.id, moduleId } });
      if (!owned) return actionError("Lesson not found.");
      await db.lesson.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          durationMinutes: data.durationMinutes,
          isPreview: data.isPreview,
          articleContent: data.type === "ARTICLE" ? data.articleContent ?? null : null,
        },
      });
    } else {
      const last = await db.lesson.findFirst({
        where: { moduleId },
        orderBy: { sortOrder: "desc" },
      });
      await db.lesson.create({
        data: {
          moduleId,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          durationMinutes: data.durationMinutes,
          isPreview: data.isPreview,
          articleContent: data.type === "ARTICLE" ? data.articleContent ?? null : null,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    }
    await recalcCourse(course.id);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteLesson(lessonId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson) return actionError("Lesson not found.");
    const course = await ownCourse(lesson.module.courseId, user.id);
    assertEditable(course.status);

    await db.lesson.delete({ where: { id: lessonId } });
    await recalcCourse(course.id);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function moveLesson(lessonId: string, dir: "up" | "down"): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson) return actionError("Lesson not found.");
    const course = await ownCourse(lesson.module.courseId, user.id);
    assertEditable(course.status);

    const siblings = await db.lesson.findMany({
      where: { moduleId: lesson.moduleId },
      orderBy: { sortOrder: "asc" },
    });
    const idx = siblings.findIndex((l) => l.id === lessonId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return { ok: true };

    const swap = siblings[swapIdx];
    await db.$transaction([
      db.lesson.update({ where: { id: lesson.id }, data: { sortOrder: swap.sortOrder } }),
      db.lesson.update({ where: { id: swap.id }, data: { sortOrder: lesson.sortOrder } }),
    ]);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Quizzes ---------------- */

export async function upsertQuiz(
  lessonId: string,
  input: { title: string; passingScore: number; timeLimitMinutes?: number | null },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true, quiz: true } });
    if (!lesson) return actionError("Lesson not found.");
    const course = await ownCourse(lesson.module.courseId, user.id);
    assertEditable(course.status);
    const data = quizSchema.parse(input);

    await db.$transaction([
      db.lesson.update({ where: { id: lessonId }, data: { type: "QUIZ" } }),
      db.quiz.upsert({
        where: { lessonId },
        update: {
          title: data.title,
          passingScore: data.passingScore,
          timeLimitMinutes: data.timeLimitMinutes ?? null,
        },
        create: {
          lessonId,
          courseId: course.id,
          title: data.title,
          passingScore: data.passingScore,
          timeLimitMinutes: data.timeLimitMinutes ?? null,
        },
      }),
    ]);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function upsertQuestion(
  quizId: string,
  input: {
    id?: string;
    text: string;
    options: string[];
    correctIndex: number;
    points: number;
    explanation?: string | null;
  },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const quiz = await db.quiz.findUnique({ where: { id: quizId }, include: { lesson: { include: { module: true } } } });
    if (!quiz || !quiz.lesson) return actionError("Quiz not found.");
    const course = await ownCourse(quiz.lesson.module.courseId, user.id);
    assertEditable(course.status);
    const data = questionSchema.parse(input);
    if (data.correctIndex >= data.options.length) return actionError("Correct answer index is out of range.");

    if (data.id) {
      await db.question.update({
        where: { id: data.id },
        data: {
          text: data.text,
          options: data.options,
          correctAnswer: { index: data.correctIndex },
          points: data.points,
          explanation: data.explanation ?? null,
        },
      });
    } else {
      const last = await db.question.findFirst({ where: { quizId }, orderBy: { sortOrder: "desc" } });
      await db.question.create({
        data: {
          quizId,
          text: data.text,
          options: data.options,
          correctAnswer: { index: data.correctIndex },
          points: data.points,
          explanation: data.explanation ?? null,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });
    }
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: { quiz: { include: { lesson: { include: { module: true } } } } },
    });
    if (!question || !question.quiz.lesson) return actionError("Question not found.");
    const course = await ownCourse(question.quiz.lesson.module.courseId, user.id);
    assertEditable(course.status);

    await db.question.delete({ where: { id: questionId } });
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Assignments ---------------- */

export async function upsertAssignment(
  lessonId: string,
  input: { title: string; description?: string | null; dueDate?: string | null; maxScore: number },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson) return actionError("Lesson not found.");
    const course = await ownCourse(lesson.module.courseId, user.id);
    assertEditable(course.status);
    const data = assignmentSchema.parse(input);

    const existing = await db.assignment.findFirst({ where: { lessonId } });
    await db.$transaction([
      db.lesson.update({ where: { id: lessonId }, data: { type: "ASSIGNMENT" } }),
      existing
        ? db.assignment.update({
            where: { id: existing.id },
            data: {
              title: data.title,
              description: data.description ?? null,
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              maxScore: data.maxScore,
            },
          })
        : db.assignment.create({
            data: {
              lessonId,
              courseId: course.id,
              teacherId: user.id,
              title: data.title,
              description: data.description ?? null,
              dueDate: data.dueDate ? new Date(data.dueDate) : null,
              maxScore: data.maxScore,
            },
          }),
    ]);
    revalidatePath(`/teacher/courses/${course.id}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
