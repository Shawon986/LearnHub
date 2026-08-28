"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { actionError, type ActionResult } from "@/lib/actions/shared";

function err(message: unknown): ActionResult {
  return actionError(message instanceof Error ? message.message : "Something went wrong.");
}

/** Update per-type notification delivery preferences (email is opt-in). */
export async function updateNotificationPreference(
  type: string,
  input: { inApp: boolean; email: boolean },
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { inApp: input.inApp, email: input.email },
      create: { userId: user.id, type, inApp: input.inApp, email: input.email },
    });
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
