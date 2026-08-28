import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MonitorPlay, Video } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/action-button";
import { cancelLiveClass } from "@/lib/actions/teacher";
import { formatBDT, formatDate, formatTime } from "@/lib/format";
import { ScheduleLiveClassModal } from "./schedule-modal";

export const metadata: Metadata = { title: "Live Classes" };

export default async function LiveClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/live-classes");

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.liveClass.findMany({
      where: { teacherId: user.id, startsAt: { gte: now }, status: { in: ["SCHEDULED", "LIVE"] } },
      include: { _count: { select: { participants: true } } },
      orderBy: { startsAt: "asc" },
    }),
    db.liveClass.findMany({
      where: { teacherId: user.id, startsAt: { lt: now } },
      include: { _count: { select: { participants: true } } },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Live Classes</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Schedule interactive sessions — the classroom itself arrives in Phase 7.
          </p>
        </div>
        <ScheduleLiveClassModal />
      </div>

      <section aria-labelledby="upcoming-lc">
        <h2 id="upcoming-lc" className="mb-4 font-display text-base font-bold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon={<MonitorPlay />}
            title="Nothing scheduled"
            description="Schedule your first live class to reach students in real time."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((live) => (
              <Card key={live.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <MonitorPlay className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-bold text-foreground">{live.title}</h3>
                    {live.status === "LIVE" && <Badge variant="success">Live now</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-fg">
                    {formatDate(live.startsAt)} · {formatTime(live.startsAt)} · {live.durationMinutes} min ·{" "}
                    {live._count.participants}/{live.maxStudents} registered
                  </p>
                  <p className="mt-1 text-[11px] text-faint-fg">
                    {live.recordingEnabled ? "🎥 Recording enabled" : "No recording"} ·{" "}
                    {live.price > 0 ? formatBDT(live.price) : "Free"}
                  </p>
                </div>
                <ActionButton
                  variant="outline"
                  size="sm"
                  action={cancelLiveClass.bind(null, live.id)}
                  confirm="Cancel this live class? Registered students will be notified."
                >
                  Cancel class
                </ActionButton>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="past-lc">
        <h2 id="past-lc" className="mb-4 font-display text-base font-bold text-foreground">
          History
        </h2>
        {past.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
            No past classes yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((live) => (
              <Card key={live.id} className="flex items-center gap-4 p-5 opacity-80">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-2 text-muted-fg">
                  <Video className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-bold text-foreground">{live.title}</h3>
                  <p className="text-[12px] text-muted-fg">
                    {formatDate(live.startsAt)} · {live._count.participants} participants
                  </p>
                </div>
                <Badge variant="neutral">{live.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
