import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * Mark a lesson complete for a user and roll the course progress up:
 * percentComplete = completed lessons / total lessons.
 * At 100%: enrollment → COMPLETED, first-completion achievement,
 * notification.
 */
export async function markLessonComplete(userId: string, lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });
  if (!lesson) throw new Error("Lesson not found.");

  const now = new Date();
  await db.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: userId, lessonId } },
    update: { completed: true, completedAt: now },
    create: { studentId: userId, lessonId, completed: true, completedAt: now },
  });

  const courseId = lesson.module.courseId;

  const [totalLessons, completedLessons, enrollment] = await Promise.all([
    db.lesson.count({ where: { module: { courseId } } }),
    db.lessonProgress.count({
      where: { studentId: userId, completed: true, lesson: { module: { courseId } } },
    }),
    db.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId } },
      include: { course: { select: { teacherId: true, title: true } } },
    }),
  ]);

  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  await db.courseProgress.upsert({
    where: { studentId_courseId: { studentId: userId, courseId } },
    update: {
      percentComplete: percent,
      lastLessonId: lessonId,
      lastAccessedAt: now,
      completedAt: percent >= 100 ? now : null,
    },
    create: {
      studentId: userId,
      courseId,
      enrollmentId: enrollment?.id ?? "",
      percentComplete: percent,
      lastLessonId: lessonId,
      completedAt: percent >= 100 ? now : null,
    },
  });

  if (percent >= 100 && enrollment && enrollment.status === "ACTIVE") {
    await db.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "COMPLETED", completedAt: now },
    });
    await createNotification({
      userId,
      type: "COURSE_COMPLETED",
      title: "Course completed! 🎉",
      body: `You finished "${enrollment.course.title}" — 100% complete.`,
    });
    // First-completion achievement.
    const firstAchievement = await db.achievement.findFirst({
      where: { userId, badge: { code: "FIRST_COURSE_COMPLETED" } },
    });
    if (!firstAchievement) {
      const badge = await db.badge.findUnique({ where: { code: "FIRST_COURSE_COMPLETED" } });
      if (badge) {
        await db.achievement.create({ data: { userId, badgeId: badge.id, status: "EARNED" } });
      }
    }
  }

  return { percent, completedLessons, totalLessons };
}
