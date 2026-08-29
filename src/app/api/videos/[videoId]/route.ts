import { promises as fs } from "fs";
import path from "path";
import { apiHandler, json } from "@/lib/api";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Delete an uploaded-but-unused Video asset (wizard "remove file").
// Only the uploader or an admin; recordings that already reference the
// video cannot be deleted through this endpoint.
export const DELETE = apiHandler(async (req, ctx: { params: Promise<Record<string, string>> }) => {
  const { videoId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return json({ error: "auth", message: "Sign in." }, { status: 401 });

  const video = await db.video.findUnique({
    where: { id: videoId },
    include: { recordedClass: { select: { id: true } } },
  });
  if (!video) return json({ error: "not_found", message: "Video not found." }, { status: 404 });
  if (video.recordedClass) {
    return json({ error: "in_use", message: "This video belongs to a recording." }, { status: 400 });
  }
  if (video.uploadedById !== user.id && !isAdminRole(user.role)) {
    return json({ error: "forbidden", message: "Not your upload." }, { status: 403 });
  }

  await db.video.delete({ where: { id: videoId } });

  // Best-effort local file removal (traversal-guarded, never throws).
  if (video.filePath) {
    try {
      const root = path.resolve(process.cwd(), env.VIDEO_LOCAL_DIR);
      const full = path.resolve(root, video.filePath.replace(/^[\\/]+/, ""));
      if (full.startsWith(root)) await fs.unlink(full);
    } catch {
      /* already gone */
    }
  }

  return json({ ok: true });
});
