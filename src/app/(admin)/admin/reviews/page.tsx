import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Flag, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Rating } from "@/components/ui/rating";
import { ReviewModerationActions } from "./review-moderation-actions";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Review Moderation" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  FLAGGED: "danger",
  REMOVED: "neutral",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/reviews");
  const { status } = await searchParams;

  const reviews = await db.review.findMany({
    where: status && status !== "ALL" ? { status } : {},
    include: {
      reviewer: { select: { name: true, avatarUrl: true } },
      course: { select: { title: true, slug: true } },
      teacher: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const flagged = reviews.filter((r) => r.status === "FLAGGED").length;

  const filters = ["ALL", "PUBLISHED", "FLAGGED", "REMOVED"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Reviews</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {flagged} flagged review{flagged === 1 ? "" : "s"} need attention.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar" role="navigation" aria-label="Review status">
        {filters.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/reviews" : `/admin/reviews?status=${f}`}
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

      {reviews.length === 0 ? (
        <EmptyState icon={<Star />} title="No reviews here" description="Reviews appear as students write them." />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={r.reviewer.name} src={r.reviewer.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">{r.reviewer.name}</p>
                  <div className="flex items-center gap-2">
                    <Rating value={r.rating} size={12} />
                    <span className="text-[11px] text-faint-fg">{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status}</Badge>
                {r.reportCount > 0 && (
                  <Badge variant="danger" size="sm">
                    <Flag className="h-3 w-3" /> {r.reportCount} report{r.reportCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
              {r.content && (
                <p className="mt-3 text-[13px] leading-relaxed text-muted-fg">{r.content}</p>
              )}
              <p className="mt-2 text-[11px] font-semibold text-faint-fg">
                Target: {r.targetType} ·{" "}
                {r.course?.title ? (
                  <Link href={`/courses/${r.course.slug}`} className="hover:underline">
                    {r.course.title}
                  </Link>
                ) : r.teacher?.name ? (
                  r.teacher.name
                ) : (
                  "—"
                )}
              </p>
              <div className="mt-3">
                <ReviewModerationActions reviewId={r.id} status={r.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
