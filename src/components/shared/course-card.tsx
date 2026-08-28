import Link from "next/link";
import { BookOpen, Clock, MonitorPlay, Users, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Avatar } from "@/components/ui/avatar";
import { formatBDT, formatNumber } from "@/lib/format";
import { gradientFor } from "@/lib/utils";

export interface CourseCardData {
  id: string;
  slug?: string;
  title: string;
  type: string;
  price: number;
  compareAtPrice: number | null;
  thumbnailUrl: string | null;
  teacherName: string;
  teacherAvatarUrl: string | null;
  categoryIcon?: string | null;
  categoryName: string;
  avgRating: number;
  reviewCount: number;
  enrollmentCount: number;
  totalDurationMinutes: number;
  totalLessons: number;
}

const TYPE_META: Record<string, { icon: typeof Video; label: string }> = {
  RECORDED: { icon: Video, label: "Recorded" },
  LIVE: { icon: MonitorPlay, label: "Live" },
  HYBRID: { icon: Video, label: "Hybrid" },
  ONE_ON_ONE: { icon: Users, label: "1-on-1" },
};

export function CourseCard({
  course,
  href,
  progress,
}: {
  course: CourseCardData;
  href?: string;
  /** Optional progress percent (0–100) shown under the price row. */
  progress?: number;
}) {
  const meta = TYPE_META[course.type] ?? TYPE_META.RECORDED;
  const discount = course.compareAtPrice
    ? Math.round((1 - course.price / course.compareAtPrice) * 100)
    : 0;

  const inner = (
    <Card hoverable={Boolean(href)} className="group h-full overflow-hidden">
      {/* Thumbnail */}
      <div
        className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${gradientFor(course.title)}`}
      >
        <BookOpen className="h-10 w-10 text-white/80" aria-hidden />
        {discount > 0 && (
          <Badge variant="danger" className="absolute left-3 top-3">
            −{discount}%
          </Badge>
        )}
        <Badge variant="neutral" className="absolute right-3 top-3 bg-black/40 text-white border-transparent">
          <meta.icon className="h-3 w-3" />
          {meta.label}
        </Badge>
        <span className="absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-1 text-[11px] font-bold text-white">
          {course.totalDurationMinutes > 0 ? `${Math.round(course.totalDurationMinutes / 60)}h · ` : ""}
          {course.totalLessons} lessons
        </span>
      </div>

      <div className="flex flex-col gap-2.5 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint-fg">{course.categoryName}</p>
        <h3 className="line-clamp-2 font-display text-[14px] font-bold leading-snug text-foreground transition-colors group-hover:text-brand-fg">
          {course.title}
        </h3>
        <div className="flex items-center gap-2">
          <Avatar name={course.teacherName} src={course.teacherAvatarUrl} size="xs" />
          <span className="truncate text-xs font-medium text-muted-fg">{course.teacherName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-faint-fg">
          <Rating value={course.avgRating} size={13} />
          <span className="font-bold text-muted-fg">{course.avgRating.toFixed(1)}</span>
          <span>({course.reviewCount})</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {formatNumber(course.enrollmentCount)}
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[15px] font-extrabold text-foreground">
              {course.price === 0 ? "Free" : formatBDT(course.price)}
            </span>
            {course.compareAtPrice && course.compareAtPrice > course.price ? (
              <span className="text-xs text-faint-fg line-through">{formatBDT(course.compareAtPrice)}</span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-fg">
            <Clock className="h-3 w-3" /> Self-paced
          </span>
        </div>
        {progress !== undefined && (
          <div className="flex items-center gap-2 pt-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-2">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-muted-fg">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full" aria-label={course.title}>
        {inner}
      </Link>
    );
  }
  return inner;
}
