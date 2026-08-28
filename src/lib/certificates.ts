import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { generateShortCode } from "@/lib/utils";

/**
 * Issue a certificate for a completed course (idempotent — one per enrollment).
 * Number format: LH-<year>-<5 chars>.
 */
export async function issueCertificate(
  enrollmentId: string,
): Promise<{ id: string; certificateNumber: string } | null> {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { course: { include: { teacher: { select: { name: true } } } }, student: true },
  });
  if (!enrollment || enrollment.status !== "COMPLETED") return null;

  const existing = await db.certificate.findUnique({ where: { enrollmentId } });
  if (existing) return { id: existing.id, certificateNumber: existing.certificateNumber };

  const certificate = await db.certificate.create({
    data: {
      certificateNumber: `LH-${new Date().getFullYear()}-${generateShortCode(5)}`,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      enrollmentId,
      metadata: {
        courseTitle: enrollment.course.title,
        teacherName: enrollment.course.teacher.name,
        studentName: enrollment.student.name,
      },
    },
  });

  await createNotification({
    userId: enrollment.studentId,
    type: "CERTIFICATE_ISSUED",
    title: "Certificate issued 🎓",
    body: `Your certificate (${certificate.certificateNumber}) for "${enrollment.course.title}" is ready.`,
    data: { certificateNumber: certificate.certificateNumber },
  });

  return { id: certificate.id, certificateNumber: certificate.certificateNumber };
}
