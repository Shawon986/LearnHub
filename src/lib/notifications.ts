import { db } from "@/lib/db";
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

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where = ids
    ? { id: { in: ids }, userId }
    : { userId, read: false };
  return db.notification.updateMany({ where, data: { read: true } });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, read: false } });
}
