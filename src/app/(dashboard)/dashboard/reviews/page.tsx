import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessageSquareText, Star } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Rating } from "@/components/ui/rating";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "My Reviews" };

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/reviews");

  const reviews = await db.review.findMany({
    where: { reviewerId: user.id },
    include: {
      teacher: { select: { name: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">My Reviews</h1>
        <p className="mt-1 text-sm text-muted-fg">Reviews you&apos;ve written across the platform.</p>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText />}
          title="No reviews yet"
          description="After a course or tutoring session, you'll be able to leave a review."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Rating value={r.rating} />
                <span className="text-xs font-bold text-muted-fg">{r.rating}.0</span>
                <span className="text-xs text-faint-fg">· {timeAgo(r.createdAt)}</span>
                {r.verifiedPurchase && (
                  <Badge variant="success" size="sm">
                    <Star className="h-3 w-3 fill-current" /> Verified
                  </Badge>
                )}
              </div>
              {r.content && <p className="mt-2 text-[13px] leading-relaxed text-foreground">{r.content}</p>}
              <p className="mt-2 text-[11px] font-semibold text-faint-fg">
                On: {r.course?.title ?? r.teacher?.name ?? "Session"}
              </p>
              {r.reply && (
                <div className="mt-3 rounded-xl border border-line bg-card-2 p-3">
                  <p className="text-[11px] font-bold text-faint-fg">Teacher&apos;s reply</p>
                  <p className="mt-1 text-[13px] text-muted-fg">{r.reply}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
