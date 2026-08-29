import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileVideo, Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { safeJsonParse } from "@/lib/utils";
import { formatDate, formatDurationSeconds } from "@/lib/format";
import { TeacherRecordedActions } from "./teacher-recorded-actions";

export const metadata: Metadata = { title: "Recorded Classes" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  PROCESSING: "brand",
  READY: "accent",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
  FAILED: "danger",
};

export default async function TeacherRecordedClassesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TEACHER") redirect("/login?next=/teacher/recorded-classes");

  const [rows, courses] = await Promise.all([
    db.recordedClass.findMany({
      where: { uploadedById: user.id },
      include: { video: true, course: { select: { title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    db.course.findMany({
      where: { teacherId: user.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Recorded Classes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Upload your class recordings — an admin publishes them to the marketplace.
          </p>
        </div>
        <Button href="/teacher/recorded-classes/upload" size="sm" leftIcon={<Upload className="h-3.5 w-3.5" />}>
          Upload recording
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileVideo />}
          title="No recordings yet"
          description="Upload a video of your class — students can watch it on demand once published."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Title</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Duration</th>
                <th className="hidden px-4 py-3 md:table-cell">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-card-2/40">
                  <td className="max-w-60 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {r.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/uploads/${r.thumbnailUrl.replace(/^\/+/, "")}`}
                          alt=""
                          className="h-10 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-foreground">{r.title}</p>
                        <p className="truncate text-[11px] text-faint-fg">
                          {safeJsonParse<string[]>(r.tags, []).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-muted-fg">
                    {r.course?.title ?? "Standalone"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] tabular-nums text-muted-fg md:table-cell">
                    {formatDurationSeconds(r.durationSeconds)}
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-faint-fg md:table-cell">
                    {formatDate(r.updatedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <TeacherRecordedActions
                      id={r.id}
                      status={r.status}
                      courses={courses}
                      initial={{
                        title: r.title,
                        description: r.description ?? "",
                        language: r.language,
                        tags: safeJsonParse<string[]>(r.tags, []).join(", "),
                        durationSeconds: r.durationSeconds,
                        courseId: r.courseId,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
