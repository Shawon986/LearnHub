"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays, CheckCircle2, Clock, ExternalLink, Radio } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registerLiveClass } from "@/lib/actions/student";
import { formatCountdown, formatDate, formatDurationSeconds, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface LiveClassCardData {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  teacherName: string;
  teacherAvatarUrl: string | null;
  durationSeconds: number;
  /** External Zoom/Meet link — no built-in classroom, the host runs it. */
  meetingUrl?: string | null;
  /** Whether the current viewer is already registered. */
  registered?: boolean;
  /** Whether the current viewer is signed in. */
  viewerSignedIn?: boolean;
}

function CountdownChip({ target }: { target: string }) {
  // `now` starts null so the SERVER and the first client render both paint
  // the same stable label (no hydration mismatch), then the ticker takes
  // over after mount.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, []);
  const isUpcoming = now === null || new Date(target).getTime() > now;
  return (
    <Badge variant={isUpcoming ? "accent" : "success"} className="tabular-nums">
      <Radio className="h-3 w-3 animate-pulse-soft" />
      {now === null ? "Scheduled" : isUpcoming ? `Starts in ${formatCountdown(target)}` : "Started"}
    </Badge>
  );
}

/** Join unlocks 15 minutes before start (hosts open the room around then). */
function joinOpen(startsAt: string): boolean {
  return new Date(startsAt).getTime() - Date.now() <= 15 * 60_000;
}

export function LiveClassCard({ liveClass }: { liveClass: LiveClassCardData }) {
  const date = new Date(liveClass.startsAt);
  const [registered, setRegistered] = useState(Boolean(liveClass.registered));
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const closed = liveClass.status === "CANCELLED" || liveClass.status === "ENDED";
  const canJoin = registered && !closed && liveClass.meetingUrl && joinOpen(liveClass.startsAt);

  function onRegister() {
    startTransition(async () => {
      const result = await registerLiveClass(liveClass.id);
      if (result.ok) {
        setRegistered(true);
        toast({
          title: "You're registered 🎉",
          description: "The Zoom/Meet link unlocks here 15 minutes before the class.",
          variant: "success",
        });
      } else {
        toast({ title: result.error ?? "Could not register.", variant: "error" });
      }
    });
  }

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
            {formatTime(date)} · {formatDurationSeconds(liveClass.durationSeconds)} · free
          </p>
        </div>
      </div>

      {/* ---- Functional actions (no built-in classroom — Zoom/Meet only) ---- */}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        {closed ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-faint-fg">
            <Clock className="h-3.5 w-3.5" />
            {liveClass.status === "CANCELLED" ? "Cancelled" : "Ended"}
          </span>
        ) : canJoin ? (
          <Button
            href={liveClass.meetingUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
          >
            Join session
          </Button>
        ) : registered ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Registered{joinOpen(liveClass.startsAt) ? "" : " · link unlocks 15 min before"}
          </span>
        ) : !liveClass.viewerSignedIn ? (
          <Button href="/login?next=/dashboard/live" size="sm" variant="secondary">
            Sign in to register
          </Button>
        ) : (
          <Button size="sm" onClick={onRegister} loading={pending}>
            Register free
          </Button>
        )}
        {/* "Free to join" is a REAL action: guests go sign in, signed-in users
            get the live dashboard with registration + reminder controls. */}
        <Button
          variant="ghost"
          size="sm"
          href={liveClass.viewerSignedIn ? "/dashboard/live" : "/login?next=/dashboard/live"}
          className={cn("text-[11px]", canJoin && "text-success")}
        >
          Free to join →
        </Button>
      </div>
    </Card>
  );
}
