import { beforeEach, describe, expect, it } from "vitest";
import { clearData, seedFixtures, testDb } from "../../../vitest.setup";
import { canWatchRecording } from "./access";

let fixtures: Awaited<ReturnType<typeof seedFixtures>>;

async function makeRecording(courseId: string | null) {
  const db = await testDb();
  const video = await db.video.create({
    data: { title: "Test video", source: "LOCAL", status: "READY", processingProgress: 100 },
  });
  const rc = await db.recordedClass.create({
    data: {
      title: "Test Recording",
      slug: `test-recording-${Math.random().toString(36).slice(2, 8)}`,
      courseId,
      videoId: video.id,
      status: "PUBLISHED",
      publishedAt: new Date(),
      uploadedById: fixtures.admin.id,
    },
  });
  return rc;
}

beforeEach(async () => {
  await clearData();
  fixtures = await seedFixtures();
});

describe("canWatchRecording (the paid-content security rule)", () => {
  it("blocks an unenrolled student from a course-linked recording", async () => {
    const rc = await makeRecording(fixtures.course.id);
    const access = await canWatchRecording(rc.id, fixtures.student.id);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("Enroll");
  });

  it("allows an enrolled student", async () => {
    const db = await testDb();
    const rc = await makeRecording(fixtures.course.id);
    await db.enrollment.create({
      data: { studentId: fixtures.student.id, courseId: fixtures.course.id, pricePaid: 1000, status: "ACTIVE" },
    });
    const access = await canWatchRecording(rc.id, fixtures.student.id);
    expect(access.allowed).toBe(true);
  });

  it("allows the course teacher", async () => {
    const rc = await makeRecording(fixtures.course.id);
    const access = await canWatchRecording(rc.id, fixtures.teacher.id);
    expect(access.allowed).toBe(true);
  });

  it("allows admins", async () => {
    const rc = await makeRecording(fixtures.course.id);
    const access = await canWatchRecording(rc.id, fixtures.admin.id);
    expect(access.allowed).toBe(true);
  });

  it("allows everyone on standalone recordings", async () => {
    const rc = await makeRecording(null);
    const anonymous = await canWatchRecording(rc.id, null);
    expect(anonymous.allowed).toBe(true);
  });

  it("blocks unpublished recordings", async () => {
    const db = await testDb();
    const video = await db.video.create({
      data: { title: "Draft video", source: "LOCAL", status: "READY", processingProgress: 100 },
    });
    const rc = await db.recordedClass.create({
      data: {
        title: "Draft Recording",
        slug: "draft-recording",
        courseId: null,
        videoId: video.id,
        status: "DRAFT",
        uploadedById: fixtures.admin.id,
      },
    });
    const access = await canWatchRecording(rc.id, null);
    expect(access.allowed).toBe(false);
  });

  it("blocks recordings whose video is still processing", async () => {
    const db = await testDb();
    const video = await db.video.create({
      data: { title: "Processing", source: "LOCAL", status: "PROCESSING", processingProgress: 50 },
    });
    const rc = await db.recordedClass.create({
      data: {
        title: "Processing Recording",
        slug: "processing-recording",
        courseId: null,
        videoId: video.id,
        status: "PUBLISHED",
        publishedAt: new Date(),
        uploadedById: fixtures.admin.id,
      },
    });
    const access = await canWatchRecording(rc.id, null);
    expect(access.allowed).toBe(false);
    expect(access.reason).toContain("processed");
  });
});
