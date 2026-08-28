import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AvailabilityManager } from "./availability-manager";

export const metadata: Metadata = { title: "Availability" };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/availability");

  const [slots, exceptions] = await Promise.all([
    db.availabilitySlot.findMany({ where: { teacherId: user.id } }),
    db.availabilityException.findMany({
      where: { teacherId: user.id, date: { gte: new Date(new Date().getTime() - 24 * 60 * 60_000) } },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Availability</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Define your weekly tutoring hours and block specific dates. Students book only what you offer.
        </p>
      </div>

      <AvailabilityManager
        initialSlots={slots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }))}
        initialExceptions={exceptions.map((e) => ({
          id: e.id,
          date: e.date.toISOString().slice(0, 10),
          reason: e.reason ?? "",
        }))}
        dayNames={DAY_NAMES}
      />
    </div>
  );
}
