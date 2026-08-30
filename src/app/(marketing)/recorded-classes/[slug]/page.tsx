import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Eye, Lock, Play, Tags } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canWatchRecording } from "@/lib/video/access";
import { getVideoProvider } from "@/lib/video/provider";
import { safeJsonParse, safeJsonLd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { formatDate, formatDurationSeconds, formatNumber } from "@/lib/format";
import { WatchClient } from "./watch-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const rc = await db.recordedClass.findUnique({ where: { slug } });
  if (!rc || rc.status !== "PUBLISHED") return { title: "Recording not found" };
  return {
    title: rc.title,
    description: rc.description ?? undefined,
    openGraph: { title: rc.title, description: rc.description ?? undefined, type: "video.other" },
  };
}

export default async function WatchPage({ params }: PageProps) {
  const { slug } = await params;
  const rc = await db.recordedClass.findUnique({
    where: { slug },
    include: {
      video: true,
      course: { select: { title: true, slug: true, teacher: { select: { name: true, avatarUrl: true } } } },
      resources: true,
      uploadedBy: { select: { name: true } },
    },
  });
  if (!rc || rc.status !== "PUBLISHED") notFound();

  const user = await getCurrentUser();
  const access = await canWatchRecording(rc.id, user?.id ?? null);

  const [bookmarks, notes, progress, related] = await Promise.all([
    user
      ? db.bookmark.findMany({ where: { userId: user.id, recordedClassId: rc.id }, orderBy: { timeSeconds: "asc" } })
      : Promise.resolve([]),
    user
      ? db.videoNote.findMany({ where: { userId: user.id, recordedClassId: rc.id }, orderBy: { timeSeconds: "asc" } })
      : Promise.resolve([]),
    user
      ? db.videoProgress.findUnique({ where: { userId_recordedClassId: { userId: user.id, recordedClassId: rc.id } } })
      : Promise.resolve(null),
    db.recordedClass.findMany({
      where: { status: "PUBLISHED", id: { not: rc.id } },
      orderBy: { viewCount: "desc" },
      take: 3,
    }),
  ]);

  // Mint the signed playback URL for authorized viewers. Standalone
  // (public) recordings play for guests with an anonymous token;
  // course-linked recordings still require a signed-in enrolled user.
  let playbackUrl: string | null = null;
  if (access.allowed) {
    playbackUrl = await getVideoProvider().playbackUrl(rc.video, user?.id ?? "anonymous");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: rc.title,
    description: rc.description ?? undefined,
    duration: rc.durationSeconds > 0 ? `PT${Math.floor(rc.durationSeconds / 60)}M${rc.durationSeconds % 60}S` : undefined,
    uploadDate: rc.publishedAt?.toISOString().slice(0, 10) ?? undefined,
    publisher: { "@type": "Organization", name: "LearnHub" },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/WatchAction",
      userInteractionCount: rc.viewCount,
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <nav className="mb-4 text-[12px] font-semibold text-muted-fg" aria-label="Breadcrumb">
        <Link href="/recorded-classes" className="hover:text-foreground">
          Recorded classes
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{rc.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {/* Player / gate */}
          {access.allowed && playbackUrl ? (
            <WatchClient
              recordedClassId={rc.id}
              playbackUrl={playbackUrl}
              initialPosition={progress?.lastPositionSeconds ?? 0}
              bookmarks={bookmarks.map((b) => ({ id: b.id, timeSeconds: b.timeSeconds, label: b.label }))}
              notes={notes.map((n) => ({ id: n.id, timeSeconds: n.timeSeconds, content: n.content }))}
              canTrack={Boolean(user)}
              poster={rc.thumbnailUrl ? `/api/uploads/${rc.thumbnailUrl.replace(/^\/+/, "")}` : null}
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-card p-8 text-center">
              <Lock className="h-8 w-8 text-faint-fg" />
              <p className="max-w-md text-[13px] leading-relaxed text-muted-fg">{access.reason}</p>
              {rc.course && !user && (
                <Link href={`/login?next=/recorded-classes/${rc.slug}`} className="text-sm font-bold text-brand-fg hover:underline">
                  Sign in to watch →
                </Link>
              )}
              {rc.course && user && (
                <Link href={`/courses/${rc.course.slug}`} className="text-sm font-bold text-brand-fg hover:underline">
                  Enroll in {rc.course.title} →
                </Link>
              )}
            </div>
          )}

          {/* Title + meta */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-foreground">{rc.title}</h1>
              {rc.course && <Badge variant="brand">Course content</Badge>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-fg">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> {formatNumber(rc.viewCount)} views
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Published {formatDate(rc.publishedAt ?? rc.createdAt)}
              </span>
              <span>{formatDurationSeconds(rc.durationSeconds)}</span>
              <span className="flex items-center gap-1">
                <Rating value={rc.avgRating} size={13} />
                {rc.avgRating.toFixed(1)} ({rc.ratingCount})
              </span>
            </div>
            {rc.description && (
              <p className="mt-4 max-w-3xl text-[14px] leading-relaxed text-muted-fg">{rc.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Tags className="h-4 w-4 text-faint-fg" />
              {safeJsonParse<string[]>(rc.tags, []).map((t) => (
                <Badge key={t} variant="neutral" size="sm">
                  {t}
                </Badge>
              ))}
            </div>
            {rc.course && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-card p-3">
                <Avatar name={rc.course.teacher.name} src={rc.course.teacher.avatarUrl} size="sm" />
                <p className="text-[12px] text-muted-fg">
                  From <strong className="text-foreground">{rc.course.title}</strong> · taught by{" "}
                  {rc.course.teacher.name}
                </p>
              </div>
            )}
          </div>

          {/* Resources */}
          {rc.resources.length > 0 && (
            <section aria-labelledby="resources-heading">
              <h2 id="resources-heading" className="mb-3 font-display text-lg font-bold text-foreground">
                Resources ({rc.resources.length})
              </h2>
              <ul className="space-y-2">
                {rc.resources.map((res) => (
                  <li key={res.id}>
                    <a
                      href={`/api/uploads/${res.url}`}
                      className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 text-[13px] font-bold text-foreground transition-colors hover:border-brand hover:text-brand-fg"
                    >
                      📎 {res.title}
                      <Badge variant="neutral" size="sm">
                        {res.type}
                      </Badge>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Related */}
        <aside aria-label="Related recordings">
          <h2 className="mb-4 font-display text-lg font-bold text-foreground">More recordings</h2>
          <div className="space-y-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/recorded-classes/${r.slug}`}
                className="flex gap-3 rounded-2xl border border-line bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                {r.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/uploads/${r.thumbnailUrl.replace(/^\/+/, "")}`}
                    alt=""
                    className="aspect-video w-24 shrink-0 self-center rounded-lg object-cover" loading="lazy" decoding="async"
                  />
                ) : (
                  <span className="flex aspect-video w-24 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                    <Play className="h-4 w-4 fill-brand text-brand" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-bold text-foreground">{r.title}</p>
                  <p className="mt-1 text-[11px] text-faint-fg">
                    {formatDurationSeconds(r.durationSeconds)} · {formatNumber(r.viewCount)} views
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
