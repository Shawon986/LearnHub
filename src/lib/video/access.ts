import { db } from "@/lib/db";

// Access rules for recorded classes:
//  - PUBLISHED only
//  - tied to a course → the viewer must be enrolled in it (or be the
//    course teacher / an admin)
//  - standalone → open to everyone
// The watch page and the streaming endpoint BOTH enforce this — never
// trust the page render alone.

export async function canWatchRecording(
  recordedClassId: string,
  userId: string | null,
): Promise<{ allowed: boolean; reason?: string }> {
  const rc = await db.recordedClass.findUnique({
    where: { id: recordedClassId },
    include: { video: true, course: { select: { teacherId: true } } },
  });
  if (!rc) return { allowed: false, reason: "Recording not found." };
  if (rc.status !== "PUBLISHED") return { allowed: false, reason: "This recording is not published." };
  if (!rc.video || rc.video.status !== "READY") {
    return { allowed: false, reason: "The video is still being processed." };
  }

  if (!rc.courseId) return { allowed: true };
  if (!rc.course) return { allowed: false, reason: "The linked course is unavailable." };

  if (!userId) return { allowed: false, reason: "Sign in to watch this recording." };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, reason: "Sign in to watch this recording." };
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MODERATOR", "SUPPORT"].includes(user.role);
  if (isAdmin || rc.course.teacherId === userId) return { allowed: true };

  const enrollment = await db.enrollment.findUnique({
    where: { studentId_courseId: { studentId: userId, courseId: rc.courseId } },
  });
  if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) {
    return { allowed: false, reason: "Enroll in the linked course to watch this recording." };
  }
  return { allowed: true };
}
