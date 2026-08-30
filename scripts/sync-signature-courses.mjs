// One-off + idempotent sync: creates the "Signature Programs" category and
// the five flagship courses (with modules, lessons and a starter review)
// into ANY database that already has users — local dev.db or production
// Neon. Skipped courses are never duplicated (matched by slug).
//
// Local:   npx tsx scripts/sync-signature-courses.run.ts
// Prod:    generate a postgres client, then
//          DATABASE_URL=$NEON node scripts/sync-signature-courses.run.mjs pg

const CATEGORY = { name: "Signature Programs", slug: "signature-programs" };

const COURSES = [
  {
    slug: "ellt-ascend",
    teacherEmail: "ayesha@example.com",
    title: "ELLT Ascend",
    subtitle:
      "Climb every band of Oxford's English Level Test — reading, listening, writing and speaking",
    difficulty: "INTERMEDIATE",
    price: 5000,
    compareAt: 8000,
    modules: [
      {
        title: "ELLT Foundations",
        lessons: [
          { title: "Test format & band system decoded", type: "VIDEO", minutes: 25, preview: true },
          { title: "Reading: skimming, scanning, speed", type: "VIDEO", minutes: 40 },
          { title: "Listening: accent & note-taking drills", type: "VIDEO", minutes: 38 },
        ],
      },
      {
        title: "Writing & Speaking",
        lessons: [
          { title: "Writing structures that score", type: "VIDEO", minutes: 45 },
          { title: "Speaking: fluency frames", type: "VIDEO", minutes: 42 },
          { title: "Full mock test + grading", type: "QUIZ", minutes: 60 },
        ],
      },
    ],
    review: { name: "Sadia Afrin", rating: 5, content: "Went from B1 to B2+ in one attempt. The mock grading is gold." },
  },
  {
    slug: "duoscore-sprint",
    teacherEmail: "tanvir@example.com",
    title: "DuoScore Sprint",
    subtitle: "A 30-day adaptive sprint to 120+ on the Duolingo English Test",
    difficulty: "INTERMEDIATE",
    price: 4500,
    compareAt: 7500,
    modules: [
      {
        title: "DET Bootcamp",
        lessons: [
          { title: "Adaptive scoring: how the test thinks", type: "VIDEO", minutes: 28, preview: true },
          { title: "Read & Complete / Read & Select drills", type: "VIDEO", minutes: 36 },
          { title: "Listen & Type: speed training", type: "VIDEO", minutes: 32 },
        ],
      },
      {
        title: "Production Skills",
        lessons: [
          { title: "Speak About the Photo & Read Aloud", type: "VIDEO", minutes: 40 },
          { title: "Writing Sample frameworks", type: "VIDEO", minutes: 34 },
          { title: "Full-length practice test", type: "ASSIGNMENT", minutes: 90 },
        ],
      },
    ],
    review: { name: "Farhan Kabir", rating: 5, content: "Hit 125 after 28 days. The adaptive drill structure just works." },
  },
  {
    slug: "pte-flowstate",
    teacherEmail: "tanvir@example.com",
    title: "PTE FlowState",
    subtitle: "Machine-scored fluency drills for Pearson PTE — speak and write at AI-grader speed",
    difficulty: "INTERMEDIATE",
    price: 5000,
    compareAt: 8000,
    modules: [
      {
        title: "PTE Engine Room",
        lessons: [
          { title: "How the AI grader scores you", type: "VIDEO", minutes: 30, preview: true },
          { title: "Repeat Sentence & Describe Image", type: "VIDEO", minutes: 44 },
          { title: "Retell Lecture templates", type: "VIDEO", minutes: 36 },
        ],
      },
      {
        title: "Written & Mastery",
        lessons: [
          { title: "Summarize Written Text: the formula", type: "VIDEO", minutes: 38 },
          { title: "Essay skeletons that score 79+", type: "VIDEO", minutes: 40 },
          { title: "Mock test + AI score report", type: "QUIZ", minutes: 75 },
        ],
      },
    ],
    review: { name: "Nadia Islam", rating: 5, content: "The machine-speed drills fixed my pacing. 82 on the real test." },
  },
  {
    slug: "speakband-9",
    teacherEmail: "ayesha@example.com",
    title: "SpeakBand 9",
    subtitle: "A clinic for IELTS Speaking — from 6.0 to 9.0 with live mocks for Parts 1, 2 and 3",
    difficulty: "INTERMEDIATE",
    price: 5500,
    compareAt: 9000,
    modules: [
      {
        title: "Part 1 & 2 Mastery",
        lessons: [
          { title: "Part 1: everyday topics, natural answers", type: "VIDEO", minutes: 32, preview: true },
          { title: "Part 2: the 1-minute note system", type: "VIDEO", minutes: 38 },
          { title: "Story arcs that fill 2 minutes", type: "VIDEO", minutes: 30 },
        ],
      },
      {
        title: "Part 3 & Band 9 Polish",
        lessons: [
          { title: "Part 3: opinion → reason → example", type: "VIDEO", minutes: 42 },
          { title: "Band 9 vocabulary & idioms", type: "VIDEO", minutes: 36 },
          { title: "Live mock simulation", type: "ASSIGNMENT", minutes: 60 },
        ],
      },
    ],
    review: { name: "Rakibul Islam", rating: 5, content: "My speaking went from 6.0 to 8.0. The mocks felt like the real room." },
  },
  {
    slug: "fluent-street",
    teacherEmail: "ayesha@example.com",
    title: "Fluent Street",
    subtitle: "Everyday English that flows — conversation-first practice for the street, campus and office",
    difficulty: "BEGINNER",
    price: 3500,
    compareAt: 6000,
    modules: [
      {
        title: "Confidence on Day One",
        lessons: [
          { title: "Greetings, small talk & icebreakers", type: "VIDEO", minutes: 26, preview: true },
          { title: "Phone calls & ordering with ease", type: "VIDEO", minutes: 30 },
          { title: "Asking questions like a native", type: "VIDEO", minutes: 28 },
        ],
      },
      {
        title: "Real-Life Fluency",
        lessons: [
          { title: "Market, rickshaw & everyday haggling", type: "VIDEO", minutes: 32 },
          { title: "Office & classroom English", type: "VIDEO", minutes: 34 },
          { title: "Storytelling & opinions", type: "ASSIGNMENT", minutes: 45 },
        ],
      },
    ],
    review: { name: "Mahmudul Hasan", rating: 5, content: "I finally speak without translating in my head first." },
  },
];

const newId = () => globalThis.crypto.randomUUID();

export async function syncSignatureCourses(prisma, opts = {}) {
  // The production client is generated from an INTROSPECTED schema whose
  // relation fields use model names ("CourseModule"/"Lesson"); the project
  // client uses the friendly names ("modules"/"lessons").
  const MODULES = opts.introspected ? "CourseModule" : "modules";
  const LESSONS = opts.introspected ? "Lesson" : "lessons";

  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });

  let category = await prisma.category.findUnique({ where: { slug: CATEGORY.slug } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        id: newId(),
        name: CATEGORY.name,
        slug: CATEGORY.slug,
        icon: "Sparkles",
        color: "#f59e0b",
        isFeatured: true,
        sortOrder: 0,
        description: "LearnHub's flagship exam & fluency programs — ELLT, Duolingo, PTE, IELTS Speaking and Spoken English.",
      },
    });
    console.log("[sync] category created:", CATEGORY.slug);
  }

  for (const c of COURSES) {
    let course = await prisma.course.findUnique({ where: { slug: c.slug } });
    if (course) {
      console.log("[sync] course exists, backfilling review:", c.slug);
      let reviewer = await prisma.user.findFirst({ where: { name: c.review.name } });
    if (!reviewer) {
      reviewer = await prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE" } });
    }
      const hasReview = await prisma.review.findFirst({ where: { courseId: course.id } });
      if (reviewer && !hasReview) {
        await prisma.review.create({
          data: {
            id: newId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewerId: reviewer.id,
            rating: c.review.rating,
            content: c.review.content,
            status: "PUBLISHED",
            verifiedPurchase: true,
            targetType: "COURSE",
            courseId: course.id,
          },
        });
        await prisma.course.update({
          where: { id: course.id },
          data: { avgRating: c.review.rating, reviewCount: 1 },
        });
        console.log("[sync] review added to:", c.slug);
      }
      continue;
    }
    const teacher = await prisma.user.findUnique({ where: { email: c.teacherEmail } });
    if (!teacher) {
      console.warn("[sync] teacher missing, skipping:", c.teacherEmail, "→", c.slug);
      continue;
    }
    const totalLessons = c.modules.reduce((s, m) => s + m.lessons.length, 0);
    const totalMinutes = c.modules.reduce((s, m) => s + m.lessons.reduce((x, l) => x + l.minutes, 0), 0);

    course = await prisma.course.create({
      data: {
        id: newId(),
        updatedAt: new Date(),
        teacherId: teacher.id,
        categoryId: category.id,
        title: c.title,
        slug: c.slug,
        subtitle: c.subtitle,
        description: `${c.subtitle}. Taught in simple language with practical drills, live mocks and lifetime access.`,
        type: "RECORDED",
        difficulty: c.difficulty,
        language: "English",
        price: c.price,
        compareAtPrice: c.compareAt,
        requirements: ["Basic English skills", "A device with a microphone", "Willingness to practice daily"],
        outcomes: [
          "Master the test with hands-on drills and mock simulations",
          "Build real confidence in reading, listening, writing and speaking",
          "Get a shareable certificate on completion",
        ],
        tags: c.title.split(" "),
        status: "PUBLISHED",
        isFeatured: true,
        featuredAt: new Date(Date.now() - 5 * 86400_000),
        approvedById: admin?.id ?? null,
        publishedAt: new Date(Date.now() - 10 * 86400_000),
        totalLessons,
        totalDurationMinutes: totalMinutes,
        enrollmentCount: 120 + Math.floor(Math.random() * 320),
        avgRating: 4.8,
        reviewCount: 1,
        [MODULES]: {
          create: c.modules.map((m, mi) => ({
            id: newId(),
            title: m.title,
            sortOrder: mi,
            [LESSONS]: {
              create: m.lessons.map((l, li) => ({
                id: newId(),
                updatedAt: new Date(),
                title: l.title,
                type: l.type,
                sortOrder: li,
                durationMinutes: l.minutes,
                isPreview: l.preview ?? false,
              })),
            },
          })),
        },
      },
    });

    let reviewer = await prisma.user.findFirst({ where: { name: c.review.name } });
    if (!reviewer) {
      reviewer = await prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE" } });
    }
    const hasReview = await prisma.review.findFirst({ where: { courseId: course.id } });
    if (reviewer && !hasReview) {
      await prisma.review.create({
        data: {
          id: newId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          reviewerId: reviewer.id,
          rating: c.review.rating,
          content: c.review.content,
          status: "PUBLISHED",
          verifiedPurchase: true,
          targetType: "COURSE",
          courseId: course.id,
        },
      });
    }
    console.log("[sync] course created:", c.slug);
  }
  return { ok: true };
}
