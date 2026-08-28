// Test environment: dedicated SQLite database (created once by
// vitest.global-setup.ts), pristine fixtures per suite. The real
// dev.db is never touched.
import path from "path";
import { afterAll } from "vitest";

const TEST_DB = path.resolve(__dirname, "prisma", "test.db");
const TEST_DB_URL = `file:${TEST_DB.replace(/\\/g, "/")}`;

// Absolute SQLite URL so the runtime client resolves the test file.
process.env.DATABASE_URL = TEST_DB_URL;
process.env.AUTH_SECRET = "test-secret-0123456789abcdef0123456789abcdef";
process.env.APP_URL = "http://localhost:3000";
process.env.EMAIL_PROVIDER = "console";
process.env.PAYMENT_PROVIDERS = "DEV";

let db: { $disconnect: () => Promise<void> } | null = null;

afterAll(async () => {
  if (db) await db.$disconnect();
});

/** Shared Prisma client for tests (singleton per worker). */
export async function testDb() {
  if (!db) {
    const { PrismaClient } = await import("@prisma/client");
    db = new PrismaClient();
  }
  return db as import("@prisma/client").PrismaClient;
}

/** Create the minimal fixture set: admin, teacher, students, course, category. */
export async function seedFixtures() {
  const prisma = await testDb();
  const { hash } = await import("bcryptjs");
  const passwordHash = await hash("Password123!", 4);

  const admin = await prisma.user.create({
    data: { email: "admin@test.dev", passwordHash, name: "Admin", role: "SUPER_ADMIN", referralCode: "LEARN-ADMIN-1" },
  });
  const teacher = await prisma.user.create({
    data: {
      email: "teacher@test.dev",
      passwordHash,
      name: "Test Teacher",
      role: "TEACHER",
      referralCode: "LEARN-TEACHER-1",
      teacherProfile: { create: { headline: "Python teacher", hourlyRate: 800, verified: true } },
    },
  });
  await prisma.teacherWallet.create({ data: { teacherId: teacher.id } });
  await prisma.teacherSkill.create({ data: { teacherId: teacher.id, name: "Python" } });

  const student = await prisma.user.create({
    data: {
      email: "student@test.dev",
      passwordHash,
      name: "Test Student",
      role: "STUDENT",
      referralCode: "LEARN-STUDENT-1",
      studentProfile: { create: { xp: 0, level: 1 } },
    },
  });
  const otherStudent = await prisma.user.create({
    data: {
      email: "other@test.dev",
      passwordHash,
      name: "Other Student",
      role: "STUDENT",
      referralCode: "LEARN-OTHER-1",
      studentProfile: { create: {} },
    },
  });
  const category = await prisma.category.create({ data: { name: "Programming", slug: "programming" } });

  const course = await prisma.course.create({
    data: {
      teacherId: teacher.id,
      categoryId: category.id,
      title: "Test Python Course",
      slug: "test-python-course",
      price: 1000,
      status: "PUBLISHED",
      publishedAt: new Date(),
      modules: {
        create: [
          {
            title: "Module 1",
            lessons: {
              create: [
                { title: "Lesson 1", type: "VIDEO", sortOrder: 0 },
                { title: "Lesson 2", type: "VIDEO", sortOrder: 1 },
              ],
            },
          },
        ],
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  return { admin, teacher, student, otherStudent, category, course };
}

/** Wipe all rows between tests (keeps the schema). Ordered by FK dependencies. */
export async function clearData() {
  const prisma = await testDb();
  const tables = [
    "walletTransaction", // → wallet, commission, withdrawal
    "commission", // → payment
    "refund", // → payment
    "couponRedemption", // → coupon, payment
    "certificate", // → enrollment
    "transaction", // → payment, withdrawal
    "payment", // → user, course, booking, liveClass
    "courseProgress", // → enrollment, course, lesson
    "enrollment", // → user, course
    "lessonProgress", // → lesson, user
    "achievement", // → user, badge
    "notification", // → user
    "notificationPreference", // → user
    "bookmark", // → recordedClass, user
    "videoNote", // → recordedClass, user
    "videoProgress", // → recordedClass, user
    "resource", // → course, lesson, liveClass, recordedClass
    "recordedClass", // → video, course, module, lesson
    "captionTrack", // → video
    "video",
    "review", // → booking, course, user
    "disputeMessage", // → dispute, user
    "dispute", // → payment, booking, user
    "aIMessage", // → aIConversation
    "aIConversation", // → user
    "aIRecommendation", // → user
    "message", // → conversation, user
    "conversationParticipant", // → conversation, user
    "conversation",
    "liveClassParticipant", // → liveClass, user
    "liveClassRecording", // → liveClass, video
    "liveClass", // → course, user
    "booking", // → user, course
    "availabilityException", // → user
    "availabilitySlot", // → user
    "coupon", // → course, user
    "referral", // → user
    "wishlistItem", // → course, user
    "withdrawal", // → user
    "auditLog", // → user
    "authToken", // → user
    "quizAttempt", // → quiz, user
    "question", // → quiz
    "quiz", // → lesson, course
    "assignmentSubmission", // → assignment, user
    "assignment", // → lesson, course, user
    "lesson", // → module, video
    "courseModule", // → course
    "course", // → user, category
    "teacherSkill",
    "teacherEducation",
    "teacherExperience",
    "teacherDocument",
    "teacherVerification", // → user
    "teacherProfile",
    "studentProfile",
    "announcement", // → user
    "banner",
    "badge",
    "platformSetting",
    "category",
    "user",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}
