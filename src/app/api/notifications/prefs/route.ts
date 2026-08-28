import { apiHandler, json } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const GET = apiHandler(async () => {
  const user = await requireUser();
  const prefs = await db.notificationPreference.findMany({ where: { userId: user.id } });
  return json({ prefs });
});
