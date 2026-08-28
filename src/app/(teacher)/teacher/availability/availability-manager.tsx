"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { addAvailabilitySlot, deleteAvailabilitySlot, toggleAvailabilityException } from "@/lib/actions/teacher";

interface Slot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface Exception {
  id: string;
  date: string;
  reason: string;
}

export function AvailabilityManager({
  initialSlots,
  initialExceptions,
  dayNames,
}: {
  initialSlots: Slot[];
  initialExceptions: Exception[];
  dayNames: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const slotsByDay = new Map<number, Slot[]>();
  for (const s of initialSlots) {
    const list = slotsByDay.get(s.dayOfWeek) ?? [];
    list.push(s);
    slotsByDay.set(s.dayOfWeek, list);
  }

  function onAddSlot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await addAvailabilitySlot({
        dayOfWeek: Number(form.get("dayOfWeek")),
        startTime: String(form.get("startTime")),
        endTime: String(form.get("endTime")),
      });
      if (result.ok) {
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else setError(result.error ?? "Could not add slot.");
    });
  }

  function onBlockDate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await toggleAvailabilityException({
        date: String(form.get("date")),
        reason: String(form.get("reason") ?? ""),
      });
      if (result.ok) {
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else setError(result.error ?? "Could not update date.");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Weekly hours */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly hours</CardTitle>
          <CardDescription>These slots are what students can book for 1-on-1 sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {dayNames.map((name, day) => (
            <div key={name} className="flex items-start gap-3">
              <span className="w-24 shrink-0 pt-1 text-[12px] font-bold text-muted-fg">{name}</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {(slotsByDay.get(day) ?? []).map((s) => (
                  <Badge key={s.id} variant="brand" size="md">
                    {s.startTime}–{s.endTime}
                    <button
                      type="button"
                      aria-label={`Remove ${s.startTime}–${s.endTime} slot`}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteAvailabilitySlot(s.id);
                          router.refresh();
                        })
                      }
                      className="ml-1 rounded-full p-0.5 hover:bg-brand-soft"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {(slotsByDay.get(day) ?? []).length === 0 && (
                  <span className="text-[12px] text-faint-fg">Off</span>
                )}
              </div>
            </div>
          ))}

          <form onSubmit={onAddSlot} className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
            <div className="w-36">
              <Select
                label="Day"
                name="dayOfWeek"
                options={dayNames.map((n, i) => ({ value: String(i), label: n }))}
              />
            </div>
            <div className="w-28">
              <Input label="Start" name="startTime" type="time" defaultValue="10:00" required />
            </div>
            <div className="w-28">
              <Input label="End" name="endTime" type="time" defaultValue="18:00" required />
            </div>
            <Button type="submit" size="sm" loading={pending} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Blocked dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="h-4 w-4 text-brand-fg" /> Blocked dates
          </CardTitle>
          <CardDescription>Holidays and off-days. Students cannot book these dates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onBlockDate} className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Input label="Date" name="date" type="date" required />
            </div>
            <div className="min-w-40 flex-1">
              <Input label="Reason (optional)" name="reason" placeholder="e.g. Family event" />
            </div>
            <Button type="submit" size="sm" loading={pending} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Block
            </Button>
          </form>

          {initialExceptions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-faint-fg">
              No blocked dates — you&apos;re fully available.
            </p>
          ) : (
            <ul className="space-y-2">
              {initialExceptions.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground">{formatDate(e.date)}</p>
                    {e.reason && <p className="text-[11px] text-faint-fg">{e.reason}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(async () => {
                        await toggleAvailabilityException({ date: e.date });
                        router.refresh();
                      })
                    }
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
