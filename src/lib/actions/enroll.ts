"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { safeJsonParse } from "@/lib/utils";
import { markLessonComplete } from "@/lib/progress";
import {
  assignmentSubmissionSchema,
  gradeSubmissionSchema,
  quizAnswersSchema,
} from "@/lib/validation/course";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/**
 * Enroll in a free course (price === 0).
 * Paid courses go through checkout — Phase 6.
 */
export async function enrollFree(courseId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return actionError("Course not found.");
    if (course.status !== "PUBLISHED") return actionError("This course is not available yet.");
    if (course.price > 0) return actionError("This course requires payment (checkout arrives in Phase 6).");
    if (course.teacherId === user.id) return actionError("You cannot enroll in your own course.");

    const existing = await db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (existing) return actionError("You are already enrolled in this course.");

    const enrollment = await db.enrollment.create({
      data: {
        studentId: user.id,
        courseId,
        status: "ACTIVE",
        pricePaid: 0,
      },
    });
    await db.courseProgress.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: user.id,
        courseId,
        percentComplete: 0,
      },
    });
    await db.course.update({
      where: { id: courseId },
      data: { enrollmentCount: { increment: 1 } },
    });
    await createNotification({
      userId: course.teacherId,
      type: "COURSE_PURCHASED",
      title: "New enrollment 🎉",
      body: `${user.name} enrolled in "${course.title}".`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "enrollment.create",
      entityType: "Course",
      entityId: courseId,
      metadata: { free: true },
    });
    revalidatePath(`/courses/${course.slug}`);
    revalidatePath("/dashboard/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/**
 * Mark a lesson complete (video/article/resource lessons).
 * Quiz lessons complete automatically when passed.
 */
export async function completeLesson(lessonId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
    if (!lesson) return actionError("Lesson not found.");

    await markLessonComplete(user.id, lessonId);
    revalidatePath(`/dashboard/courses/${lesson.module.courseId}/learn`);
    revalidatePath("/dashboard/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/**
 * Submit quiz answers. Scoring happens server-side only:
 * score = points earned / points possible × 100.
 */
export async function submitQuiz(
  quizId: string,
  input: { answers: { questionId: string; selectedIndex: number }[] },
): Promise<
  | { ok: true; score: number; passed: boolean; total: number; correct: number; earnedPoints: number; totalPoints: number }
  | { ok: false; error: string }
> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = quizAnswersSchema.parse(input);

    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true, lesson: { include: { module: { include: { course: true } } } } },
    });
    if (!quiz) return { ok: false, error: "Quiz not found." };
    if (quiz.questions.length === 0) return { ok: false, error: "This quiz has no questions yet." };

    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    let earnedPoints = 0;
    let totalPoints = 0;
    let correct = 0;

    for (const q of quiz.questions) totalPoints += q.points;

    for (const answer of data.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      const expected = safeJsonParse<{ index?: number }>(question.correctAnswer, {});
      if (expected.index === answer.selectedIndex) {
        earnedPoints += question.points;
        correct += 1;
      }
    }

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = score >= quiz.passingScore;

    await db.quizAttempt.create({
      data: {
        quizId,
        studentId: user.id,
        score,
        passed,
        answers: data.answers as object,
        completedAt: new Date(),
      },
    });

    // Passing a lesson-quiz completes the lesson.
    if (passed && quiz.lesson) {
      await markLessonComplete(user.id, quiz.lesson.id);
    }

    revalidatePath(`/dashboard/courses/${quiz.lesson?.module.courseId}/learn`);
    return { ok: true, score, passed, total: quiz.questions.length, correct, earnedPoints, totalPoints };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Something went wrong.",
    };
  }
}

/** Student submits an assignment. */
export async function submitAssignment(
  assignmentId: string,
  input: { content: string },
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT");
    const data = assignmentSubmissionSchema.parse(input);
    const assignment = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { select: { teacherId: true, title: true } } },
    });
    if (!assignment) return actionError("Assignment not found.");

    await db.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: user.id } },
      update: { content: data.content, status: "SUBMITTED", submittedAt: new Date() },
      create: {
        assignmentId,
        studentId: user.id,
        content: data.content,
        status: "SUBMITTED",
      },
    });
    await createNotification({
      userId: assignment.course!.teacherId,
      type: "SYSTEM",
      title: "New assignment submission",
      body: `${user.name} submitted "${assignment.title}".`,
    });
    if (assignment.courseId) {
      revalidatePath(`/dashboard/courses/${assignment.courseId}/learn`);
    }
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Teacher grades a submission. */
export async function gradeSubmission(
  submissionId: string,
  input: { score: number; feedback?: string | null },
): Promise<ActionResult> {
  try {
    const teacher = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = gradeSubmissionSchema.parse(input);
    const submission = await db.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) return actionError("Submission not found.");
    if (submission.assignment.teacherId !== teacher.id && !["ADMIN", "SUPER_ADMIN"].includes(teacher.role)) {
      return actionError("Not your assignment.");
    }

    await db.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score: data.score, feedback: data.feedback ?? null, status: "GRADED", gradedAt: new Date() },
    });
    await createNotification({
      userId: submission.studentId,
      type: "SYSTEM",
      title: "Assignment graded 📝",
      body: `"${submission.assignment.title}" — ${data.score}/${submission.assignment.maxScore}.`,
    });
    if (submission.assignment.courseId) {
      revalidatePath(`/teacher/courses/${submission.assignment.courseId}`);
    }
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
