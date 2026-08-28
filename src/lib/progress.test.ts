import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../vitest.setup";
import { markLessonComplete } from "./progress";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
});

describe("markLessonComplete (progress rollup)", () => {
  it("rolls 1 of 2 lessons to 50%", async () => {
    const db = await testDb();
    await db.enrollment.create({
      data: { studentId: fixtures.student.id, courseId: fixtures.course.id, pricePaid: 1000, status: "ACTIVE" },
    });
    const lesson = fixtures.course.modules[0].lessons[0];

    const result = await markLessonComplete(fixtures.student.id, lesson.id);
    expect(result.percent).toBe(50);

    const progress = await db.courseProgress.findUniqueOrThrow({
      where: { studentId_courseId: { studentId: fixtures.student.id, courseId: fixtures.course.id } },
    });
    expect(progress.percentComplete).toBe(50);
  });

  it("completes the enrollment and issues a certificate at 100%", async () => {
    const db = await testDb();
    await db.enrollment.create({
      data: { studentId: fixtures.student.id, courseId: fixtures.course.id, pricePaid: 1000, status: "ACTIVE" },
    });
    for (const lesson of fixtures.course.modules[0].lessons) {
      await markLessonComplete(fixtures.student.id, lesson.id);
    }

    const enrollment = await db.enrollment.findUniqueOrThrow({
      where: { studentId_courseId: { studentId: fixtures.student.id, courseId: fixtures.course.id } },
    });
    expect(enrollment.status).toBe("COMPLETED");

    const certificate = await db.certificate.findUnique({ where: { enrollmentId: enrollment.id } });
    expect(certificate).not.toBeNull();
    expect(certificate!.certificateNumber).toMatch(/^LH-\d{4}-/);
  });

  it("awards XP on first completion (and not on repeats)", async () => {
    const db = await testDb();
    await db.enrollment.create({
      data: { studentId: fixtures.student.id, courseId: fixtures.course.id, pricePaid: 1000, status: "ACTIVE" },
    });
    const lesson = fixtures.course.modules[0].lessons[0];

    await markLessonComplete(fixtures.student.id, lesson.id);
    const afterFirst = await db.studentProfile.findUniqueOrThrow({ where: { userId: fixtures.student.id } });
    expect(afterFirst.xp).toBe(10);

    await markLessonComplete(fixtures.student.id, lesson.id);
    const afterRepeat = await db.studentProfile.findUniqueOrThrow({ where: { userId: fixtures.student.id } });
    expect(afterRepeat.xp).toBe(10); // unchanged
  });
});
