import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, MonitorPlay } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/action-button";
import { unregisterLiveClass } from "@/lib/actions/student";
import { LiveRegisterButton } from "./live-register-button";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Live Classes" };

export default async function LiveClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/live");

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.liveClass.findMany({
      where: { startsAt: { gte: now }, status: { in: ["SCHEDULED"] } },
      include: {
        teacher: true,
        participants: { where: { userId: user.id } },
        _count: { select: { participants: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    db.liveClass.findMany({
      where: { startsAt: { lt: now } },
      include: {
        teacher: true,
        participants: { where: { userId: user.id } },
      },
      orderBy: { startsAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Live Classes</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Register for upcoming sessions — you&apos;ll get the meeting link and a reminder before each one starts.
        </p>
      </div>

      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 font-display text-base font-bold text-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<MonitorPlay />}
            title="No upcoming live classes"
            description="Check back soon — teachers schedule new classes every week."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((live) => {
              const registered = live.participants.length > 0;
              const full = live._count.participants >= live.maxStudents;
              const started = live.startsAt <= now;
              return (
                <Card key={live.id} className="flex flex-wrap items-center gap-4 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
                    <MonitorPlay className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[15px] font-bold text-foreground">{live.title}</h3>
                      {registered && (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3" /> Registered
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-fg">
                      {live.teacher.name} · {formatDate(live.startsAt)} at {formatTime(live.startsAt)} ·{" "}
                      {live.durationMinutes} min · {live._count.participants}/{live.maxStudents} seats
                    </p>
                    {registered && !started && (
                      <p className="mt-1 text-[11px] font-semibold text-muted-fg">
                        Starts {formatDate(live.startsAt)} at {formatTime(live.startsAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {registered ? (
                      <>
                        {started && (
                          <a
                            href={live.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center rounded-xl bg-success px-4 text-[13px] font-bold text-white transition-colors hover:bg-success/90"
                          >
                            Join meeting →
                          </a>
                        )}
                        <ActionButton
                          variant="outline"
                          size="sm"
                          action={unregisterLiveClass.bind(null, live.id)}
                          confirm="Leave this class? Your seat will be freed."
                        >
                          Leave
                        </ActionButton>
                      </>
                    ) : full || started ? (
                      <Badge variant="danger">{full ? "Full" : "Started"}</Badge>
                    ) : (
                      <LiveRegisterButton liveClassId={live.id} />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="past-heading">
        <h2 id="past-heading" className="mb-4 font-display text-base font-bold text-foreground">
          Past classes
        </h2>
        {past.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
            Nothing here yet.
          </p>
        ) : (
          <div className="space-y-3">
            {past.map((live) => (
              <Card key={live.id} className="flex items-center gap-4 p-5 opacity-80">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card-2 text-muted-fg">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-bold text-foreground">{live.title}</h3>
                  <p className="text-[12px] text-muted-fg">
                    {live.teacher.name} · {formatDate(live.startsAt)}
                  </p>
                </div>
                <Badge variant={live.status === "CANCELLED" ? "danger" : "neutral"}>{live.status}</Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
