import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Rating } from "@/components/ui/rating";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/reviews");

  const [teacherReviews, courseReviews, aggregate] = await Promise.all([
    db.review.findMany({
      where: { teacherId: user.id, targetType: "TEACHER", status: "PUBLISHED" },
      include: { reviewer: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.review.findMany({
      where: { course: { teacherId: user.id }, status: "PUBLISHED" },
      include: { reviewer: { select: { name: true, avatarUrl: true } }, course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.review.aggregate({
      where: { OR: [{ teacherId: user.id }, { course: { teacherId: user.id } }], status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const all = [
    ...teacherReviews.map((r) => ({ ...r, course: null as { title: string } | null })),
    ...courseReviews,
  ];
  const avg = Math.round((aggregate._avg.rating ?? 0) * 10) / 10;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: all.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Reviews</h1>
        <p className="mt-1 text-sm text-muted-fg">What students say about your teaching.</p>
      </div>

      {/* Summary */}
      <Card className="flex flex-wrap items-center gap-8 p-6">
        <div className="text-center">
          <p className="font-display text-4xl font-extrabold text-foreground">{avg.toFixed(1)}</p>
          <Rating value={avg} size={16} className="mt-1 justify-center" />
          <p className="mt-1 text-[12px] text-faint-fg">{aggregate._count} reviews</p>
        </div>
        <div className="min-w-48 flex-1 space-y-1.5">
          {distribution.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-[12px]">
              <span className="w-8 font-bold text-muted-fg">{d.star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full bg-gold"
                  style={{ width: `${all.length ? (d.count / all.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-faint-fg">{d.count}</span>
            </div>
          ))}
        </div>
      </Card>

      {all.length === 0 ? (
        <EmptyState
          icon={<Star />}
          title="No reviews yet"
          description="Reviews from students will appear here as your courses sell."
        />
      ) : (
        <div className="space-y-3">
          {all.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={r.reviewer.name} src={r.reviewer.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">{r.reviewer.name}</p>
                  <div className="flex items-center gap-2">
                    <Rating value={r.rating} size={12} />
                    <span className="text-[11px] text-faint-fg">{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
                <Badge variant={r.verifiedPurchase ? "success" : "neutral"}>
                  {r.verifiedPurchase ? "Verified" : r.targetType}
                </Badge>
              </div>
              {r.content && <p className="mt-3 text-[13px] leading-relaxed text-foreground">{r.content}</p>}
              {r.course && (
                <p className="mt-2 text-[11px] font-semibold text-faint-fg">On: {r.course.title}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
