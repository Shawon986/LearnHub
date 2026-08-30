import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Serves chat attachments stored IN the database. Authorization mirrors the
// old /api/uploads chat rule: only conversation participants — plus admins,
// who may open any chat attachment through oversight access.

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  const attachment = await db.chatAttachment.findUnique({ where: { id } });
  if (!attachment) return NextResponse.json({ error: "File not found." }, { status: 404 });

  // Find the message that references this attachment and check access.
  const message = await db.message.findFirst({
    where: { attachmentUrl: `chat-att/${id}` },
    select: { conversationId: true },
  });
  const participant = message
    ? await db.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
      })
    : null;
  if (!message || (!participant && !isAdminRole(user.role))) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const bytes = Buffer.from(attachment.data);
  const isImage = attachment.mime.startsWith("image/");
  const filename = attachment.name.replace(/[^\w.\- ]+/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": attachment.mime,
      "Content-Length": String(attachment.size),
      "Content-Disposition": isImage ? "inline" : `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
