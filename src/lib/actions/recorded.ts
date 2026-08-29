"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { splitList } from "@/lib/validation/course";
import { recordedClassSchema } from "@/lib/validation/recorded";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Create a recorded class around an uploaded Video asset. */
export async function createRecordedClass(input: {
  title: string;
  description?: string | null;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  videoId: string;
  thumbnailPath?: string | null;
  language?: string;
  tags?: string | null;
  durationSeconds?: number;
  resources?: { title: string; type: string; path: string }[];
}): Promise<ActionResult & { id?: string; slug?: string }> {
  try {
    const actor = await requireAdmin();
    const data = recordedClassSchema.parse(input);

    const video = await db.video.findUnique({ where: { id: data.videoId } });
    if (!video) return actionError("Video not found.");

    let slug = slugify(data.title);
    const clash = await db.recordedClass.findUnique({ where: { slug } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const recorded = await db.recordedClass.create({
      data: {
        title: data.title,
        slug,
        description: data.description ?? null,
        courseId: data.courseId ?? null,
        moduleId: data.moduleId ?? null,
        lessonId: data.lessonId ?? null,
        videoId: data.videoId,
        thumbnailUrl: data.thumbnailPath ?? null,
        status: video.status === "READY" ? "READY" : "PROCESSING",
        durationSeconds: data.durationSeconds,
        language: data.language,
        tags: splitList(data.tags),
        uploadedById: actor.id,
      },
    });

    for (const r of data.resources) {
      await db.resource.create({
        data: {
          recordedClassId: recorded.id,
          title: r.title,
          type: r.type,
          url: r.path,
          uploadedById: actor.id,
        },
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.create",
      entityType: "RecordedClass",
      entityId: recorded.id,
      metadata: { title: data.title },
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true, id: recorded.id, slug: recorded.slug };
  } catch (e) {
    return err(e);
  }
}

/** Publish a READY recorded class. */
export async function publishRecordedClass(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id }, include: { video: true } });
    if (!rc) return actionError("Recording not found.");
    if (rc.video.status !== "READY") return actionError("The video is not ready yet.");
    if (!["DRAFT", "READY"].includes(rc.status)) return actionError("This recording cannot be published.");

    await db.recordedClass.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.publish",
      entityType: "RecordedClass",
      entityId: id,
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function unpublishRecordedClass(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id } });
    if (!rc) return actionError("Recording not found.");
    if (rc.status !== "PUBLISHED") return actionError("This recording is not published.");

    await db.recordedClass.update({ where: { id }, data: { status: "READY" } });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.unpublish",
      entityType: "RecordedClass",
      entityId: id,
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function archiveRecordedClass(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id } });
    if (!rc) return actionError("Recording not found.");

    await db.recordedClass.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.archive",
      entityType: "RecordedClass",
      entityId: id,
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Edit metadata + course linking (any non-published state; published needs unpublish first). */
export async function updateRecordedClass(
  id: string,
  input: {
    title: string;
    description?: string | null;
    courseId?: string | null;
    language?: string;
    tags?: string | null;
    durationSeconds?: number;
  },
): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id } });
    if (!rc) return actionError("Recording not found.");

    let slug = slugify(input.title);
    const clash = await db.recordedClass.findFirst({ where: { slug, id: { not: id } } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    await db.recordedClass.update({
      where: { id },
      data: {
        title: input.title,
        slug: rc.status === "PUBLISHED" ? rc.slug : slug, // keep the public URL stable once live
        description: input.description ?? null,
        courseId: input.courseId ?? null,
        moduleId: null,
        lessonId: null,
        language: input.language ?? "English",
        tags: splitList(input.tags),
        durationSeconds: input.durationSeconds ?? rc.durationSeconds,
      },
    });

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.update",
      entityType: "RecordedClass",
      entityId: id,
      metadata: { title: input.title },
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Restore an archived recording back to a publishable state. */
export async function restoreRecordedClass(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id } });
    if (!rc) return actionError("Recording not found.");
    if (rc.status !== "ARCHIVED") return actionError("Only archived recordings can be restored.");

    await db.recordedClass.update({
      where: { id },
      data: { status: "READY", archivedAt: null },
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.restore",
      entityType: "RecordedClass",
      entityId: id,
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Delete a draft (used by the retry flow — re-upload replaces it). */
export async function deleteRecordedClass(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAdmin();
    const rc = await db.recordedClass.findUnique({ where: { id } });
    if (!rc) return actionError("Recording not found.");
    if (rc.status === "PUBLISHED") return actionError("Unpublish before deleting.");

    await db.recordedClass.delete({ where: { id } });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "recordedClass.delete",
      entityType: "RecordedClass",
      entityId: id,
    });
    revalidatePath("/admin/recorded-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
