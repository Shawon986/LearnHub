import { apiHandler, json, notFound } from "@/lib/api";
import { db } from "@/lib/db";
import { getAvailableDates, getAvailableSlots } from "@/lib/availability";

// GET /api/teachers/[id]/availability            → bookable dates (14 days)
// GET /api/teachers/[id]/availability?date=…     → free 30-min start times for a date
export const GET = apiHandler(async (req, ctx) => {
  const { id } = await ctx.params;
  const teacher = await db.user.findFirst({ where: { id, role: "TEACHER" } });
  if (!teacher) throw notFound("Teacher not found.");

  const date = req.nextUrl.searchParams.get("date");
  if (date) {
    const slots = await getAvailableSlots(id, date);
    return json({ date, slots });
  }
  const dates = await getAvailableDates(id);
  return json({ dates });
});
