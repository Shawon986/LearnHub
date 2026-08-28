"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { courseReviewDecisionSchema } from "@/lib/validation/course";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Approve or reject a course submitted for review. */
export async function reviewCourse(
  courseId: string,
  input: { decision: "APPROVE" | "REJECT"; reason?: string | null },
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const data = courseReviewDecisionSchema.parse(input);
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return actionError("Course not found.");
    if (course.status !== "REVIEW") return actionError("This course is not awaiting review.");

    if (data.decision === "APPROVE") {
      await db.course.update({
        where: { id: courseId },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date(),
          approvedById: actor.id,
        },
      });
      await createNotification({
        userId: course.teacherId,
        type: "SYSTEM",
        title: "Course published! 🚀",
        body: `"${course.title}" is now live on the marketplace.`,
      });
    } else {
      await db.course.update({ where: { id: courseId }, data: { status: "DRAFT" } });
      await createNotification({
        userId: course.teacherId,
        type: "SYSTEM",
        title: "Course sent back for changes",
        body: data.reason || "The review team asked for changes before publishing.",
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `course.${data.decision.toLowerCase()}`,
      entityType: "Course",
      entityId: courseId,
      metadata: { reason: data.reason ?? null },
    });
    revalidatePath("/admin/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Unpublish or archive a live course. */
export async function setCourseStatus(
  courseId: string,
  status: "UNPUBLISHED" | "ARCHIVED",
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return actionError("Course not found.");

    await db.course.update({ where: { id: courseId }, data: { status } });
    await createNotification({
      userId: course.teacherId,
      type: "SYSTEM",
      title: `Course ${status.toLowerCase()}`,
      body: `"${course.title}" was ${status.toLowerCase()} by the admin team.`,
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `course.${status.toLowerCase()}`,
      entityType: "Course",
      entityId: courseId,
    });
    revalidatePath("/admin/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
