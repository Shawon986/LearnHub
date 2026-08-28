import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordedClassCard, type RecordedClassCardData } from "@/components/shared/recorded-class-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Recorded Classes" };

export default async function RecordingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/recordings");

  const recordings = await db.recordedClass.findMany({
    where: { status: "PUBLISHED" },
    include: { course: { select: { title: true } } },
    orderBy: { publishedAt: "desc" },
  });

  const cards: RecordedClassCardData[] = recordings.map((r) => ({
    id: r.id,
    title: r.title,
    durationSeconds: r.durationSeconds,
    tags: safeJsonParse<string[]>(r.tags, []),
    viewCount: r.viewCount,
    avgRating: r.avgRating,
    ratingCount: r.ratingCount,
    courseTitle: r.course?.title ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Recorded Classes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Full recordings of popular live sessions, on demand.
          </p>
        </div>
        <Badge variant="gold">Playback arrives in Phase 8</Badge>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Clapperboard />}
          title="No recordings published yet"
          description="Published recordings from live classes will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((r) => (
            <RecordedClassCard key={r.id} recorded={r} />
          ))}
        </div>
      )}
    </div>
  );
}
