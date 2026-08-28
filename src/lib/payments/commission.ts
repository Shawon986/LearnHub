import { getSetting } from "@/lib/settings";
import { getCommissionRate } from "@/lib/settings";
import { splitEarnings } from "@/lib/earnings";

/**
 * Commission resolution: course-specific → teacher-specific → global.
 * Overrides are PlatformSetting values:
 *   "commission.course.{courseId}"  → number (percent)
 *   "commission.teacher.{teacherId}" → number (percent)
 */
export async function resolveCommissionRate(
  teacherId: string,
  courseId?: string | null,
): Promise<number> {
  if (courseId) {
    const courseOverride = await getSetting(`commission.course.${courseId}`);
    if (typeof courseOverride === "number") return courseOverride;
  }
  const teacherOverride = await getSetting(`commission.teacher.${teacherId}`);
  if (typeof teacherOverride === "number") return teacherOverride;
  return getCommissionRate();
}

export async function splitFor(
  teacherId: string,
  amount: number,
  courseId?: string | null,
): Promise<{ rate: number; commission: number; net: number }> {
  const rate = await resolveCommissionRate(teacherId, courseId);
  const { commission, net } = splitEarnings(amount, rate);
  return { rate, commission, net };
}
