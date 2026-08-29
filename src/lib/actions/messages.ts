"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { messagingBus } from "@/lib/messaging/bus";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

type ConversationResult = { ok: true; conversationId: string } | { ok: false; error: string };

/** Find or create a DIRECT conversation between the caller and another user. */
export async function startConversation(
  otherUserId: string,
): Promise<ConversationResult> {
  try {
    const user = await requireUser();
    if (user.id === otherUserId) return { ok: false, error: "You cannot message yourself." };
    const other = await db.user.findUnique({ where: { id: otherUserId } });
    if (!other || other.status !== "ACTIVE") return { ok: false, error: "User not found." };

    // Existing DIRECT conversation with exactly these two participants.
    const existing = await db.conversation.findFirst({
      where: {
        type: "DIRECT",
        participants: { every: { userId: { in: [user.id, otherUserId] } } },
      },
      include: { participants: true },
    });
    const conversation =
      existing && existing.participants.length === 2
        ? existing
        : await db.conversation.create({
            data: {
              type: "DIRECT",
              participants: {
                create: [{ userId: user.id }, { userId: otherUserId }],
              },
            },
          });

    revalidatePath("/messages");
    return { ok: true, conversationId: conversation.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** One-click contact with platform support (first active super admin). */
export async function startConversationWithAdmin(): Promise<ConversationResult> {
  try {
    const admin = await db.user.findFirst({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
      select: { id: true },
    });
    if (!admin) return { ok: false, error: "Support is currently unavailable." };
    return startConversation(admin.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  attachmentUrl: z.string().max(300).optional().nullable(),
  messageType: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
});

export async function sendMessage(
  conversationId: string,
  input: { content: string; attachmentUrl?: string | null; messageType?: string },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = messageSchema.parse(input);

    const participant = await db.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      include: {
        conversation: { include: { participants: { include: { user: { select: { name: true, email: true } } } } } },
      },
    });
    if (!participant) return actionError("You are not part of this conversation.");

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        type: data.messageType,
        content: data.content,
        attachmentUrl: data.attachmentUrl ?? null,
      },
    });
    await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    await db.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: user.id } },
      data: { lastReadAt: new Date() },
    });

    const event = {
      type: "message" as const,
      id: message.id,
      conversationId,
      senderId: user.id,
      senderName: user.name,
      senderAvatarUrl: user.avatarUrl,
      content: message.content,
      attachmentUrl: message.attachmentUrl,
      messageType: message.type,
      createdAt: message.createdAt.toISOString(),
    };

    // Fan out to every participant (including sender, for multi-tab sync).
    for (const p of participant.conversation.participants) {
      messagingBus.publishTo(p.userId, event);
      if (p.userId !== user.id) {
        await createNotification({
          userId: p.userId,
          type: "NEW_MESSAGE",
          title: `New message from ${user.name}`,
          body: message.type === "IMAGE" ? "📷 Sent an image" : message.content.slice(0, 120),
          data: { conversationId },
        });
      }
    }

    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function markConversationRead(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.conversationParticipant.updateMany({
      where: { conversationId, userId: user.id },
      data: { lastReadAt: new Date() },
    });
    // Tell the other party their messages are now seen (read receipts).
    const others = await db.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.id } },
      select: { userId: true },
    });
    const at = new Date().toISOString();
    for (const p of others) {
      messagingBus.publishTo(p.userId, { type: "conversation.read", conversationId, userId: user.id, at });
    }
    revalidatePath("/messages");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Ephemeral typing indicator — broadcast to the other participants. */
export async function sendTyping(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const participants = await db.conversationParticipant.findMany({
      where: { conversationId, userId: { not: user.id } },
    });
    for (const p of participants) {
      messagingBus.publishTo(p.userId, {
        type: "typing",
        conversationId,
        userId: user.id,
        userName: user.name,
      });
    }
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
