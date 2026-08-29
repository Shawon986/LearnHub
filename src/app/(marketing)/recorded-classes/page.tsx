import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, Search } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { safeJsonParse } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { RecordedClassCard, type RecordedClassCardData } from "@/components/shared/recorded-class-card";
import { ProgressBar } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Recorded Classes",
  description: "Watch full recordings of popular live classes on demand.",
};

export default async function RecordedClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await getCurrentUser();

  const [rows, myProgress] = await Promise.all([
    db.recordedClass.findMany({
      where: {
        status: "PUBLISHED",
        ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { viewCount: "desc" }],
      take: 60,
    }),
    user
      ? db.videoProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } })
      : Promise.resolve([]),
  ]);

  const progressByRecording = new Map(myProgress.map((p) => [p.recordedClassId, p]));
  const continueRows = myProgress
    .filter((p) => p.percentComplete > 0 && p.percentComplete < 95)
    .slice(0, 4);

  const cards: RecordedClassCardData[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    durationSeconds: r.durationSeconds,
    tags: safeJsonParse<string[]>(r.tags, []),
    viewCount: r.viewCount,
    avgRating: r.avgRating,
    ratingCount: r.ratingCount,
    thumbnailUrl: r.thumbnailUrl,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Recorded classes</h1>
          <p className="mt-1 text-[15px] text-muted-fg">
            Full recordings of popular live sessions — on demand.
          </p>
        </div>
        <form method="GET" className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search recordings…"
            className="h-10 w-64 rounded-xl border border-line bg-card pl-9 pr-3 text-[13px] shadow-soft placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          />
        </form>
      </div>

      {/* Continue watching */}
      {continueRows.length > 0 && (
        <section className="mb-10" aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="mb-4 font-display text-lg font-bold text-foreground">
            Continue watching
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {continueRows.map((p) => {
              const rc = rows.find((r) => r.id === p.recordedClassId);
              if (!rc) return null;
              return (
                <Link key={p.id} href={`/recorded-classes/${rc.slug}`} className="group">
                  <div className="rounded-2xl border border-line bg-card p-4 shadow-soft transition-all group-hover:-translate-y-0.5 group-hover:shadow-lift">
                    <p className="line-clamp-2 text-[13px] font-bold text-foreground group-hover:text-brand-fg">
                      {rc.title}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <ProgressBar value={p.percentComplete} className="flex-1" />
                      <span className="text-[11px] font-bold tabular-nums text-muted-fg">
                        {Math.round(p.percentComplete)}%
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <EmptyState
          icon={<Clapperboard />}
          title="No recordings found"
          description="Try a different search — new recordings are published weekly."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((r) => {
            const row = rows.find((x) => x.id === r.id)!;
            const progress = progressByRecording.get(r.id)?.percentComplete;
            return (
              <Link key={r.id} href={`/recorded-classes/${row.slug}`} className="block h-full">
                <RecordedClassCard recorded={r} />
                {progress !== undefined && progress > 0 && (
                  <div className="px-1 pt-2">
                    <ProgressBar value={progress} color="accent" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
