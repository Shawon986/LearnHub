"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { classroomBus, type StrokeData } from "@/lib/live/bus";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** The caller is a participant (or the host) of the class. */
async function requireMember(liveClassId: string, userId: string) {
  const live = await db.liveClass.findUnique({
    where: { id: liveClassId },
    include: {
      participants: { where: { userId } },
      teacher: { select: { name: true, id: true } },
    },
  });
  if (!live) throw new Error("Class not found.");
  const isHost = live.teacherId === userId;
  const isAdmin = (await db.user.findUnique({ where: { id: userId } }))?.role === "ADMIN";
  if (!isHost && live.participants.length === 0 && !isAdmin) {
    throw new Error("You are not part of this class.");
  }
  return { live, isHost: isHost || isAdmin };
}

/* ---------------- Lifecycle ---------------- */

export async function startLiveClass(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const live = await db.liveClass.findUnique({ where: { id: liveClassId } });
    if (!live || live.teacherId !== user.id) return actionError("Class not found.");
    if (live.status !== "SCHEDULED") return actionError("This class has already started or ended.");

    await db.liveClass.update({ where: { id: liveClassId }, data: { status: "LIVE" } });
    classroomBus.publish(liveClassId, { type: "class.started", at: new Date().toISOString() });

    const participants = await db.liveClassParticipant.findMany({
      where: { liveClassId },
      select: { userId: true },
    });
    await createNotificationMany(participants.map((p) => p.userId), {
      type: "LIVE_CLASS_STARTING",
      title: "Live class starting now! 🔴",
      body: `"${live.title}" is live — join the classroom.`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.start",
      entityType: "LiveClass",
      entityId: liveClassId,
    });
    revalidatePath("/teacher/live-classes");
    revalidatePath("/dashboard/live");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function endLiveClass(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const live = await db.liveClass.findUnique({ where: { id: liveClassId } });
    if (!live || live.teacherId !== user.id) return actionError("Class not found.");
    if (live.status !== "LIVE") return actionError("This class is not live.");

    // Attendance rollup: joined → PRESENT (LATE if >15 min after start),
    // registered but never joined → ABSENT.
    const lateCutoff = new Date(live.startsAt.getTime() + 15 * 60_000);
    const participants = await db.liveClassParticipant.findMany({ where: { liveClassId } });
    for (const p of participants) {
      let status: string;
      if (p.joinedAt) status = p.joinedAt > lateCutoff ? "LATE" : "PRESENT";
      else status = "ABSENT";
      await db.liveClassParticipant.update({
        where: { id: p.id },
        data: { attendanceStatus: status, leftAt: p.leftAt ?? new Date() },
      });
    }

    await db.liveClass.update({ where: { id: liveClassId }, data: { status: "ENDED" } });

    // Recording: with a video provider configured, capture is handled by the
    // provider (Phase 8 wiring); the row tracks status here.
    if (live.recordingEnabled) {
      await db.liveClassRecording.upsert({
        where: { liveClassId },
        update: { status: "PROCESSING", durationSeconds: Math.round((Date.now() - live.startsAt.getTime()) / 1000) },
        create: { liveClassId, status: "PROCESSING", durationSeconds: 0 },
      });
    }

    classroomBus.publish(liveClassId, { type: "class.ended", at: new Date().toISOString() });
    classroomBus.clearClassroom(liveClassId);

    await createNotificationMany(participants.map((p) => p.userId), {
      type: "SYSTEM",
      title: "Class ended",
      body: `"${live.title}" has ended. Thank you for attending!`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.end",
      entityType: "LiveClass",
      entityId: liveClassId,
    });
    revalidatePath("/teacher/live-classes");
    revalidatePath("/dashboard/live");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function joinClassroom(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const live = await db.liveClass.findUnique({ where: { id: liveClassId } });
    if (!live) return actionError("Class not found.");
    if (live.status === "CANCELLED" || live.status === "ENDED") {
      return actionError("This class has ended.");
    }

    const isHost = live.teacherId === user.id;
    let participant = isHost
      ? null
      : await db.liveClassParticipant.findUnique({
          where: { liveClassId_userId: { liveClassId, userId: user.id } },
        });
    if (!isHost && !participant) {
      return actionError("Register for this class first.");
    }

    if (participant && !participant.joinedAt) {
      participant = await db.liveClassParticipant.update({
        where: { id: participant.id },
        data: { joinedAt: new Date() },
      });
    }
    classroomBus.publish(liveClassId, {
      type: "presence",
      userId: user.id,
      userName: user.name,
      role: isHost ? "HOST" : "STUDENT",
      status: "joined",
      at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function leaveClassroom(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const participant = await db.liveClassParticipant.findUnique({
      where: { liveClassId_userId: { liveClassId, userId: user.id } },
    });
    if (participant && !participant.leftAt) {
      await db.liveClassParticipant.update({
        where: { id: participant.id },
        data: { leftAt: new Date() },
      });
    }
    classroomBus.publish(liveClassId, {
      type: "presence",
      userId: user.id,
      userName: user.name,
      role: participant?.role ?? "STUDENT",
      status: "left",
      at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- In-class events ---------------- */

const chatSchema = z.object({ content: z.string().trim().min(1).max(500) });

export async function sendChatMessage(
  liveClassId: string,
  content: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    const { live, isHost } = await requireMember(liveClassId, user.id);
    const data = chatSchema.parse({ content });

    if (live.chatLocked && !isHost) {
      return actionError("Chat is locked by the host.");
    }

    classroomBus.publish(liveClassId, {
      type: "chat",
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      userId: user.id,
      userName: user.name,
      content: data.content,
      at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function raiseHand(liveClassId: string, raised: boolean): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    await requireMember(liveClassId, user.id);
    classroomBus.publish(liveClassId, {
      type: "hand",
      userId: user.id,
      userName: user.name,
      raised,
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const REACTIONS = ["👍", "❤️", "🎉", "👏", "😮", "😂"];

export async function sendReaction(liveClassId: string, emoji: string): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    await requireMember(liveClassId, user.id);
    if (!REACTIONS.includes(emoji)) return actionError("Unknown reaction.");
    classroomBus.publish(liveClassId, {
      type: "reaction",
      userId: user.id,
      userName: user.name,
      emoji,
      at: new Date().toISOString(),
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const pollSchema = z.object({
  question: z.string().trim().min(2).max(300),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(6),
});

export async function createPoll(
  liveClassId: string,
  input: { question: string; options: string[] },
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can create polls.");
    const data = pollSchema.parse(input);

    classroomBus.createPoll(liveClassId, {
      id: `poll-${Date.now().toString(36)}`,
      question: data.question,
      options: data.options,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      open: true,
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function votePoll(
  liveClassId: string,
  pollId: string,
  optionIndex: number,
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    await requireMember(liveClassId, user.id);
    const result = classroomBus.votePoll(liveClassId, pollId, user.id, optionIndex);
    if (!result) return actionError("Poll not found or closed.");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function closePoll(liveClassId: string, pollId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can close polls.");
    const result = classroomBus.closePoll(liveClassId, pollId);
    if (!result) return actionError("Poll not found.");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Recording ---------------- */

export async function toggleRecording(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can control recording.");
    // The recording state event drives the UI; actual capture is handled by
    // the video provider (dev provider = no capture, documented).
    classroomBus.publish(liveClassId, { type: "recording", status: "recording" });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Moderation ---------------- */

export async function toggleChatLock(liveClassId: string, locked: boolean): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can lock chat.");
    await db.liveClass.update({ where: { id: liveClassId }, data: { chatLocked: locked } });
    classroomBus.publish(liveClassId, { type: "chat.lock", locked });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function setParticipantMuted(
  liveClassId: string,
  targetUserId: string,
  muted: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can manage participants.");
    await db.liveClassParticipant.update({
      where: { liveClassId_userId: { liveClassId, userId: targetUserId } },
      data: { muted },
    });
    classroomBus.publish(liveClassId, { type: "participant.muted", userId: targetUserId, muted });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function removeParticipant(
  liveClassId: string,
  targetUserId: string,
): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can remove participants.");
    await db.liveClassParticipant.delete({
      where: { liveClassId_userId: { liveClassId, userId: targetUserId } },
    });
    classroomBus.publish(liveClassId, { type: "participant.removed", userId: targetUserId });
    await createNotification({
      userId: targetUserId,
      type: "SYSTEM",
      title: "Removed from class",
      body: "The host removed you from the live classroom.",
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/* ---------------- Whiteboard ---------------- */

const strokeSchema = z.object({
  id: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().min(1).max(30),
  points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).min(2).max(2000),
});

export async function whiteboardStroke(
  liveClassId: string,
  stroke: StrokeData,
): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT", "TEACHER", "ADMIN", "SUPER_ADMIN");
    await requireMember(liveClassId, user.id);
    const data = strokeSchema.parse(stroke);
    classroomBus.addStroke(liveClassId, { ...data, userId: user.id, userName: user.name });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function whiteboardClear(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const { isHost } = await requireMember(liveClassId, user.id);
    if (!isHost) return actionError("Only the host can clear the whiteboard.");
    classroomBus.clearStrokes(liveClassId);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
