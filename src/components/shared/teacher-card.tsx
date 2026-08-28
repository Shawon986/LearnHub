import Link from "next/link";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { formatBDT } from "@/lib/format";

export interface TeacherCardData {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  verified: boolean;
  hourlyRate: number;
  avgRating: number;
  reviewCount: number;
  totalStudents: number;
  skills: string[];
  location: string | null;
}

export function TeacherCard({ teacher, href }: { teacher: TeacherCardData; href?: string }) {
  const inner = (
    <Card hoverable={Boolean(href)} className="flex h-full flex-col items-center gap-3 p-6 text-center">
      <div className="relative">
        <Avatar name={teacher.name} src={teacher.avatarUrl} size="lg" />
        {teacher.verified && (
          <BadgeCheck
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-card text-accent"
            aria-label="Verified teacher"
          />
        )}
      </div>

      <div className="space-y-0.5">
        <h3 className="font-display text-[15px] font-bold text-foreground">{teacher.name}</h3>
        {teacher.headline && <p className="line-clamp-1 text-xs text-muted-fg">{teacher.headline}</p>}
        <div className="flex items-center justify-center gap-1.5 text-xs text-faint-fg">
          {teacher.location && <span>{teacher.location}</span>}
          {teacher.location && <span aria-hidden>·</span>}
          <Rating value={teacher.avgRating} size={12} />
          <span className="font-bold text-muted-fg">{teacher.avgRating.toFixed(1)}</span>
          <span>({teacher.reviewCount})</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {teacher.skills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="brand" size="sm">
            {skill}
          </Badge>
        ))}
        {teacher.skills.length > 3 && (
          <Badge variant="neutral" size="sm">
            +{teacher.skills.length - 3}
          </Badge>
        )}
      </div>

      <div className="mt-auto flex w-full items-center justify-between border-t border-line pt-4">
        <div className="text-left">
          <p className="font-display text-[15px] font-extrabold text-foreground">
            {teacher.hourlyRate > 0 ? `${formatBDT(teacher.hourlyRate)}/hr` : "Contact"}
          </p>
          <p className="text-[11px] text-faint-fg">{teacher.totalStudents} students</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
          <MessageSquare className="h-3.5 w-3.5" />
          View profile
        </span>
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full" aria-label={teacher.name}>
        {inner}
      </Link>
    );
  }
  return inner;
}
