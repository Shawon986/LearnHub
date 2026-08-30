"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCountdown, formatDate, formatDurationSeconds, formatTime } from "@/lib/format";

export interface LiveClassCardData {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  teacherName: string;
  teacherAvatarUrl: string | null;
  durationSeconds: number;
}

function CountdownChip({ target }: { target: string }) {
  // `now` starts null so the SERVER and the first client render both paint
  // the same stable label (no hydration mismatch), then the ticker takes
  // over after mount.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const isUpcoming = now === null || new Date(target).getTime() > now;
  return (
    <Badge variant={isUpcoming ? "accent" : "success"} className="tabular-nums">
      <Radio className="h-3 w-3 animate-pulse-soft" />
      {now === null ? "Scheduled" : isUpcoming ? `Starts in ${formatCountdown(target)}` : "Started"}
    </Badge>
  );
}

export function LiveClassCard({ liveClass }: { liveClass: LiveClassCardData }) {
  const date = new Date(liveClass.startsAt);
  return (
    <Card hoverable className="space-y-3.5 p-5">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="brand">
          <CalendarDays className="h-3 w-3" />
          {formatDate(date)}
        </Badge>
        <CountdownChip target={liveClass.startsAt} />
      </div>

      <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-foreground">
        {liveClass.title}
      </h3>

      <div className="flex items-center gap-2.5">
        <Avatar name={liveClass.teacherName} src={liveClass.teacherAvatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-foreground">{liveClass.teacherName}</p>
          <p className="text-[11px] text-faint-fg">
            {formatTime(date)} · {formatDurationSeconds(liveClass.durationSeconds)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-fg">
          <Clock className="h-3.5 w-3.5" />
          {liveClass.status === "CANCELLED" ? "Cancelled" : liveClass.status === "ENDED" ? "Ended" : "Scheduled"}
        </span>
        <span className="text-[11px] font-bold text-brand-fg">Free to join →</span>
      </div>
    </Card>
  );
}
