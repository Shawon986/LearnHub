"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { reportSchema, reviewSchema } from "@/lib/validation/discovery";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Recompute a course's cached rating aggregates. */
async function recalcCourseRating(courseId: string) {
  const agg = await db.review.aggregate({
    where: { courseId, status: "PUBLISHED", targetType: "COURSE" },
    _avg: { rating: true },
    _count: true,
  });
  await db.course.update({
    where: { id: courseId },
    data: {
      avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });
}

/** Write or update a course review. Enrollment required (verified purchase). */
export async function writeCourseReview(
  courseId: string,
  input: { rating: number; content: string },
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = reviewSchema.parse(input);

    const enrollment = await db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.id, courseId } },
    });
    if (!enrollment) {
      return actionError("Only enrolled students can review this course.");
    }

    const existing = await db.review.findFirst({
      where: { reviewerId: user.id, courseId, targetType: "COURSE" },
    });
    if (existing) {
      await db.review.update({
        where: { id: existing.id },
        data: { rating: data.rating, content: data.content },
      });
    } else {
      await db.review.create({
        data: {
          reviewerId: user.id,
          rating: data.rating,
          content: data.content,
          targetType: "COURSE",
          courseId,
          verifiedPurchase: true,
          status: "PUBLISHED",
        },
      });
    }

    await recalcCourseRating(courseId);
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (course) {
      await createNotification({
        userId: course.teacherId,
        type: "NEW_REVIEW",
        title: "New course review ⭐",
        body: `${user.name} rated "${course.title}" ${data.rating}/5.`,
      });
    }
    revalidatePath("/dashboard/reviews");
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Write or update a teacher review. Requires a completed booking or enrollment in their course. */
export async function writeTeacherReview(
  teacherId: string,
  input: { rating: number; content: string },
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    if (user.id === teacherId) return actionError("You cannot review yourself.");
    const data = reviewSchema.parse(input);

    const teacher = await db.user.findFirst({ where: { id: teacherId, role: "TEACHER" } });
    if (!teacher) return actionError("Teacher not found.");

    const [booking, enrollment] = await Promise.all([
      db.booking.findFirst({ where: { studentId: user.id, teacherId } }),
      db.enrollment.findFirst({ where: { studentId: user.id, course: { teacherId } } }),
    ]);
    if (!booking && !enrollment) {
      return actionError("Book a session or enroll in this teacher's course to leave a review.");
    }

    const existing = await db.review.findFirst({
      where: { reviewerId: user.id, teacherId, targetType: "TEACHER" },
    });
    if (existing) {
      await db.review.update({
        where: { id: existing.id },
        data: { rating: data.rating, content: data.content },
      });
    } else {
      await db.review.create({
        data: {
          reviewerId: user.id,
          rating: data.rating,
          content: data.content,
          targetType: "TEACHER",
          teacherId,
          verifiedPurchase: Boolean(booking || enrollment),
          status: "PUBLISHED",
        },
      });
    }

    await createNotification({
      userId: teacherId,
      type: "NEW_REVIEW",
      title: "New review on your profile ⭐",
      body: `${user.name} rated you ${data.rating}/5.`,
    });
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Delete your own review (admins delete via moderation). */
export async function deleteReview(reviewId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) return actionError("Review not found.");
    if (review.reviewerId !== user.id && !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return actionError("Not your review.");
    }

    await db.review.delete({ where: { id: reviewId } });
    if (review.courseId) await recalcCourseRating(review.courseId);
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Flag a review — after 3 reports it's hidden pending admin review. */
export async function reportReview(
  reviewId: string,
  input: { reason: string },
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const data = reportSchema.parse(input);

    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) return actionError("Review not found.");

    const updated = await db.review.update({
      where: { id: reviewId },
      data: { reportCount: { increment: 1 } },
    });
    const newCount = updated.reportCount + 1;

    if (newCount >= 3) {
      await db.review.update({ where: { id: reviewId }, data: { status: "FLAGGED" } });
      const admins = await db.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { id: true },
      });
      await createNotificationMany(admins.map((a) => a.id), {
        type: "SYSTEM",
        title: "Review flagged for moderation",
        body: `A review received ${newCount} reports (reason: ${data.reason}).`,
      });
    }
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "review.report",
      entityType: "Review",
      entityId: reviewId,
      metadata: { reason: data.reason },
    });
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
