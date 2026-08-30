import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { canWatchRecording } from "@/lib/video/access";

export const dynamic = "force-dynamic";

// Protected download endpoint for uploaded resources (PDFs, slides, etc.)
// and thumbnails. Resources attached to a recording follow the recording's
// access rule; thumbnails are public.

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const rel = segments.filter(Boolean).join("/");
  if (!rel || rel.includes("..")) return NextResponse.json({ error: "Invalid path." }, { status: 400 });

  const root = path.resolve(
    /* turbopackIgnore: true */
    process.cwd(),
    env.VIDEO_LOCAL_DIR,
  );
  const filePath = path.resolve(root, rel);
  if (!filePath.startsWith(root)) return NextResponse.json({ error: "Invalid path." }, { status: 400 });

  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // SECURITY: private content is never served without authorization.
  // - verification/ documents (NID, CV, photos): admin-only.
  // - chat/ images: only conversation participants.
  // - resource/ files: enrollment (course/lesson) or recording access.
  if (rel.startsWith("verification/")) {
    const user = await getCurrentUser();
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  } else if (rel.startsWith("chat/")) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in." }, { status: 401 });
    const message = await db.message.findFirst({
      where: { attachmentUrl: rel },
      select: { conversationId: true },
    });
    const participant = message
      ? await db.conversationParticipant.findUnique({
          where: { conversationId_userId: { conversationId: message.conversationId, userId: user.id } },
        })
      : null;
    if (!message || !participant) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  } else if (rel.startsWith("resource/")) {
    const user = await getCurrentUser();
    const resource = await db.resource.findFirst({ where: { url: rel } });
    if (!resource) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    let allowed = false;
    if (resource.recordedClassId) {
      const access = await canWatchRecording(resource.recordedClassId, user?.id ?? null);
      allowed = access.allowed;
    } else if (resource.courseId && user) {
      // Course/lesson resources: enrolled students, the course teacher, admins.
      allowed =
        isAdminRole(user.role) ||
        Boolean(
          await db.enrollment.findFirst({
            where: { courseId: resource.courseId, studentId: user.id, status: { in: ["ACTIVE", "COMPLETED"] } },
          }),
        ) ||
        Boolean(
          await db.course.findFirst({ where: { id: resource.courseId, teacherId: user.id } }),
        );
    }
    if (!allowed) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  }

  const contentType =
    rel.endsWith(".pdf")
      ? "application/pdf"
      : rel.endsWith(".svg")
        ? "image/svg+xml"
        : /\.(png|jpe?g|webp|gif|avif)$/i.test(rel)
          ? `image/${rel.endsWith(".jpg") ? "jpeg" : rel.slice(rel.lastIndexOf(".") + 1)}`
          : rel.startsWith("thumbnail/")
            ? "image/webp"
            : "application/octet-stream";

  return new NextResponse(createReadStream(filePath) as unknown as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Content-Disposition": rel.startsWith("resource/") ? "attachment" : "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
