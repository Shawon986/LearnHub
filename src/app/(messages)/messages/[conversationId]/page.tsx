import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAdminOversight, getMessageDirectory, type MessageDirectoryData } from "@/lib/messaging/directory";
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
  // Admins get read-only oversight over ANY conversation.
  const isAdmin = ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(user.role);
  if (!member && !isAdmin) notFound();

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

  // Admin oversight: label the thread with both sides of the pair.
  const isOversight = isAdmin && !member;
  const pairNames = conversation.participants
    .filter((p) => p.user.role === "STUDENT" || p.user.role === "TEACHER")
    .map((p) => p.user.name);

  const thread: ThreadData = {
    conversationId: conversation.id,
    otherName: isOversight
      ? pairNames.join(" ↔ ") || "Conversation"
      : other?.user.name ?? "Conversation",
    otherAvatarUrl: other?.user.avatarUrl ?? null,
    otherRole: other?.user.role ?? "",
    partnerLastReadAt: other?.lastReadAt?.toISOString() ?? null,
    // Admin oversight: label every message with its sender's name + role.
    senderNames: isOversight
      ? Object.fromEntries(conversation.participants.map((p) => [p.user.id, p.user.name]))
      : undefined,
    senderRoles: isOversight
      ? Object.fromEntries(conversation.participants.map((p) => [p.user.id, p.user.role]))
      : undefined,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      content: m.content,
      type: m.type,
      attachmentUrl: m.attachmentUrl,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  // Real unread counts: messages from the other party after my last read.
  const unreadCounts = await Promise.all(
    conversations.map((c) => {
      const me = c.participants.find((p) => p.userId === user.id);
      return db.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: user.id },
          createdAt: { gt: me?.lastReadAt ?? new Date(0) },
        },
      });
    }),
  );

  const list: ConversationData[] = conversations.map((c, i) => {
    const otherP = c.participants.find((p) => p.userId !== user.id);
    const last = c.messages[0] ?? null;
    return {
      id: c.id,
      otherUserId: otherP?.userId ?? "",
      otherName: otherP?.user.name ?? "Conversation",
      otherAvatarUrl: otherP?.user.avatarUrl ?? null,
      otherRole: otherP?.user.role ?? "",
      partnerLastReadAt: otherP?.lastReadAt?.toISOString() ?? null,
      lastContent: last ? (last.type === "IMAGE" ? "📷 Image" : last.content) : "Say hello 👋",
      lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      lastFromMe: last ? last.senderId === user.id : false,
      unread: unreadCounts[i] ?? 0,
    };
  });

  const directory: MessageDirectoryData = await getMessageDirectory(user.role);

  const oversight = isAdmin ? await getAdminOversight() : [];

  return (
    <MessagingClient
      initialConversations={list}
      initialThread={thread}
      currentUserId={user.id}
      directory={directory}
      adminOversight={oversight}
      readOnly={isOversight}
    />
  );
}
