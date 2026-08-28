import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { classroomBus } from "@/lib/live/bus";

// SSE stream for a classroom. Mutations come through server actions,
// which publish to the in-process bus; this route fans events out to
// every connected client. Includes snapshot events (open polls, existing
// whiteboard strokes) on connect.
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to join a classroom." }, { status: 403 });

  const live = await db.liveClass.findUnique({
    where: { id },
    include: { participants: { where: { userId: user.id } } },
  });
  if (!live) return NextResponse.json({ error: "Class not found." }, { status: 403 });
  const isHost = live.teacherId === user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MODERATOR", "SUPPORT"].includes(user.role);
  if (!isHost && live.participants.length === 0 && !isAdmin) {
    return NextResponse.json({ error: "You are not part of this class." }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // connection gone
        }
      };

      // Immediate heartbeat so headers flush even with no snapshot events.
      controller.enqueue(encoder.encode(": connected\n\n"));

      for (const poll of classroomBus.getPolls(id)) send({ type: "poll.created", poll });
      for (const stroke of classroomBus.getStrokes(id)) send({ type: "whiteboard.stroke", stroke });

      const unsubscribe = classroomBus.subscribe(id, send);
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
