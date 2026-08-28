import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MessagingClient, type ConversationData, type ThreadData } from "./messaging-client";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const list: ConversationData[] = conversations.map((c) => {
    const other = c.participants.find((p) => p.userId !== user.id);
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
      otherUserId: other?.userId ?? "",
      otherName: other?.user.name ?? "Conversation",
      otherAvatarUrl: other?.user.avatarUrl ?? null,
      otherRole: other?.user.role ?? "",
      lastContent: last
        ? last.type === "IMAGE"
          ? "📷 Image"
          : last.content
        : "Say hello 👋",
      lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      lastFromMe: last ? last.senderId === user.id : false,
      unread,
    };
  });

  const emptyThread: ThreadData = {
    conversationId: "",
    otherName: "",
    otherAvatarUrl: null,
    messages: [],
  };

  return <MessagingClient initialConversations={list} initialThread={emptyThread} currentUserId={user.id} />;
}
