import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getVideoProvider } from "@/lib/video/provider";
import { Badge } from "@/components/ui/badge";
import { formatDurationSeconds } from "@/lib/format";

export const metadata: Metadata = { title: "Preview Recording" };

// Admin-only preview: plays ANY recording (draft, processing, archived)
// using the same signed-token path — admins bypass the public access rules.
export default async function AdminPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await getCurrentUser();
  if (!admin) redirect("/login?next=/admin/recorded-classes");
  if (!["ADMIN", "SUPER_ADMIN", "MODERATOR", "SUPPORT"].includes(admin.role)) {
    redirect("/admin");
  }

  const rc = await db.recordedClass.findUnique({
    where: { id },
    include: { video: true, course: { select: { title: true } } },
  });
  if (!rc) notFound();

  const playbackUrl = await getVideoProvider().playbackUrl(rc.video, admin.id);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        href="/admin/recorded-classes"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All recordings
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-extrabold text-foreground">{rc.title}</h1>
        <Badge variant="gold">{rc.status}</Badge>
        <Badge variant={rc.video.status === "READY" ? "success" : "gold"}>{rc.video.status}</Badge>
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-muted-fg">
        <Eye className="h-3.5 w-3.5" /> Admin preview — this bypasses the public access rules.
        {rc.course && ` Linked to: ${rc.course.title}`}
      </p>

      {rc.video.status === "READY" && rc.video.filePath ? (
        // The signed-token endpoint streams the file; the native player
        // handles it directly for the admin preview.
        <video
          key={playbackUrl}
          src={playbackUrl}
          controls
          autoPlay
          className="aspect-video w-full rounded-2xl bg-black shadow-lift"
          aria-label={`Preview of ${rc.title}`}
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-line bg-card text-[13px] text-muted-fg">
          {rc.video.status !== "READY"
            ? "This video is still processing — check back shortly."
            : "No local file for this video."}
        </div>
      )}

      <p className="text-[12px] text-muted-fg">
        Duration: {formatDurationSeconds(rc.durationSeconds)} · The public player (bookmarks, notes,
        resume) is on the watch page for published recordings.
      </p>
    </div>
  );
}
