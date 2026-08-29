import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/session";
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

  // Resources (kind "resource") may belong to a recorded class — enforce access.
  if (rel.startsWith("resource/")) {
    const resource = await db.resource.findFirst({
      where: { url: rel, recordedClassId: { not: null } },
    });
    if (resource?.recordedClassId) {
      const user = await getCurrentUser();
      const access = await canWatchRecording(resource.recordedClassId, user?.id ?? null);
      if (!access.allowed) {
        return NextResponse.json({ error: access.reason ?? "Access denied." }, { status: 403 });
      }
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
