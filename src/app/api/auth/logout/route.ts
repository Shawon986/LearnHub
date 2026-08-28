import { apiHandler, json } from "@/lib/api";
import { clearSession } from "@/lib/auth/session";

export const POST = apiHandler(async () => {
  await clearSession();
  return json({ ok: true });
});
