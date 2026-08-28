import { apiHandler, json, unauthorized } from "@/lib/api";
import { sendDueBookingReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

// Scheduled reminder sweep.
// Protect with a shared secret (Authorization: Bearer <CRON_SECRET>);
// in development (no CRON_SECRET set) the endpoint is open.
// Configure in Vercel: Cron Jobs → path /api/cron/reminders, schedule
// every 30 minutes (or as needed).

export const GET = apiHandler(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) throw unauthorized("Invalid cron secret.");
  }

  const sent = await sendDueBookingReminders();
  return json({ ok: true, sent });
});
