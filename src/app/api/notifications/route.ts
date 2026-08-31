import { apiHandler, json, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { markNotificationsRead } from "@/lib/notifications";
import { messagingBus } from "@/lib/messaging/bus";
import { db } from "@/lib/db";
import { z } from "zod";

export const GET = apiHandler(async (req) => {
  const user = await requireUser();
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 20), 1), 50);

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: (n.data ?? null) as { checkoutPath?: string; conversationId?: string; disputeId?: string } | null,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
    unread,
  });
});

const markSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.coerce.boolean().optional(),
});

export const POST = apiHandler(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, markSchema);
  await markNotificationsRead(user.id, input.all ? undefined : input.ids);
  return json({ ok: true });
});

/** Permanently delete notifications: { ids: [...] } or { all: true }. */
export const DELETE = apiHandler(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, markSchema);
  const where = input.all
    ? { userId: user.id }
    : { userId: user.id, id: { in: input.ids ?? [] } };
  const deleted = await db.notification.findMany({ where, select: { id: true } });
  await db.notification.deleteMany({ where });
  // Cross-device sync: other open tabs drop the deleted rows immediately.
  // (Best effort — the DB poll cannot see deletions, so the bus carries
  // them; on reconnect every client refetches anyway.)
  messagingBus.publishTo(user.id, {
    type: "notification.deleted",
    ids: deleted.map((n) => n.id),
    all: input.all === true,
  });
  return json({ ok: true });
});
