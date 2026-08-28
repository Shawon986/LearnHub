"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Add/remove a course or teacher to the user's wishlist. */
export async function toggleWishlist(
  type: "COURSE" | "TEACHER",
  targetId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (type === "COURSE") {
      const course = await db.course.findUnique({ where: { id: targetId } });
      if (!course || course.status !== "PUBLISHED") return actionError("Course not found.");
      const existing = await db.wishlistItem.findFirst({
        where: { userId: user.id, type: "COURSE", courseId: targetId },
      });
      if (existing) {
        await db.wishlistItem.delete({ where: { id: existing.id } });
      } else {
        await db.wishlistItem.create({
          data: { userId: user.id, type: "COURSE", courseId: targetId },
        });
      }
    } else {
      const teacher = await db.user.findFirst({
        where: { id: targetId, role: "TEACHER" },
      });
      if (!teacher) return actionError("Teacher not found.");
      const existing = await db.wishlistItem.findFirst({
        where: { userId: user.id, type: "TEACHER", teacherId: targetId },
      });
      if (existing) {
        await db.wishlistItem.delete({ where: { id: existing.id } });
      } else {
        await db.wishlistItem.create({
          data: { userId: user.id, type: "TEACHER", teacherId: targetId },
        });
      }
    }

    revalidatePath("/dashboard/wishlist");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
