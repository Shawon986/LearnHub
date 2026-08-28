import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email";
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

  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as object,
    },
  });
}

/** Notify many users at once (announcements). */
export async function createNotificationMany(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">,
) {
  if (userIds.length === 0) return;
  return db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: (input.data ?? {}) as object,
    })),
  });
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
