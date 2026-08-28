"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validation/profile";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

export async function updateProfile(input: {
  name: string;
  phone?: string | null;
  bio?: string | null;
  headline?: string | null;
  interests?: string[];
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = updateProfileSchema.parse(input);

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { name: data.name, phone: data.phone ?? null, bio: data.bio ?? null },
      }),
      db.studentProfile.upsert({
        where: { userId: user.id },
        update: {
          headline: data.headline ?? null,
          interests: data.interests ?? [],
        },
        create: {
          userId: user.id,
          headline: data.headline ?? null,
          interests: data.interests ?? [],
        },
      }),
    ]);

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "profile.update",
      entityType: "User",
      entityId: user.id,
    });
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = changePasswordSchema.parse(input);

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) return actionError("Current password is incorrect.");

    const passwordHash = await hashPassword(data.newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "auth.changePassword",
      entityType: "User",
      entityId: user.id,
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function removeWishlistItem(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const item = await db.wishlistItem.findFirst({ where: { id, userId: user.id } });
    if (!item) return actionError("Wishlist item not found.");
    await db.wishlistItem.delete({ where: { id } });
    revalidatePath("/dashboard/wishlist");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function registerLiveClass(
  liveClassId: string,
): Promise<ActionResult & { redirectUrl?: string; paid?: boolean }> {
  try {
    const user = await requireUser();
    const live = await db.liveClass.findUnique({
      where: { id: liveClassId },
      include: { _count: { select: { participants: true } }, teacher: true },
    });
    if (!live || live.status === "CANCELLED" || live.status === "ENDED") {
      return actionError("This class is not open for registration.");
    }
    if (live.startsAt <= new Date()) return actionError("This class has already started.");
    if (live._count.participants >= live.maxStudents) {
      return actionError("This class is full.");
    }

    const existing = await db.liveClassParticipant.findUnique({
      where: { liveClassId_userId: { liveClassId, userId: user.id } },
    });
    if (existing) return actionError("You are already registered for this class.");

    // Paid classes go through checkout (verified server-side).
    if (live.price > 0) {
      const openOrder = await db.payment.findFirst({
        where: { studentId: user.id, liveClassId, purpose: "LIVE_CLASS", status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      const payment = openOrder
        ? openOrder
        : await db.payment.create({
            data: {
              studentId: user.id,
              amount: live.price,
              currency: "BDT",
              method: "DEV",
              provider: "DEV",
              status: "PENDING",
              purpose: "LIVE_CLASS",
              liveClassId,
              metadata: { description: `Live class: ${live.title}` },
            },
          });
      return { ok: true, redirectUrl: `/checkout/${payment.id}`, paid: true };
    }

    await db.liveClassParticipant.create({
      data: { liveClassId, userId: user.id, role: "STUDENT", attendanceStatus: "REGISTERED" },
    });
    await createNotification({
      userId: live.teacherId,
      type: "NEW_BOOKING",
      title: "New live class registration",
      body: `${user.name} registered for "${live.title}".`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.register",
      entityType: "LiveClass",
      entityId: liveClassId,
    });
    revalidatePath("/dashboard/live");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function unregisterLiveClass(liveClassId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const live = await db.liveClass.findUnique({ where: { id: liveClassId } });
    if (!live || live.startsAt <= new Date()) return actionError("Too late to unregister.");

    const participant = await db.liveClassParticipant.findUnique({
      where: { liveClassId_userId: { liveClassId, userId: user.id } },
    });
    if (!participant) return actionError("You are not registered for this class.");

    await db.liveClassParticipant.delete({ where: { id: participant.id } });
    revalidatePath("/dashboard/live");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const booking = await db.booking.findFirst({
      where: { id: bookingId, studentId: user.id },
      include: { teacher: true },
    });
    if (!booking) return actionError("Booking not found.");
    if (!["PENDING", "ACCEPTED"].includes(booking.status)) {
      return actionError("This booking can no longer be cancelled.");
    }

    await db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
    await createNotification({
      userId: booking.teacherId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: `${user.name} cancelled their 1-on-1 session on ${booking.startsAt.toDateString()}.`,
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "booking.cancel",
      entityType: "Booking",
      entityId: bookingId,
    });
    revalidatePath("/dashboard/bookings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
