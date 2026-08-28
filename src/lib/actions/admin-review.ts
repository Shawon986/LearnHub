"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Remove (hide) or restore a published/flagged review. */
export async function moderateReview(
  reviewId: string,
  action: "REMOVE" | "RESTORE",
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) return actionError("Review not found.");

    const status = action === "REMOVE" ? "REMOVED" : "PUBLISHED";
    await db.review.update({
      where: { id: reviewId },
      data: { status, reportCount: action === "RESTORE" ? 0 : review.reportCount },
    });

    if (review.courseId) {
      const agg = await db.review.aggregate({
        where: { courseId: review.courseId, status: "PUBLISHED", targetType: "COURSE" },
        _avg: { rating: true },
        _count: true,
      });
      await db.course.update({
        where: { id: review.courseId },
        data: {
          avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count,
        },
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `review.${action.toLowerCase()}`,
      entityType: "Review",
      entityId: reviewId,
    });
    revalidatePath("/admin/reviews");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
