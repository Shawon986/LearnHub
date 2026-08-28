import { NextResponse } from "next/server";
import { createReadStream, statSync } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyPlaybackToken } from "@/lib/video/provider";
import { canWatchRecording } from "@/lib/video/access";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// Protected video streaming with HTTP Range support.
// Requires a fresh HMAC-signed token (minted server-side only for
// authorized viewers) — raw file paths are never exposed.

export async function GET(req: Request, ctx: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const exp = url.searchParams.get("exp");
  if (!token) return NextResponse.json({ error: "Missing playback token." }, { status: 401 });

  const verified = verifyPlaybackToken(videoId, token, exp);
  if (!verified) return NextResponse.json({ error: "Invalid or expired playback token." }, { status: 401 });

  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  if (currentUser.id !== verified.userId) {
    return NextResponse.json({ error: "Token does not match this session." }, { status: 401 });
  }

  const video = await db.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: "Video not found." }, { status: 404 });

  const recording = await db.recordedClass.findUnique({ where: { videoId } });
  if (recording) {
    const access = await canWatchRecording(recording.id, currentUser.id);
    if (!access.allowed) {
      return NextResponse.json({ error: access.reason ?? "Access denied." }, { status: 403 });
    }
  }

  if (!video.filePath) {
    return NextResponse.json({ error: "No local file for this video." }, { status: 404 });
  }

  // Resolve within the uploads root and prevent path traversal.
  const root = path.resolve(process.cwd(), env.VIDEO_LOCAL_DIR);
  const filePath = path.resolve(root, video.filePath);
  if (!filePath.startsWith(root)) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    return NextResponse.json({ error: "Video file is missing." }, { status: 404 });
  }

  const range = req.headers.get("range");
  const contentType = video.mimeType || "video/mp4";

  if (!range) {
    return new NextResponse(createReadStream(filePath) as unknown as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  // Range request (standard video seeking).
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? Number(match[1]) : 0;
  const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  if (start >= size || end < start) {
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const stream = createReadStream(filePath, { start, end }) as unknown as ReadableStream;
  return new NextResponse(stream, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
