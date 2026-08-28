import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clapperboard, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDurationSeconds, formatDate, formatNumber } from "@/lib/format";
import { RecordedActions } from "./recorded-actions";

export const metadata: Metadata = { title: "Recorded Classes" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "neutral" | "danger"> = {
  DRAFT: "neutral",
  PROCESSING: "gold",
  READY: "accent",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
  FAILED: "danger",
};

export default async function RecordedClassesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/recorded-classes");
  const { status } = await searchParams;

  const rows = await db.recordedClass.findMany({
    where: status && status !== "ALL" ? { status } : {},
    include: { video: true, course: { select: { title: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const filters = ["ALL", "DRAFT", "PROCESSING", "READY", "PUBLISHED", "ARCHIVED"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Recorded Classes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Upload, process and publish official recordings with protected playback.
          </p>
        </div>
        <Link
          href="/admin/recorded-classes/upload"
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" /> Upload recording
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Recording status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/recorded-classes" : `/admin/recorded-classes?status=${f}`}
            className={
              (status ?? "ALL") === f
                ? "shrink-0 rounded-full bg-brand px-4 py-1.5 text-[12px] font-bold text-white"
                : "shrink-0 rounded-full border border-line bg-card px-4 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
            }
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Clapperboard />}
          title="No recordings here"
          description="Upload a recorded class to get started."
          action={
            <Link href="/admin/recorded-classes/upload" className="text-sm font-bold text-brand-fg hover:underline">
              Upload now →
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Recording</th>
                <th className="px-4 py-3">Linked to</th>
                <th className="px-4 py-3">Video</th>
                <th className="hidden px-4 py-3 md:table-cell">Views</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-card-2/50">
                  <td className="max-w-80 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                        <Clapperboard className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-foreground">{r.title}</p>
                        <p className="text-[11px] text-faint-fg">
                          {formatDurationSeconds(r.durationSeconds)} · {safeJsonParse<string[]>(r.tags, []).slice(0, 3).join(", ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-muted-fg">
                    {r.course?.title ?? "Standalone"}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={r.video.status === "READY" ? "success" : "gold"} size="sm">
                        {r.video.status}
                      </Badge>
                      {r.video.processingProgress > 0 && r.video.processingProgress < 100 && (
                        <span className="text-[11px] tabular-nums text-faint-fg">
                          {r.video.processingProgress}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {formatNumber(r.viewCount)} views · {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <RecordedActions id={r.id} status={r.status} videoStatus={r.video.status} />
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
