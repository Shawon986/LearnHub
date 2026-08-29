import { Eye, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { formatDurationSeconds, formatNumber } from "@/lib/format";
import { gradientFor } from "@/lib/utils";

export interface RecordedClassCardData {
  id: string;
  title: string;
  durationSeconds: number;
  tags: string[];
  viewCount: number;
  avgRating: number;
  ratingCount: number;
  teacherName?: string | null;
  courseTitle?: string | null;
  thumbnailUrl?: string | null;
}

export function RecordedClassCard({ recorded }: { recorded: RecordedClassCardData }) {
  const cover = recorded.thumbnailUrl
    ? `/api/uploads/${recorded.thumbnailUrl.replace(/^\/+/, "")}`
    : null;
  return (
    <Card hoverable className="group overflow-hidden">
      {/* 16:9 cover — matches the generated thumbnail aspect exactly. */}
      <div
        className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${gradientFor(recorded.title)}`}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async"
          />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" aria-hidden />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
          <Play className="h-6 w-6 fill-white text-white" />
        </span>
        <Badge variant="neutral" className="absolute bottom-3 left-3 bg-black/50 text-white border-transparent">
          {formatDurationSeconds(recorded.durationSeconds)}
        </Badge>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-[11px] font-bold text-white">
          <Eye className="h-3 w-3" /> {formatNumber(recorded.viewCount)}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 font-display text-[14px] font-bold leading-snug text-foreground transition-colors group-hover:text-brand-fg">
          {recorded.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-faint-fg">
          <Rating value={recorded.avgRating} size={12} />
          <span className="font-bold text-muted-fg">{recorded.avgRating.toFixed(1)}</span>
          <span>({recorded.ratingCount})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {recorded.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="neutral" size="sm">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
