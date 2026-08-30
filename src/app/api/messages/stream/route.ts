import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { messagingBus } from "@/lib/messaging/bus";

export const dynamic = "force-dynamic";

const POLL_MS = 2000;

/**
 * Personal SSE stream — DATABASE-CANONICAL delivery.
 *
 * Root cause of the multi-device sync failure: the in-process bus is
 * duplicated across server bundles (and per instance on serverless), so
 * publish and subscribe never meet. Instead of the bus, this stream polls
 * the DATABASE with a cursor — the database is the single source of truth,
 * so delivery works across any number of instances and devices, and a
 * reconnect naturally replays everything missed while offline.
 *
 * Typing + presence remain bus-based (best-effort, single-instance).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  // Conversation partners (for presence broadcast) + conversation ids.
  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: { participants: { select: { userId: true } } },
  });
  const conversationIds = conversations.map((c) => c.id);
  const partners = [
    ...new Set(
      conversations.flatMap((c) => c.participants.map((p) => p.userId)).filter((id) => id !== user.id),
    ),
  ];

  const encoder = new TextEncoder();
  let cursor = new Date();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* client gone */
        }
      };
      try {
        controller.enqueue(encoder.encode(": connected\n\n"));
      } catch {
        /* client gone */
      }

      messagingBus.markOnline(user.id, partners);
      const unsubscribe = messagingBus.subscribe(user.id, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* noop */
        }
      }, 25_000);

      // Canonical poll: new messages, notifications and read receipts.
      const poll = async () => {
        try {
          const after = cursor;
          const [messages, notifications, readUpdates] = await Promise.all([
            conversationIds.length > 0
              ? db.message.findMany({
                  where: { conversationId: { in: conversationIds }, createdAt: { gt: after } },
                  include: { sender: { select: { name: true, avatarUrl: true } } },
                  orderBy: { createdAt: "asc" },
                  take: 100,
                })
              : Promise.resolve([]),
            db.notification.findMany({
              where: { userId: user.id, createdAt: { gt: after } },
              orderBy: { createdAt: "asc" },
              take: 100,
            }),
            conversationIds.length > 0
              ? db.conversationParticipant.findMany({
                  where: {
                    conversationId: { in: conversationIds },
                    userId: { not: user.id },
                    lastReadAt: { gt: after },
                  },
                  select: { conversationId: true, userId: true, lastReadAt: true },
                })
              : Promise.resolve([]),
          ]);

          for (const m of messages) {
            send({
              type: "message",
              id: m.id,
              conversationId: m.conversationId,
              senderId: m.senderId,
              senderName: m.sender.name,
              senderAvatarUrl: m.sender.avatarUrl,
              content: m.content,
              attachmentUrl: m.attachmentUrl,
              messageType: m.type,
              createdAt: m.createdAt.toISOString(),
            });
          }
          for (const n of notifications) {
            send({
              type: "notification",
              id: n.id,
              title: n.title,
              body: n.body,
              data: (n.data ?? {}) as Record<string, unknown>,
              createdAt: n.createdAt.toISOString(),
            });
          }
          for (const r of readUpdates) {
            if (r.lastReadAt) {
              send({
                type: "conversation.read",
                conversationId: r.conversationId,
                userId: r.userId,
                at: r.lastReadAt.toISOString(),
              });
            }
          }

          // Cross-device notification read sync: rows whose read flag flipped
          // since the cursor. Delivered as its own event so the bell/badges on
          // OTHER devices clear the same moment they do here.
          try {
            const markedRead = await db.notification.findMany({
              where: { userId: user.id, read: true, updatedAt: { gt: after } },
              select: { id: true },
              take: 500,
            });
            if (markedRead.length > 0) {
              send({ type: "notification.read", ids: markedRead.map((n) => n.id) });
            }
          } catch (e) {
            // Isolated: a pre-migration client/DB must never break the rest
            // of the stream delivery.
            console.error("[stream] read-sync poll failed:", e);
          }
          cursor = new Date();
        } catch (e) {
          console.error("[stream] poll failed:", e);
          // Keep polling — a transient DB error must not kill the stream.
        }
      };

      const pollTimer = setInterval(() => {
        void poll();
      }, POLL_MS);
      void poll();

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        clearInterval(pollTimer);
        unsubscribe();
        messagingBus.markOffline(user.id, partners);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
