"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatBDT, formatDate } from "@/lib/format";
import { requestBooking } from "@/lib/actions/booking";

const DURATIONS = [30, 60, 90, 120];

export function BookingButton({
  teacherId,
  teacherName,
  hourlyRate,
}: {
  teacherId: string;
  teacherName: string;
  hourlyRate: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        Book a session
      </Button>
      {open && (
        <BookingModal
          teacherId={teacherId}
          teacherName={teacherName}
          hourlyRate={hourlyRate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function BookingModal({
  teacherId,
  teacherName,
  hourlyRate,
  onClose,
}: {
  teacherId: string;
  teacherName: string;
  hourlyRate: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [dates, setDates] = useState<string[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [topic, setTopic] = useState("");

  const loadDates = useCallback(async () => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}/availability`);
      if (res.ok) setDates((await res.json()).dates);
    } catch {
      // non-critical
    }
  }, [teacherId]);

  const loadSlots = useCallback(
    async (isoDate: string) => {
      setSlots(null);
      setTime(null);
      try {
        const res = await fetch(`/api/teachers/${teacherId}/availability?date=${isoDate}`);
        if (res.ok) setSlots((await res.json()).slots);
      } catch {
        // non-critical
      }
    },
    [teacherId],
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      loadDates();
    });
    return () => cancelAnimationFrame(raf);
  }, [loadDates]);

  useEffect(() => {
    if (date) {
      const raf = requestAnimationFrame(() => {
        loadSlots(date);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [date, loadSlots]);

  const price = Math.round((hourlyRate * duration) / 60);

  function submit() {
    if (!date || !time) return;
    startTransition(async () => {
      const result = await requestBooking({
        teacherId,
        startsAt: `${date}T${time}:00`,
        durationMinutes: duration,
        topic: topic || null,
      });
      if (result.ok) {
        toast({
          title: "Booking requested 🎉",
          description: `${teacherName} will confirm shortly — you'll be notified.`,
          variant: "success",
        });
        onClose();
        router.push("/dashboard/bookings");
        router.refresh();
      } else {
        toast({ title: result.error ?? "Could not request the session.", variant: "error" });
      }
    });
  }

  return (
    <Modal open onClose={onClose} title={`Book ${teacherName}`} description="Pick a time that works for you.">
      <div className="space-y-5">
        {/* Step 1: date */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-faint-fg">
            <CalendarDays className="h-3.5 w-3.5" /> 1 · Pick a date
          </p>
          {dates === null ? (
            <div className="flex items-center gap-2 py-4 text-[12px] text-faint-fg">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading availability…
            </div>
          ) : dates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-[12px] text-faint-fg">
              No availability in the next 14 days — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setTime(null);
                  }}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-colors",
                    date === d
                      ? "border-brand bg-brand-soft font-bold text-brand-fg"
                      : "border-line text-[12px] text-muted-fg hover:border-line-strong hover:bg-card-2",
                  )}
                >
                  <span className="block text-[12px] font-bold">{formatDate(d).split(" ")[0]}</span>
                  <span className="block text-[10px]">{formatDate(d).split(" ")[1]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: time */}
        {date && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-faint-fg">
              <Clock className="h-3.5 w-3.5" /> 2 · Pick a time
            </p>
            {slots === null ? (
              <div className="flex items-center gap-2 py-4 text-[12px] text-faint-fg">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading times…
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line p-4 text-center text-[12px] text-faint-fg">
                No free slots on this date.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTime(s)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-[12px] font-bold tabular-nums transition-colors",
                      time === s
                        ? "border-brand bg-brand-soft text-brand-fg"
                        : "border-line text-muted-fg hover:border-line-strong hover:bg-card-2",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: duration + topic */}
        {date && time && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-faint-fg">
                3 · Duration
              </p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 rounded-xl border px-2 py-2 text-[13px] font-bold transition-colors",
                      duration === d
                        ? "border-brand bg-brand-soft text-brand-fg"
                        : "border-line text-muted-fg hover:border-line-strong",
                    )}
                  >
                    {d < 60 ? `${d}m` : d === 60 ? "1h" : `${d / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="What do you want to cover? (optional)"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. React state management review"
            />

            <div className="flex items-center justify-between rounded-xl border border-line bg-card-2 px-4 py-3 text-[13px]">
              <span className="font-semibold text-muted-fg">Session price</span>
              <span className="font-display font-extrabold text-foreground">{formatBDT(price)}</span>
            </div>

            <Button className="w-full" size="lg" loading={pending} onClick={submit}>
              Request session
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
