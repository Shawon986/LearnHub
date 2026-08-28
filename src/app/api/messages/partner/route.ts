import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// The other party of a conversation (used for presence indicators).
export const GET = apiHandler(async (req) => {
  const user = await requireUser();
  const conversationId = req.nextUrl.searchParams.get("conversation");
  if (!conversationId) return json({ userId: null });

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { userId: true } } },
  });
  const other = conversation?.participants.find((p) => p.userId !== user.id);
  return json({ userId: other?.userId ?? null });
});
