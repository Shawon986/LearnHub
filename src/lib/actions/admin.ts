"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { createNotification, createNotificationMany } from "@/lib/notifications";
import { setSetting } from "@/lib/settings";
import { slugify } from "@/lib/utils";
import {
  adminRoleSchema,
  adminUserActionSchema,
  announcementSchema,
  categorySchema,
  platformSettingsSchema,
  verificationReviewSchema,
} from "@/lib/validation/admin";
import { actionError, type ActionResult } from "@/lib/actions/shared";

const ADMIN_ROLES = ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"];

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

async function requireAdminActor() {
  return requireRole(...ADMIN_ROLES);
}

export async function setUserStatus(input: { userId: string; action: "SUSPEND" | "BAN" | "ACTIVATE" }): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const data = adminUserActionSchema.parse(input);

    const target = await db.user.findUnique({ where: { id: data.userId } });
    if (!target) return actionError("User not found.");
    if (target.id === actor.id) return actionError("You cannot change your own status.");
    // Only SUPER_ADMIN can discipline other admins.
    if (["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(target.role) && actor.role !== "SUPER_ADMIN") {
      return actionError("Only a super admin can change another admin's status.");
    }

    const status = data.action === "SUSPEND" ? "SUSPENDED" : data.action === "BAN" ? "BANNED" : "ACTIVE";
    await db.user.update({ where: { id: data.userId }, data: { status } });
    await createNotification({
      userId: target.id,
      type: "SYSTEM",
      title: `Account ${status.toLowerCase()}`,
      body: `Your account status was changed to ${status} by an administrator.`,
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `user.${data.action.toLowerCase()}`,
      entityType: "User",
      entityId: target.id,
      metadata: { targetEmail: target.email },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Permanently delete a user (fails with guidance when content references exist). */
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return actionError("User not found.");
    if (target.id === actor.id) return actionError("You cannot delete your own account.");
    if (ADMIN_ROLES.includes(target.role) && actor.role !== "SUPER_ADMIN") {
      return actionError("Only a super admin can delete another admin.");
    }

    try {
      await db.user.delete({ where: { id: userId } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        return actionError(
          "This user has courses, bookings, payments or messages — suspend or ban them instead.",
        );
      }
      throw e;
    }
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.delete",
      entityType: "User",
      entityId: userId,
      metadata: { targetEmail: target.email },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function setUserRole(input: { userId: string; role: string }): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const data = adminRoleSchema.parse(input);

    const target = await db.user.findUnique({ where: { id: data.userId } });
    if (!target) return actionError("User not found.");
    if (target.id === actor.id) return actionError("You cannot change your own role.");
    const isAdminTarget = ADMIN_ROLES.includes(data.role);
    const isAdminCurrent = ADMIN_ROLES.includes(target.role);
    // Only SUPER_ADMIN can grant/remove admin roles.
    if ((isAdminTarget || isAdminCurrent) && actor.role !== "SUPER_ADMIN") {
      return actionError("Only a super admin can change admin roles.");
    }

    await db.user.update({ where: { id: data.userId }, data: { role: data.role } });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "user.roleChange",
      entityType: "User",
      entityId: target.id,
      metadata: { from: target.role, to: data.role, targetEmail: target.email },
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function reviewVerification(input: {
  teacherId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "SUSPENDED";
  reason?: string | null;
}): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const data = verificationReviewSchema.parse(input);

    const verification = await db.teacherVerification.findUnique({
      where: { teacherId: data.teacherId },
    });
    if (!verification) return actionError("Verification application not found.");

    await db.$transaction([
      db.teacherVerification.update({
        where: { id: verification.id },
        data: {
          status: data.decision,
          reviewedAt: new Date(),
          reviewedById: actor.id,
          rejectionReason: data.decision === "REJECTED" || data.decision === "CHANGES_REQUESTED" ? data.reason ?? null : null,
        },
      }),
      db.teacherProfile.update({
        where: { userId: data.teacherId },
        data: { verified: data.decision === "APPROVED" },
      }),
    ]);

    const titleMap = {
      APPROVED: "You are verified! 🎉",
      REJECTED: "Verification rejected",
      CHANGES_REQUESTED: "Verification needs changes",
      SUSPENDED: "Verification suspended",
    };
    await createNotification({
      userId: data.teacherId,
      type: "SYSTEM",
      title: titleMap[data.decision],
      body:
        data.decision === "APPROVED"
          ? "Your profile now shows the verified badge across the platform."
          : data.reason || "Contact support for details.",
    });
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `verification.${data.decision.toLowerCase()}`,
      entityType: "TeacherVerification",
      entityId: verification.id,
      metadata: { teacherId: data.teacherId },
    });
    revalidatePath("/admin/verification");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function upsertCategory(input: {
  id?: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  isFeatured: boolean;
  sortOrder: number;
}): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const data = categorySchema.parse(input);

    let slug = slugify(data.name);
    const clash = await db.category.findFirst({ where: { slug, id: { not: data.id } } });
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    if (data.id) {
      await db.category.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          icon: data.icon ?? null,
          color: data.color ?? null,
          isFeatured: data.isFeatured,
          sortOrder: data.sortOrder,
        },
      });
    } else {
      await db.category.create({
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          icon: data.icon ?? null,
          color: data.color ?? null,
          isFeatured: data.isFeatured,
          sortOrder: data.sortOrder,
        },
      });
    }
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: data.id ? "category.update" : "category.create",
      entityType: "Category",
      entityId: data.id,
      metadata: { name: data.name },
    });
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function savePlatformSettings(input: {
  commissionRate: number;
  referralReward: number;
  referralMinPurchase: number;
  withdrawalMin: number;
  withdrawalFeePercent: number;
  platformName: string;
  platformTagline: string;
  contactEmail: string;
}): Promise<ActionResult> {
  try {
    const actor = await requireRole("ADMIN", "SUPER_ADMIN");
    const data = platformSettingsSchema.parse(input);

    const entries: [string, unknown][] = [
      ["commission.ratePercent", data.commissionRate],
      ["referral.rewardAmountBdt", data.referralReward],
      ["referral.minPurchaseBdt", data.referralMinPurchase],
      ["withdrawal.minAmountBdt", data.withdrawalMin],
      ["withdrawal.feePercent", data.withdrawalFeePercent],
      ["platform.name", data.platformName],
      ["platform.tagline", data.platformTagline],
      ["platform.contactEmail", data.contactEmail],
    ];
    for (const [key, value] of entries) {
      await setSetting(key, value, actor.id);
    }
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "platformSettings.update",
      entityType: "PlatformSetting",
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  audience: "ALL" | "STUDENTS" | "TEACHERS";
}): Promise<ActionResult> {
  try {
    const actor = await requireAdminActor();
    const data = announcementSchema.parse(input);

    await db.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        audience: data.audience,
        isActive: true,
        createdById: actor.id,
      },
    });

    // Fan out to the audience.
    const roleFilter =
      data.audience === "STUDENTS"
        ? { role: "STUDENT" }
        : data.audience === "TEACHERS"
          ? { role: "TEACHER" }
          : { role: { in: ["STUDENT", "TEACHER"] } };
    const users = await db.user.findMany({ where: roleFilter, select: { id: true } });
    await createNotificationMany(users.map((u) => u.id), {
      type: "ADMIN_ANNOUNCEMENT",
      title: data.title,
      body: data.body,
    });

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "announcement.create",
      entityType: "Announcement",
      metadata: { audience: data.audience, recipients: users.length },
    });
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
