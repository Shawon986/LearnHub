"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  date: string; // ISO
  kind: "booking" | "live";
  label: string;
  time: string; // ISO
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function TeacherCalendar({ events }: { events: CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = new Date(e.date).toDateString();
    const list = eventsByDay.get(key) ?? [];
    list.push(e);
    eventsByDay.set(key, list);
  }

  const shift = (delta: number) => setCursor(new Date(year, month + delta, 1));

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-foreground">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-full p-2 text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shift(0 - (year * 12 + month) + (today.getFullYear() * 12 + today.getMonth()))}
            className="rounded-full px-3 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-full p-2 text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-24 border-b border-r border-line bg-card-2/40" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = new Date(year, month, day).toDateString();
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === today.toDateString();
          return (
            <div
              key={day}
              className={cn(
                "min-h-24 border-b border-r border-line p-1.5",
                isToday && "bg-brand-soft/30",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  isToday ? "bg-brand text-white" : "text-muted-fg",
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((e, idx) => (
                  <div key={idx} className="truncate">
                    <Badge
                      variant={e.kind === "live" ? "accent" : "brand"}
                      size="sm"
                      className="w-full justify-start truncate"
                    >
                      <span className="truncate">
                        {formatTime(e.time)} · {e.label}
                      </span>
                    </Badge>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <p className="px-1 text-[10px] font-bold text-faint-fg">+{dayEvents.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[11px] font-semibold text-muted-fg">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden /> 1-on-1 booking
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden /> Live class
        </span>
      </div>
    </Card>
  );
}
