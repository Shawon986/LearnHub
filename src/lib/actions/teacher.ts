"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, createNotificationMany, notifyAdmins, emailIfEnabled } from "@/lib/notifications";
import { getWithdrawalMinimum } from "@/lib/settings";
import { slugify } from "@/lib/utils";
import {
  availabilitySlotSchema,
  bookingResponseSchema,
  createCourseSchema,
  educationSchema,
  experienceSchema,
  liveClassSchema,
  skillSchema,
  teacherProfileSchema,
  withdrawalSchema,
} from "@/lib/validation/profile";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Teacher scope: the calling user must be a TEACHER (admins manage separately). */
async function requireTeacher() {
  return requireRole("TEACHER", "ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN");
}

export async function updateTeacherProfile(input: {
  headline?: string | null;
  about?: string | null;
  hourlyRate: number;
  yearsExperience: number;
  languages: string[];
  location?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = teacherProfileSchema.parse(input);

    await db.teacherProfile.upsert({
      where: { userId: user.id },
      update: {
        headline: data.headline ?? null,
        about: data.about ?? null,
        hourlyRate: data.hourlyRate,
        yearsExperience: data.yearsExperience,
        languages: data.languages,
        location: data.location ?? null,
      },
      create: {
        userId: user.id,
        headline: data.headline ?? null,
        about: data.about ?? null,
        hourlyRate: data.hourlyRate,
        yearsExperience: data.yearsExperience,
        languages: data.languages,
        location: data.location ?? null,
      },
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "teacherProfile.update",
      entityType: "User",
      entityId: user.id,
    });
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function upsertSkill(input: { id?: string; name: string; proficiency: string }): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = skillSchema.parse(input);
    if (data.id) {
      const owned = await db.teacherSkill.findFirst({ where: { id: data.id, teacherId: user.id } });
      if (!owned) return actionError("Skill not found.");
      await db.teacherSkill.update({
        where: { id: data.id },
        data: { name: data.name, proficiency: data.proficiency },
      });
    } else {
      await db.teacherSkill.create({
        data: { teacherId: user.id, name: data.name, proficiency: data.proficiency },
      });
    }
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteSkill(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    await db.teacherSkill.deleteMany({ where: { id, teacherId: user.id } });
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function upsertEducation(input: {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startYear: number;
  endYear?: number | null;
  description?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = educationSchema.parse(input);
    if (data.id) {
      const owned = await db.teacherEducation.findFirst({
        where: { id: data.id, teacherId: user.id },
      });
      if (!owned) return actionError("Education entry not found.");
      await db.teacherEducation.update({
        where: { id: data.id },
        data: {
          institution: data.institution,
          degree: data.degree,
          fieldOfStudy: data.fieldOfStudy ?? null,
          startYear: data.startYear,
          endYear: data.endYear ?? null,
          description: data.description ?? null,
        },
      });
    } else {
      await db.teacherEducation.create({
        data: {
          teacherId: user.id,
          institution: data.institution,
          degree: data.degree,
          fieldOfStudy: data.fieldOfStudy ?? null,
          startYear: data.startYear,
          endYear: data.endYear ?? null,
          description: data.description ?? null,
        },
      });
    }
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteEducation(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    await db.teacherEducation.deleteMany({ where: { id, teacherId: user.id } });
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function upsertExperience(input: {
  id?: string;
  title: string;
  company: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  current: boolean;
  description?: string | null;
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = experienceSchema.parse(input);
    if (data.id) {
      const owned = await db.teacherExperience.findFirst({
        where: { id: data.id, teacherId: user.id },
      });
      if (!owned) return actionError("Experience entry not found.");
      await db.teacherExperience.update({
        where: { id: data.id },
        data: {
          title: data.title,
          company: data.company,
          startDate: data.startDate,
          endDate: data.current ? null : data.endDate ?? null,
          current: data.current,
          description: data.description ?? null,
        },
      });
    } else {
      await db.teacherExperience.create({
        data: {
          teacherId: user.id,
          title: data.title,
          company: data.company,
          startDate: data.startDate,
          endDate: data.current ? null : data.endDate ?? null,
          current: data.current,
          description: data.description ?? null,
        },
      });
    }
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteExperience(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    await db.teacherExperience.deleteMany({ where: { id, teacherId: user.id } });
    revalidatePath("/teacher/profile");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function addAvailabilitySlot(input: { dayOfWeek: number; startTime: string; endTime: string }): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = availabilitySlotSchema.parse(input);
    if (data.startTime >= data.endTime) return actionError("End time must be after start time.");
    await db.availabilitySlot.create({ data: { teacherId: user.id, ...data } });
    revalidatePath("/teacher/availability");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function deleteAvailabilitySlot(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    await db.availabilitySlot.deleteMany({ where: { id, teacherId: user.id } });
    revalidatePath("/teacher/availability");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function toggleAvailabilityException(input: { date: string; reason?: string }): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) return actionError("Invalid date.");

    const existing = await db.availabilityException.findUnique({
      where: { teacherId_date: { teacherId: user.id, date } },
    });
    if (existing) {
      await db.availabilityException.delete({ where: { id: existing.id } });
    } else {
      await db.availabilityException.create({
        data: { teacherId: user.id, date, isBlocked: true, reason: input.reason || null },
      });
    }
    revalidatePath("/teacher/availability");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function scheduleLiveClass(input: {
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxStudents: number;
  meetingUrl: string;
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = liveClassSchema.parse(input);
    const startsAt = new Date(`${data.date}T${data.startTime}:00`);
    if (startsAt <= new Date()) return actionError("Start time must be in the future.");

    await db.liveClass.create({
      data: {
        teacherId: user.id,
        title: data.title,
        description: data.description ?? null,
        startsAt,
        endsAt: new Date(startsAt.getTime() + data.durationMinutes * 60_000),
        durationMinutes: data.durationMinutes,
        maxStudents: data.maxStudents,
        meetingUrl: data.meetingUrl,
        status: "SCHEDULED",
      },
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.create",
      entityType: "LiveClass",
    });
    revalidatePath("/teacher/live-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function markLiveClassEnded(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const live = await db.liveClass.findFirst({ where: { id, teacherId: user.id } });
    if (!live) return actionError("Class not found.");
    if (live.status !== "SCHEDULED") return actionError("Only scheduled classes can be marked as ended.");

    await db.liveClass.update({ where: { id }, data: { status: "ENDED" } });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.end",
      entityType: "LiveClass",
      entityId: id,
    });
    revalidatePath("/teacher/live-classes");
    revalidatePath("/dashboard/live");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function cancelLiveClass(id: string): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const live = await db.liveClass.findFirst({ where: { id, teacherId: user.id } });
    if (!live) return actionError("Class not found.");
    if (live.status === "ENDED") return actionError("This class has already ended.");

    await db.liveClass.update({ where: { id }, data: { status: "CANCELLED" } });
    const participants = await db.liveClassParticipant.findMany({
      where: { liveClassId: id },
      select: { userId: true },
    });
    await createNotificationMany(
      participants.map((p) => p.userId),
      {
        type: "BOOKING_CANCELLED",
        title: "Live class cancelled",
        body: `"${live.title}" has been cancelled by the teacher.`,
      },
    );
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "liveClass.cancel",
      entityType: "LiveClass",
      entityId: id,
    });
    revalidatePath("/teacher/live-classes");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function respondBooking(input: { bookingId: string; action: "ACCEPT" | "DECLINE" }): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = bookingResponseSchema.parse(input);
    const booking = await db.booking.findFirst({
      where: { id: data.bookingId, teacherId: user.id },
      include: { student: true },
    });
    if (!booking) return actionError("Booking not found.");
    if (booking.status !== "PENDING") return actionError("This booking was already handled.");

    const status = data.action === "ACCEPT" ? "ACCEPTED" : "DECLINED";
    await db.booking.update({ where: { id: booking.id }, data: { status } });

    // On accept: create the payment order so the student can complete
    // checkout (Phase 6). Payment is required to confirm the session.
    let checkoutPath: string | null = null;
    if (data.action === "ACCEPT" && booking.price > 0) {
      const existing = await db.payment.findFirst({
        where: { bookingId: booking.id, purpose: "BOOKING", status: { in: ["PENDING", "COMPLETED"] } },
      });
      if (!existing) {
        const payment = await db.payment.create({
          data: {
            studentId: booking.studentId,
            amount: booking.price,
            currency: "BDT",
            method: "DEV",
            provider: "DEV",
            status: "PENDING",
            purpose: "BOOKING",
            bookingId: booking.id,
            metadata: { description: `1-on-1 session with ${user.name}` },
          },
        });
        checkoutPath = `/checkout/${payment.id}`;
      }
    }

    await createNotification({
      userId: booking.studentId,
      type: data.action === "ACCEPT" ? "BOOKING_ACCEPTED" : "BOOKING_CANCELLED",
      title: data.action === "ACCEPT" ? "Booking accepted! 🎉" : "Booking declined",
      body:
        data.action === "ACCEPT"
          ? `${user.name} accepted your session on ${booking.startsAt.toDateString()}.${
              checkoutPath ? " Complete payment to confirm your seat." : ""
            }`
          : `${user.name} declined your session on ${booking.startsAt.toDateString()}.`,
      ...(checkoutPath ? { data: { checkoutPath } } : {}),
    });
    emailIfEnabled(
      booking.studentId,
      data.action === "ACCEPT" ? "BOOKING_ACCEPTED" : "BOOKING_CANCELLED",
      data.action === "ACCEPT" ? "Your booking was accepted 🎉" : "Your booking was declined",
      `${user.name} ${data.action === "ACCEPT" ? "accepted" : "declined"} your 1-on-1 session on ${booking.startsAt.toDateString()}.`,
    ).catch(() => {});
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: `booking.${data.action.toLowerCase()}`,
      entityType: "Booking",
      entityId: booking.id,
    });
    revalidatePath("/teacher/bookings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function requestWithdrawal(input: {
  amount: number;
  method: string;
  accountDetails: { accountNumber: string; accountHolder: string; note?: string };
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = withdrawalSchema.parse(input);
    const wallet = await db.teacherWallet.findUnique({ where: { teacherId: user.id } });
    if (!wallet) return actionError("Wallet not found.");

    const minimum = await getWithdrawalMinimum();
    if (data.amount < minimum) return actionError(`Minimum withdrawal is ৳${minimum.toLocaleString()}.`);
    if (data.amount > wallet.availableBalance) {
      return actionError("Amount exceeds your available balance.");
    }

    const withdrawal = await db.withdrawal.create({
      data: {
        teacherId: user.id,
        amount: data.amount,
        method: data.method,
        accountDetails: data.accountDetails,
        status: "PENDING",
      },
    });
    // Hold the funds while the withdrawal is under review.
    await db.teacherWallet.update({
      where: { id: wallet.id },
      data: {
        availableBalance: { decrement: data.amount },
        pendingBalance: { increment: data.amount },
      },
    });
    await db.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount: data.amount,
        description: "Withdrawal request (under review)",
        withdrawalId: withdrawal.id,
        balanceAfter: wallet.availableBalance - data.amount,
      },
    });
    await notifyAdmins({
      type: "WITHDRAWAL_REQUESTED",
      title: "New withdrawal request",
      body: `${user.name} requested ৳${data.amount.toLocaleString()} via ${data.method}.`,
      data: { withdrawalId: withdrawal.id },
    });
    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "withdrawal.request",
      entityType: "Withdrawal",
      entityId: withdrawal.id,
      metadata: { amount: data.amount, method: data.method },
    });
    revalidatePath("/teacher/earnings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function createCourse(input: {
  title: string;
  subtitle?: string | null;
  categoryId: string;
  type: string;
  difficulty: string;
  price: number;
  language: string;
}): Promise<ActionResult> {
  try {
    const user = await requireTeacher();
    const data = createCourseSchema.parse(input);

    const category = await db.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return actionError("Category not found.");

    let slug = slugify(data.title);
    const existing = await db.course.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    // No draft stage: new courses go straight to admin review.
    const course = await db.course.create({
      data: {
        teacherId: user.id,
        title: data.title,
        slug,
        subtitle: data.subtitle ?? null,
        categoryId: data.categoryId,
        type: data.type,
        difficulty: data.difficulty,
        price: data.price,
        language: data.language,
        status: "REVIEW",
        requirements: [],
        outcomes: [],
        tags: [],
      },
    });

    await notifyAdmins({
      type: "COURSE_SUBMITTED",
      title: "New course submitted for review",
      body: `"${data.title}" by ${user.name} is waiting for approval.`,
      data: { courseId: course.id },
    });

    await logAudit({
      actorId: user.id,
      actorEmail: user.email,
      action: "course.create",
      entityType: "Course",
      entityId: course.id,
    });
    revalidatePath("/teacher/courses");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
