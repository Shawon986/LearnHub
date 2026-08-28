import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MessagingClient, type ConversationData, type ThreadData } from "../messaging-client";

export const metadata: Metadata = { title: "Messages" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const member = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!member) notFound();

  const [conversation, conversations] = await Promise.all([
    db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
      },
    }),
    db.conversation.findMany({
      where: { participants: { some: { userId: user.id } } },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!conversation) notFound();

  const other = conversation.participants.find((p) => p.userId !== user.id);

  const thread: ThreadData = {
    conversationId: conversation.id,
    otherName: other?.user.name ?? "Conversation",
    otherAvatarUrl: other?.user.avatarUrl ?? null,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      type: m.type,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  const list: ConversationData[] = conversations.map((c) => {
    const otherP = c.participants.find((p) => p.userId !== user.id);
    const me = c.participants.find((p) => p.userId === user.id);
    const last = c.messages[0] ?? null;
    const unread =
      me && last && last.senderId !== user.id
        ? last.createdAt > (me.lastReadAt ?? new Date(0))
          ? 1
          : 0
        : 0;
    return {
      id: c.id,
      otherUserId: otherP?.userId ?? "",
      otherName: otherP?.user.name ?? "Conversation",
      otherAvatarUrl: otherP?.user.avatarUrl ?? null,
      otherRole: otherP?.user.role ?? "",
      lastContent: last ? (last.type === "IMAGE" ? "📷 Image" : last.content) : "Say hello 👋",
      lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      lastFromMe: last ? last.senderId === user.id : false,
      unread,
    };
  });

  return <MessagingClient initialConversations={list} initialThread={thread} currentUserId={user.id} />;
}
