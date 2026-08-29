import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordedClassCard, type RecordedClassCardData } from "@/components/shared/recorded-class-card";

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
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Recorded Classes</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Full recordings of popular live sessions, on demand — resume right where you left off.
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Clapperboard />}
          title="No recordings published yet"
          description="Published recordings from live classes will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((r) => {
            const row = recordings.find((x) => x.id === r.id)!;
            return (
              <Link key={r.id} href={`/recorded-classes/${row.slug}`} className="block h-full">
                <RecordedClassCard recorded={r} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
