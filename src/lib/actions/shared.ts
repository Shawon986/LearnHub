import { requireUser } from "@/lib/auth/session";
import { markNotificationsRead } from "@/lib/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

export function actionError(message: string): ActionResult {
  return { ok: false, error: message };
}

export async function markNotifsRead(ids?: string[]): Promise<ActionResult> {
  const user = await requireUser();
  await markNotificationsRead(user.id, ids);
  return { ok: true };
}

export async function markAllNotifsRead(): Promise<ActionResult> {
  const user = await requireUser();
  await markNotificationsRead(user.id);
  return { ok: true };
}
