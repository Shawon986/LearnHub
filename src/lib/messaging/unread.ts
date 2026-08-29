import { db } from "@/lib/db";

/** Total unread message count across all of a user's conversations. */
export async function unreadMessageCount(userId: string): Promise<number> {
  const parts = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (parts.length === 0) return 0;

  let total = 0;
  for (const p of parts) {
    total += await db.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: userId },
        createdAt: { gt: p.lastReadAt ?? new Date(0) },
      },
    });
  }
  return total;
}
