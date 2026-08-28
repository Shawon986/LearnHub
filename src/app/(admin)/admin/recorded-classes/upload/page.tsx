import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { UploadWizard, type SerializedCourse } from "./upload-wizard";

export const metadata: Metadata = { title: "Upload Recording" };

export default async function UploadRecordingPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/recorded-classes/upload");

  const courses: SerializedCourse[] = (
    await db.course.findMany({
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: { lessons: { orderBy: { sortOrder: "asc" } } },
        },
      },
      orderBy: { title: "asc" },
    })
  ).map((c) => ({
    id: c.id,
    title: c.title,
    modules: c.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
    })),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/recorded-classes"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All recordings
      </Link>
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Upload a recorded class</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Upload the video, attach it to a course (optional), add metadata, then save and publish.
        </p>
      </div>
      <UploadWizard courses={courses} />
    </div>
  );
}
