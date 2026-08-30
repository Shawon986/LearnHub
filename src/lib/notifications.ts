import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
import { messagingBus } from "@/lib/messaging/bus";
import type { NotificationType } from "@/lib/constants";

// Notification service — one place to create notifications for any
// platform event. Later phases add email/push fan-out based on
// NotificationPreference.

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const prefs = await db.notificationPreference.findUnique({
    where: { userId_type: { userId: input.userId, type: input.type } },
  });

  // Skip entirely if the user explicitly disabled in-app delivery.
  if (prefs && !prefs.inApp) return null;

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as object,
    },
  });

  // Real-time delivery: the personal SSE channel carries it to any open
  // browser tab (bell badge, dropdown, notification center).
  messagingBus.publishTo(input.userId, {
    type: "notification",
    id: notification.id,
    title: notification.title,
    body: notification.body,
    data: (input.data ?? {}) as Record<string, unknown>,
    createdAt: notification.createdAt.toISOString(),
  });

  return notification;
}

/** Notify many users at once (announcements, admin fan-out). */
export async function createNotificationMany(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  if (userIds.length === 0) return;
  const rows = await db.notification.createManyAndReturn({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as object,
    })),
  });
  // Realtime: push each REAL row to its recipient's open stream. Real ids
  // matter — the DB-canonical stream also delivers these rows, and the bell
  // dedupes by id. Fake ids here made every fan-out appear TWICE.
  for (const n of rows) {
    messagingBus.publishTo(n.userId, {
      type: "notification",
      id: n.id,
      title: n.title,
      body: n.body,
      data: (n.data ?? {}) as Record<string, unknown>,
      createdAt: n.createdAt.toISOString(),
    });
  }
  return rows;
}

/** Notify every admin/mod/support account — platform activity feed. */
export async function notifyAdmins(input: Omit<CreateNotificationInput, "userId">): Promise<void> {
  try {
    const admins = await db.user.findMany({
      where: { role: { in: ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"] }, status: "ACTIVE" },
      select: { id: true },
    });
    await createNotificationMany(admins.map((a) => a.id), input);
  } catch (e) {
    console.error("[notifications] admin fan-out failed:", e);
  }
}

/**
 * Fire-and-forget transactional email, respecting per-type preferences.
 * Never throws — email is best-effort alongside the in-app notification.
 */
export async function emailIfEnabled(
  userId: string,
  type: NotificationType,
  subject: string,
  text: string,
  html?: string,
): Promise<void> {
  try {
    const prefs = await db.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    // Email is opt-in per type.
    if (!prefs?.email) return;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.email) return;
    const provider = getEmailProvider();
    await provider.send({
      to: user.email,
      subject,
      text,
      html: html ?? `<div style="font-family:sans-serif;white-space:pre-wrap">${text}</div>`,
    });
  } catch (e) {
    console.error("[notifications] email delivery failed:", e);
  }
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where = ids
    ? { id: { in: ids }, userId }
    : { userId, read: false };
  return db.notification.updateMany({ where, data: { read: true } });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, read: false } });
}
