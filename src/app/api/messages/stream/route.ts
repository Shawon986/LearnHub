import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { messagingBus } from "@/lib/messaging/bus";

export const dynamic = "force-dynamic";

// Personal SSE stream: new messages, typing indicators and partner
// presence for the signed-in user's conversations.

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  // Conversation partners (for presence broadcast).
  const conversations = await db.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: { participants: { select: { userId: true } } },
  });
  const partners = [
    ...new Set(
      conversations.flatMap((c) => c.participants.map((p) => p.userId)).filter((id) => id !== user.id),
    ),
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
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

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
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
