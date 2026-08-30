"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { isBookingWindowValid } from "@/lib/availability";
import { z } from "zod";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

const requestBookingSchema = z.object({
  teacherId: z.string().min(1),
  startsAt: z.string().min(10), // ISO
  durationMinutes: z.coerce.number().int().min(30).max(240),
  topic: z.string().trim().max(300).optional().nullable(),
});

/**
 * Student requests a 1-on-1 session.
 * Payment is collected at acceptance (Phase 6); Phase 5 validates
 * availability + conflicts and routes the request for teacher approval.
 */
export async function requestBooking(input: {
  teacherId: string;
  startsAt: string;
  durationMinutes: number;
  topic?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireRole("STUDENT");
    const data = requestBookingSchema.parse(input);

    const teacher = await db.user.findFirst({
      where: { id: data.teacherId, role: "TEACHER", status: "ACTIVE" },
      include: { teacherProfile: true },
    });
    if (!teacher) return actionError("Teacher not found.");
    if (teacher.id === user.id) return actionError("You cannot book yourself.");

    const startsAt = new Date(data.startsAt);
    if (Number.isNaN(startsAt.getTime())) return actionError("Invalid start time.");

    // Student-side conflict check: no overlapping own bookings.
    const endsAt = new Date(startsAt.getTime() + data.durationMinutes * 60_000);
    const ownClash = await db.booking.findFirst({
      where: {
        studentId: user.id,
        status: { in: ["PENDING", "ACCEPTED"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (ownClash) {
      return actionError("You already have a session at this time.");
    }

    const check = await isBookingWindowValid(data.teacherId, startsAt, data.durationMinutes);
    if (!check.valid) return actionError(check.reason ?? "This time is not available.");

    const hourlyRate = teacher.teacherProfile?.hourlyRate ?? 0;
    const price = Math.round((hourlyRate * data.durationMinutes) / 60);

    const booking = await db.booking.create({
      data: {
        studentId: user.id,
        teacherId: teacher.id,
        startsAt,
        endsAt,
        durationMinutes: data.durationMinutes,
        price,
        topic: data.topic ?? null,
        status: "PENDING",
      },
    });

    await createNotification({
      userId: teacher.id,
      type: "NEW_BOOKING",
      title: "New booking request 📅",
      body: `${user.name} requested ${data.durationMinutes} min on ${startsAt.toDateString()} (৳${price.toLocaleString()}).`,
      data: { bookingId: booking.id },
    });
    await notifyAdmins({
      type: "NEW_BOOKING",
      title: "New booking request",
      body: `${user.name} → ${teacher.name}: ${data.durationMinutes} min (৳${price.toLocaleString()}).`,
      data: { bookingId: booking.id },
    });
    await createNotification({
      userId: user.id,
      type: "SYSTEM",
      title: "Booking request sent",
      body: `Waiting for ${teacher.name} to confirm — you'll be notified either way.`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "booking.request",
      entityType: "Booking",
      entityId: booking.id,
      metadata: { teacherId: teacher.id, price },
    });

    revalidatePath("/dashboard/bookings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Teacher marks a past session COMPLETED or NO_SHOW. */
export async function markBookingCompleted(
  bookingId: string,
  outcome: "COMPLETED" | "NO_SHOW",
): Promise<ActionResult> {
  try {
    const teacher = await requireRole("TEACHER", "ADMIN", "SUPER_ADMIN");
    const booking = await db.booking.findFirst({
      where: { id: bookingId, teacherId: teacher.id },
      include: { student: { select: { name: true } } },
    });
    if (!booking) return actionError("Booking not found.");
    if (booking.status !== "ACCEPTED") {
      return actionError("Only accepted sessions can be marked complete.");
    }
    if (booking.endsAt > new Date()) {
      return actionError("The session hasn't ended yet.");
    }

    await db.booking.update({
      where: { id: bookingId },
      data: { status: outcome, reviewed: false },
    });
    await createNotification({
      userId: booking.studentId,
      type: "SYSTEM",
      title: outcome === "COMPLETED" ? "Session completed 🎓" : "Session marked as no-show",
      body:
        outcome === "COMPLETED"
          ? `${teacher.name} marked your session as complete — you can now leave a review.`
          : `${teacher.name} marked this session as a no-show.`,
    });
    await logAudit({
      actorId: teacher.id,
      actorEmail: teacher.email,
      action: `booking.${outcome.toLowerCase()}`,
      entityType: "Booking",
      entityId: bookingId,
    });
    revalidatePath("/teacher/bookings");
    revalidatePath("/dashboard/bookings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
