import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getAdminOversight, getMessageDirectory, type MessageDirectoryData } from "@/lib/messaging/directory";
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
    const other = c.participants.find((p) => p.userId !== user.id);
    const last = c.messages[0] ?? null;
    return {
      id: c.id,
      otherUserId: other?.userId ?? "",
      otherName: other?.user.name ?? "Conversation",
      otherAvatarUrl: other?.user.avatarUrl ?? null,
      otherRole: other?.user.role ?? "",
      partnerLastReadAt: other?.lastReadAt?.toISOString() ?? null,
      lastContent: last
        ? last.type === "IMAGE"
          ? "📷 Image"
          : last.content
        : "Say hello 👋",
      lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      lastFromMe: last ? last.senderId === user.id : false,
      unread: unreadCounts[i] ?? 0,
    };
  });

  const emptyThread: ThreadData = {
    conversationId: "",
    otherName: "",
    otherAvatarUrl: null,
    otherRole: "",
    partnerLastReadAt: null,
    messages: [],
  };

  const directory: MessageDirectoryData = await getMessageDirectory(user.role);

  // Admin oversight: every teacher ↔ student conversation on the platform.
  const oversight = ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(user.role)
    ? await getAdminOversight()
    : [];

  return (
    <MessagingClient
      initialConversations={list}
      initialThread={emptyThread}
      currentUserId={user.id}
      directory={directory}
      adminOversight={oversight}
    />
  );
}
