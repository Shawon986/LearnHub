"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

const progressSchema = z.object({
  positionSeconds: z.coerce.number().int().min(0),
  durationSeconds: z.coerce.number().int().min(0),
});

/** Save watch position (client throttles to ~every 5s). */
export async function saveVideoProgress(
  recordedClassId: string,
  input: { positionSeconds: number; durationSeconds: number },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = progressSchema.parse(input);

    const rc = await db.recordedClass.findUnique({ where: { id: recordedClassId } });
    if (!rc) return actionError("Recording not found.");

    const percent =
      data.durationSeconds > 0
        ? Math.min(100, Math.round((data.positionSeconds / data.durationSeconds) * 100))
        : 0;
    const completed = percent >= 95 && !(await alreadyCompleted(user.id, recordedClassId));

    await db.videoProgress.upsert({
      where: { userId_recordedClassId: { userId: user.id, recordedClassId } },
      update: {
        watchedSeconds: data.positionSeconds,
        lastPositionSeconds: data.positionSeconds,
        percentComplete: percent,
        completed: completed ? true : undefined,
        completedAt: completed ? new Date() : undefined,
      },
      create: {
        userId: user.id,
        recordedClassId,
        watchedSeconds: data.positionSeconds,
        lastPositionSeconds: data.positionSeconds,
        percentComplete: percent,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await db.recordedClass.update({
        where: { id: recordedClassId },
        data: { viewCount: { increment: 1 } },
      });
      await createNotification({
        userId: user.id,
        type: "COURSE_COMPLETED",
        title: "Recording completed 🎉",
        body: `You finished watching "${rc.title}".`,
      });
    }
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

async function alreadyCompleted(userId: string, recordedClassId: string): Promise<boolean> {
  const p = await db.videoProgress.findUnique({
    where: { userId_recordedClassId: { userId, recordedClassId } },
  });
  return p?.completed ?? false;
}

const bookmarkSchema = z.object({
  timeSeconds: z.coerce.number().int().min(0),
  label: z.string().trim().max(80).optional().nullable(),
});

export async function addBookmark(
  recordedClassId: string,
  input: { timeSeconds: number; label?: string | null },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = bookmarkSchema.parse(input);
    await db.bookmark.create({
      data: {
        userId: user.id,
        recordedClassId,
        timeSeconds: data.timeSeconds,
        label: data.label ?? null,
      },
    });
    revalidatePath(`/recorded-classes/[slug]`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteBookmark(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.bookmark.deleteMany({ where: { id, userId: user.id } });
    revalidatePath(`/recorded-classes/[slug]`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const noteSchema = z.object({
  timeSeconds: z.coerce.number().int().min(0),
  content: z.string().trim().min(2).max(2000),
});

export async function addNote(
  recordedClassId: string,
  input: { timeSeconds: number; content: string },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = noteSchema.parse(input);
    await db.videoNote.create({
      data: {
        userId: user.id,
        recordedClassId,
        timeSeconds: data.timeSeconds,
        content: data.content,
      },
    });
    revalidatePath(`/recorded-classes/[slug]`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteNote(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.videoNote.deleteMany({ where: { id, userId: user.id } });
    revalidatePath(`/recorded-classes/[slug]`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
