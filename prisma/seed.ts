import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60_000);
const daysFromNow = (d: number, hour = 10) => {
  const date = new Date(Date.now() + d * 24 * 60 * 60_000);
  date.setHours(hour, 0, 0, 0);
  return date;
};

async function main() {
  // Idempotent: never double-seed.
  if ((await db.user.count()) > 0) {
    console.log("ℹ Database already contains users — skipping seed.");
    return;
  }

  console.log("🌱 Seeding database…");
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  // ---------------- Platform settings ----------------
  const settings: { key: string; value: Prisma.InputJsonValue; description: string }[] = [
    { key: "commission.ratePercent", value: 15, description: "Platform commission on every sale (%)" },
    { key: "referral.rewardAmountBdt", value: 100, description: "BDT credited to referrer per successful referred purchase" },
    { key: "referral.minPurchaseBdt", value: 500, description: "Minimum purchase for a referral reward" },
    { key: "platform.name", value: "LearnHub", description: "Public platform name" },
    { key: "platform.tagline", value: "Bangladesh's premium education marketplace", description: "Public tagline" },
    { key: "platform.contactEmail", value: "support@learnhub.example", description: "Public support email" },
    { key: "withdrawal.minAmountBdt", value: 500, description: "Minimum teacher withdrawal amount" },
    { key: "withdrawal.feePercent", value: 0, description: "Withdrawal processing fee (%)" },
  ];
  for (const s of settings) await db.platformSetting.create({ data: s });

  // ---------------- Badges ----------------
  const badges = [
    { code: "FIRST_COURSE_COMPLETED", name: "First Course Completed", description: "Completed your first course", icon: "trophy" },
    { code: "STREAK_7", name: "7-Day Streak", description: "Learned 7 days in a row", icon: "flame" },
    { code: "STREAK_30", name: "30-Day Streak", description: "Learned 30 days in a row", icon: "flame" },
    { code: "COURSE_100", name: "100% Completion", description: "Finished a course with a perfect score", icon: "target" },
    { code: "TOP_LEARNER", name: "Top Learner", description: "Ranked in the weekly leaderboard top 10", icon: "crown" },
    { code: "LIVE_CLASS_CHAMPION", name: "Live Class Champion", description: "Attended 10 live classes", icon: "video" },
  ];
  for (const b of badges) await db.badge.create({ data: { ...b, criteria: {} } });

  // ---------------- Categories ----------------
  const categoryDefs = [
    { name: "Web Development", icon: "Code2", color: "#6d28d9", featured: true, sort: 1 },
    { name: "Programming & Software", icon: "Terminal", color: "#0d9488", featured: true, sort: 2 },
    { name: "Data Science & AI", icon: "BrainCircuit", color: "#2563eb", featured: true, sort: 3 },
    { name: "Design & Creative", icon: "Palette", color: "#db2777", featured: true, sort: 4 },
    { name: "Business & Finance", icon: "Briefcase", color: "#d97706", featured: true, sort: 5 },
    { name: "Digital Marketing", icon: "Megaphone", color: "#dc2626", featured: false, sort: 6 },
    { name: "Language Learning", icon: "Languages", color: "#059669", featured: true, sort: 7 },
    { name: "Academic Studies", icon: "BookOpen", color: "#7c3aed", featured: false, sort: 8 },
    { name: "Exam Preparation", icon: "Target", color: "#0891b2", featured: false, sort: 9 },
    { name: "Music & Arts", icon: "Music", color: "#9333ea", featured: false, sort: 10 },
  ];
  const catBySlug: Record<string, string> = {};
  for (const { sort, featured, ...cat } of categoryDefs) {
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const row = await db.category.create({
      data: {
        ...cat,
        slug,
        sortOrder: sort,
        isFeatured: featured,
        description: `Learn ${cat.name} from expert teachers in Bangladesh.`,
      },
    });
    catBySlug[slug] = row.id;
  }

  // ---------------- Admin / staff ----------------
  const admin = await db.user.create({
    data: {
      email: "admin@example.com",
      passwordHash,
      name: "Admin User",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
      referralCode: "LEARN-ADMIN-100",
    },
  });
  await db.user.create({
    data: {
      email: "moderator@example.com",
      passwordHash,
      name: "Moderator User",
      role: "MODERATOR",
      emailVerified: new Date(),
      referralCode: "LEARN-MOD-101",
    },
  });
  await db.user.create({
    data: {
      email: "support@example.com",
      passwordHash,
      name: "Support Team",
      role: "SUPPORT",
      emailVerified: new Date(),
      referralCode: "LEARN-SUPPORT-102",
    },
  });

  // ---------------- Teachers ----------------
  interface TeacherSeed {
    key: string;
    name: string;
    email: string;
    headline: string;
    about: string;
    hourlyRate: number;
    years: number;
    languages: string[];
    location: string;
    skills: string[];
    education: { institution: string; degree: string; field: string; start: number; end?: number }[];
    experience: { title: string; company: string; years: number }[];
    verified: boolean;
    reviewNote?: string;
  }

  const teacherSeeds: TeacherSeed[] = [
    {
      key: "ayesha",
      name: "Ayesha Rahman",
      email: "ayesha@example.com",
      headline: "Full-Stack Developer & Mentor · 8 years in the industry",
      about:
        "I help beginners become job-ready web developers. My students have been hired at top software companies in Bangladesh and abroad. I teach the fundamentals deeply, then build real projects.",
      hourlyRate: 800,
      years: 8,
      languages: ["English", "বাংলা"],
      location: "Dhaka, Bangladesh",
      skills: ["React", "Next.js", "TypeScript", "Node.js"],
      education: [{ institution: "BUET", degree: "B.Sc.", field: "Computer Science", start: 2012, end: 2016 }],
      experience: [
        { title: "Senior Software Engineer", company: "Brain Station 23", years: 5 },
        { title: "Lead Instructor", company: "Independent", years: 3 },
      ],
      verified: true,
    },
    {
      key: "tanvir",
      name: "Tanvir Hasan",
      email: "tanvir@example.com",
      headline: "Data Scientist · ex-Grameenphone · ML educator",
      about:
        "Data science is about asking the right questions. I teach machine learning from first principles with hands-on Python, so you can build models that solve real business problems.",
      hourlyRate: 1200,
      years: 6,
      languages: ["English", "বাংলা"],
      location: "Dhaka, Bangladesh",
      skills: ["Python", "Machine Learning", "Deep Learning", "SQL"],
      education: [{ institution: "University of Dhaka", degree: "M.Sc.", field: "Statistics", start: 2013, end: 2019 }],
      experience: [{ title: "Data Scientist", company: "Grameenphone", years: 4 }],
      verified: true,
    },
    {
      key: "nusrat",
      name: "Nusrat Jahan",
      email: "nusrat@example.com",
      headline: "Product Designer · Design systems specialist",
      about:
        "Great design is invisible. I teach UI/UX with a focus on real product thinking — research, wireframes, prototypes and design systems used by real teams.",
      hourlyRate: 700,
      years: 5,
      languages: ["English", "বাংলা"],
      location: "Chattogram, Bangladesh",
      skills: ["Figma", "UI Design", "Design Systems", "Prototyping"],
      education: [{ institution: "Shanto-Mariam University", degree: "BFA", field: "Graphic Design", start: 2014, end: 2018 }],
      experience: [{ title: "Product Designer", company: "Shikho", years: 4 }],
      verified: true,
    },
    {
      key: "rafiul",
      name: "Rafiul Islam",
      email: "rafiul@example.com",
      headline: "Competitive Programmer · ICPC finalist mentor",
      about:
        "I train students for competitive programming and technical interviews. 300+ of my students have qualified for national contests.",
      hourlyRate: 600,
      years: 4,
      languages: ["English", "বাংলা"],
      location: "Rajshahi, Bangladesh",
      skills: ["C++", "Data Structures", "Algorithms", "Competitive Programming"],
      education: [{ institution: "RUET", degree: "B.Sc.", field: "CSE", start: 2015, end: 2019 }],
      experience: [{ title: "Software Engineer", company: "Enosis Solutions", years: 4 }],
      verified: true,
    },
    {
      key: "sadia",
      name: "Sadia Karim",
      email: "sadia@example.com",
      headline: "Chartered Accountant · Finance educator",
      about:
        "Accounting doesn't have to be scary. I break down financial statements, modeling and Excel so business owners and students can make confident decisions.",
      hourlyRate: 900,
      years: 7,
      languages: ["English", "বাংলা"],
      location: "Dhaka, Bangladesh",
      skills: ["Accounting", "Financial Modeling", "Excel", "QuickBooks"],
      education: [{ institution: "ICAB", degree: "ACA", field: "Accounting", start: 2012, end: 2016 }],
      experience: [{ title: "Audit Manager", company: "KPMG Bangladesh", years: 6 }],
      verified: true,
    },
    {
      key: "mahmudul",
      name: "Mahmudul Hasan",
      email: "mahmudul@example.com",
      headline: "English Language Coach · IELTS specialist",
      about:
        "Speak English with confidence. I run fluency-focused classes and structured IELTS preparation that has helped 500+ students reach their target band score.",
      hourlyRate: 500,
      years: 3,
      languages: ["English", "বাংলা", "اردو"],
      location: "Sylhet, Bangladesh",
      skills: ["Spoken English", "IELTS", "Business English", "Grammar"],
      education: [{ institution: "University of Dhaka", degree: "M.A.", field: "English Literature", start: 2015, end: 2019 }],
      experience: [{ title: "English Instructor", company: "British Council (partner)", years: 3 }],
      verified: false, // verification pending — good for the admin demo queue
    },
  ];

  const teachers: Record<string, { id: string }> = {};
  for (const t of teacherSeeds) {
    const user = await db.user.create({
      data: {
        email: t.email,
        passwordHash,
        name: t.name,
        role: "TEACHER",
        emailVerified: new Date(),
        referralCode: `LEARN-${t.name.split(" ")[0].toUpperCase()}-${Math.floor(100 + Math.random() * 800)}`,
        teacherProfile: {
          create: {
            headline: t.headline,
            about: t.about,
            hourlyRate: t.hourlyRate,
            yearsExperience: t.years,
            languages: t.languages,
            location: t.location,
            verified: t.verified,
            availabilityEnabled: true,
            totalStudents: Math.floor(40 + Math.random() * 400),
          },
        },
      },
    });
    teachers[t.key] = { id: user.id };

    for (const s of t.skills) {
      await db.teacherSkill.create({
        data: { teacherId: user.id, name: s, proficiency: Math.random() > 0.5 ? "EXPERT" : "ADVANCED" },
      });
    }
    for (const e of t.education) {
      await db.teacherEducation.create({
        data: {
          teacherId: user.id,
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.field,
          startYear: e.start,
          endYear: e.end ?? null,
        },
      });
    }
    for (const e of t.experience) {
      await db.teacherExperience.create({
        data: {
          teacherId: user.id,
          title: e.title,
          company: e.company,
          startDate: new Date(Date.now() - e.years * 365 * 24 * 60 * 60_000),
          current: true,
        },
      });
    }
    await db.teacherWallet.create({
      data: {
        teacherId: user.id,
        availableBalance: Math.floor(Math.random() * 8000),
        pendingBalance: 0,
        totalEarnings: Math.floor(15000 + Math.random() * 40000),
        totalCommission: Math.floor(2000 + Math.random() * 6000),
        totalWithdrawn: Math.floor(5000 + Math.random() * 15000),
      },
    });
    await db.teacherVerification.create({
      data: {
        teacherId: user.id,
        status: t.verified ? "APPROVED" : "PENDING",
        documents: t.verified
          ? [
              { type: "ID_CARD", title: "National ID", url: "/uploads/demo/nid.pdf" },
              { type: "DEGREE", title: "Degree certificate", url: "/uploads/demo/degree.pdf" },
            ]
          : [{ type: "ID_CARD", title: "National ID", url: "/uploads/demo/nid.pdf" }],
        submittedAt: daysFromNow(-30),
        reviewedAt: t.verified ? daysFromNow(-25) : null,
        reviewedById: t.verified ? admin.id : null,
      },
    });
    // Weekly availability: Sat–Thu 10:00–18:00
    for (const day of [0, 1, 2, 3, 4, 5]) {
      await db.availabilitySlot.create({
        data: { teacherId: user.id, dayOfWeek: day, startTime: "10:00", endTime: "18:00" },
      });
    }
  }

  // ---------------- Students ----------------
  const students: Record<string, { id: string }> = {};
  for (const [key, name, email] of [
    ["shawon", "Shawon Ahmed", "student@example.com"],
    ["mim", "Mim Akter", "mim@example.com"],
    ["arif", "Arif Chowdhury", "arif@example.com"],
  ] as const) {
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "STUDENT",
        emailVerified: new Date(),
        referralCode: `LEARN-${name.split(" ")[0].toUpperCase()}-${Math.floor(100 + Math.random() * 800)}`,
        studentProfile: {
          create: {
            interests: key === "shawon" ? ["Web Development", "Data Science"] : ["Design"],
            xp: key === "shawon" ? 1240 : 320,
            level: key === "shawon" ? 4 : 2,
            streakDays: key === "shawon" ? 6 : 1,
            lastStreakDate: new Date(),
            totalLearningMinutes: key === "shawon" ? 3200 : 480,
          },
        },
      },
    });
    students[key] = { id: user.id };
  }

  // Referral: Mim was referred by Shawon.
  await db.referral.create({
    data: { referrerId: students.shawon.id, refereeId: students.mim.id, status: "PENDING" },
  });

  // ---------------- Videos (central asset rows) ----------------
  const mkVideo = async (title: string, status: string, durationSeconds: number) =>
    db.video.create({
      data: {
        title,
        source: "LOCAL",
        filePath: `/uploads/demo/${title.toLowerCase().replace(/\s+/g, "-")}.mp4`,
        durationSeconds,
        sizeBytes: durationSeconds * 120_000,
        mimeType: "video/mp4",
        status,
        processingProgress: status === "READY" ? 100 : status === "PROCESSING" ? 35 : 0,
        uploadedById: admin.id,
      },
    });

  // ---------------- Courses ----------------
  interface CourseSeed {
    key: string;
    teacherKey: string;
    cat: string;
    title: string;
    subtitle: string;
    type: string;
    difficulty: string;
    price: number;
    compareAt: number | null;
    featured: boolean;
    modules: { title: string; lessons: { title: string; type: string; minutes: number; preview?: boolean }[] }[];
    reviews?: { name: string; rating: number; content: string }[];
  }

  const courseSeeds: CourseSeed[] = [
    {
      key: "web",
      teacherKey: "ayesha",
      cat: "web-development",
      title: "Complete Web Development Bootcamp: Zero to Full-Stack",
      subtitle: "HTML, CSS, JavaScript, React and Node.js — everything you need to get hired",
      type: "RECORDED",
      difficulty: "BEGINNER",
      price: 4500,
      compareAt: 8000,
      featured: true,
      modules: [
        {
          title: "Web Fundamentals",
          lessons: [
            { title: "How the web works", type: "VIDEO", minutes: 18, preview: true },
            { title: "HTML5 crash course", type: "VIDEO", minutes: 42, preview: true },
            { title: "CSS: styling like a pro", type: "VIDEO", minutes: 55 },
          ],
        },
        {
          title: "JavaScript & React",
          lessons: [
            { title: "JavaScript essentials", type: "VIDEO", minutes: 60 },
            { title: "React fundamentals", type: "VIDEO", minutes: 65 },
            { title: "Module quiz", type: "QUIZ", minutes: 20 },
          ],
        },
        {
          title: "Full-Stack & Deployment",
          lessons: [
            { title: "Node.js & Express", type: "VIDEO", minutes: 58 },
            { title: "Build your portfolio project", type: "ASSIGNMENT", minutes: 180 },
          ],
        },
      ],
      reviews: [
        { name: "Rakibul Islam", rating: 5, content: "Best web dev course in Bangla. The React section alone is worth it." },
        { name: "Sadia Afrin", rating: 5, content: "Ayesha apu explains everything so clearly. I got my first job!" },
      ],
    },
    {
      key: "react",
      teacherKey: "ayesha",
      cat: "web-development",
      title: "React & Next.js Masterclass: Build Production Apps",
      subtitle: "Server components, data fetching and real-world patterns used at scale",
      type: "RECORDED",
      difficulty: "INTERMEDIATE",
      price: 3500,
      compareAt: 6000,
      featured: true,
      modules: [
        {
          title: "Modern React",
          lessons: [
            { title: "Hooks deep dive", type: "VIDEO", minutes: 50 },
            { title: "State management patterns", type: "VIDEO", minutes: 45 },
          ],
        },
        {
          title: "Next.js App Router",
          lessons: [
            { title: "Server & client components", type: "VIDEO", minutes: 48 },
            { title: "Data fetching strategies", type: "VIDEO", minutes: 40 },
          ],
        },
      ],
      reviews: [{ name: "Tanvir Ahmed", rating: 5, content: "Finally understood server components properly." }],
    },
    {
      key: "ml",
      teacherKey: "tanvir",
      cat: "data-science-ai",
      title: "Machine Learning Fundamentals with Python",
      subtitle: "From linear regression to neural networks — with real datasets",
      type: "RECORDED",
      difficulty: "INTERMEDIATE",
      price: 5500,
      compareAt: 9000,
      featured: true,
      modules: [
        {
          title: "Foundations",
          lessons: [
            { title: "Python for ML", type: "VIDEO", minutes: 52 },
            { title: "Pandas & data cleaning", type: "VIDEO", minutes: 44 },
          ],
        },
        {
          title: "Models",
          lessons: [
            { title: "Regression & classification", type: "VIDEO", minutes: 62 },
            { title: "Model evaluation", type: "QUIZ", minutes: 25 },
            { title: "Intro to deep learning", type: "VIDEO", minutes: 55 },
          ],
        },
      ],
      reviews: [
        { name: "Nadia Islam", rating: 5, content: "Tanvir sir's explanations of evaluation metrics are unmatched." },
        { name: "Farhan Kabir", rating: 4, content: "Great course. Would love more Kaggle walkthroughs." },
      ],
    },
    {
      key: "ux",
      teacherKey: "nusrat",
      cat: "design-creative",
      title: "UI/UX Design: From Wireframes to Design Systems",
      subtitle: "Research, wireframes, Figma prototypes and handoff like a real product team",
      type: "RECORDED",
      difficulty: "BEGINNER",
      price: 2800,
      compareAt: 5000,
      featured: false,
      modules: [
        {
          title: "Design thinking",
          lessons: [
            { title: "User research basics", type: "VIDEO", minutes: 35 },
            { title: "Wireframing in Figma", type: "VIDEO", minutes: 50 },
          ],
        },
        {
          title: "Systems & handoff",
          lessons: [
            { title: "Design tokens & systems", type: "VIDEO", minutes: 45 },
            { title: "Portfolio project", type: "ASSIGNMENT", minutes: 240 },
          ],
        },
      ],
      reviews: [{ name: "Tasnim Rahman", rating: 5, content: "The design system section changed how I work entirely." }],
    },
    {
      key: "dsa",
      teacherKey: "rafiul",
      cat: "programming-software",
      title: "Data Structures & Algorithms Crash Course",
      subtitle: "Master interviews with 100+ curated problems in C++",
      type: "RECORDED",
      difficulty: "INTERMEDIATE",
      price: 3200,
      compareAt: 5500,
      featured: false,
      modules: [
        {
          title: "Core structures",
          lessons: [
            { title: "Arrays, stacks & queues", type: "VIDEO", minutes: 55 },
            { title: "Linked lists & trees", type: "VIDEO", minutes: 60 },
          ],
        },
        {
          title: "Algorithms",
          lessons: [
            { title: "Sorting & searching", type: "VIDEO", minutes: 50 },
            { title: "Dynamic programming", type: "VIDEO", minutes: 70 },
            { title: "Weekly problem set", type: "QUIZ", minutes: 45 },
          ],
        },
      ],
      reviews: [{ name: "Sabbir Hossain", rating: 5, content: "Cleared my interview at a top MNC thanks to this course." }],
    },
    {
      key: "fin",
      teacherKey: "sadia",
      cat: "business-finance",
      title: "Financial Accounting Essentials for Business",
      subtitle: "Read financial statements and model cash flows with confidence",
      type: "RECORDED",
      difficulty: "BEGINNER",
      price: 2500,
      compareAt: 4000,
      featured: false,
      modules: [
        {
          title: "Statements",
          lessons: [
            { title: "Balance sheet basics", type: "VIDEO", minutes: 40 },
            { title: "Income statement & cash flow", type: "VIDEO", minutes: 45 },
          ],
        },
      ],
    },
    {
      key: "english",
      teacherKey: "mahmudul",
      cat: "language-learning",
      title: "Spoken English for Professionals",
      subtitle: "Fluency practice with weekly live speaking clubs",
      type: "HYBRID",
      difficulty: "ALL_LEVELS",
      price: 1800,
      compareAt: 3000,
      featured: true,
      modules: [
        {
          title: "Foundations",
          lessons: [
            { title: "Pronunciation bootcamp", type: "VIDEO", minutes: 35 },
            { title: "Small talk mastery", type: "VIDEO", minutes: 30 },
            { title: "Weekly live speaking club", type: "LIVE", minutes: 60 },
          ],
        },
      ],
      reviews: [{ name: "Jannatul Ferdous", rating: 4, content: "The speaking club sessions are brilliant practice." }],
    },
    {
      key: "ielts",
      teacherKey: "mahmudul",
      cat: "exam-preparation",
      title: "1-on-1 IELTS Intensive Preparation",
      subtitle: "Personalized coaching targeting your desired band score",
      type: "ONE_ON_ONE",
      difficulty: "ALL_LEVELS",
      price: 8000,
      compareAt: 12000,
      featured: false,
      modules: [
        {
          title: "Diagnostics & plan",
          lessons: [
            { title: "Placement test & goal setting", type: "ARTICLE", minutes: 30 },
            { title: "Your personal study plan", type: "ARTICLE", minutes: 20 },
          ],
        },
      ],
    },
    {
      key: "ts-draft",
      teacherKey: "ayesha",
      cat: "programming-software",
      title: "Advanced TypeScript Patterns",
      subtitle: "Generics, conditional types and type-level programming",
      type: "RECORDED",
      difficulty: "ADVANCED",
      price: 2200,
      compareAt: null,
      featured: false,
      modules: [{ title: "Draft module", lessons: [{ title: "Generics deep dive", type: "VIDEO", minutes: 40 }] }],
    },
    {
      key: "uxr-draft",
      teacherKey: "nusrat",
      cat: "design-creative",
      title: "Intro to UX Research",
      subtitle: "Interviews, usability tests and synthesis",
      type: "RECORDED",
      difficulty: "BEGINNER",
      price: 1500,
      compareAt: null,
      featured: false,
      modules: [{ title: "Draft module", lessons: [{ title: "Research planning", type: "VIDEO", minutes: 30 }] }],
    },
  ];

  const courses: Record<string, { id: string; teacherId: string }> = {};
  for (const cs of courseSeeds) {
    const totalLessons = cs.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const totalMinutes = cs.modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + l.minutes, 0), 0);
    const isDraft = cs.key.includes("draft");

    const course = await db.course.create({
      data: {
        teacherId: teachers[cs.teacherKey].id,
        categoryId: catBySlug[cs.cat],
        title: cs.title,
        slug: cs.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        subtitle: cs.subtitle,
        description: `${cs.subtitle}. Taught in simple language with practical examples, real projects and lifetime access.`,
        type: cs.type,
        difficulty: cs.difficulty,
        language: "English",
        price: cs.price,
        compareAtPrice: cs.compareAt,
        requirements: ["Basic computer skills", "A laptop and internet connection", "Willingness to practice daily"],
        outcomes: [
          "Master the core skills with hands-on practice",
          "Build real projects for your portfolio",
          "Get a shareable certificate on completion",
        ],
        tags: cs.title.split(" ").slice(0, 4),
        status: isDraft ? "DRAFT" : "PUBLISHED",
        isFeatured: cs.featured,
        featuredAt: cs.featured ? daysFromNow(-5) : null,
        approvedById: isDraft ? null : admin.id,
        publishedAt: isDraft ? null : daysFromNow(-10),
        totalLessons,
        totalDurationMinutes: totalMinutes,
        enrollmentCount: 0,
        avgRating: 0,
        reviewCount: 0,
        modules: {
          create: cs.modules.map((m, mi) => ({
            title: m.title,
            sortOrder: mi,
            lessons: {
              create: m.lessons.map((l, li) => ({
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
    courses[cs.key] = { id: course.id, teacherId: teachers[cs.teacherKey].id };

    if (cs.reviews) {
      let i = 0;
      for (const r of cs.reviews) {
        const reviewer = await db.user.findFirst({ where: { name: r.name } });
        await db.review.create({
          data: {
            reviewerId: reviewer?.id ?? students.shawon.id,
            rating: r.rating,
            content: r.content,
            status: "PUBLISHED",
            verifiedPurchase: true,
            targetType: "COURSE",
            courseId: course.id,
          },
        });
        i++;
        // Update aggregate on the course
        const agg = await db.review.aggregate({
          where: { courseId: course.id, status: "PUBLISHED" },
          _avg: { rating: true },
          _count: true,
        });
        await db.course.update({
          where: { id: course.id },
          data: {
            avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
            reviewCount: agg._count,
            enrollmentCount: 25 + (i * 17) + Math.floor(Math.random() * 40),
          },
        });
      }
    } else {
      await db.course.update({
        where: { id: course.id },
        data: { enrollmentCount: 20 + Math.floor(Math.random() * 90) },
      });
    }
  }

  // ---------------- Quizzes & assignments (Phase 3) ----------------
  const quizSeed: Record<
    string,
    { title: string; passingScore: number; questions: { text: string; options: string[]; correctIndex: number; points?: number; explanation?: string }[] }
  > = {
    "Module quiz": {
      title: "JavaScript & React module quiz",
      passingScore: 60,
      questions: [
        {
          text: "What does JSX compile to?",
          options: ["HTML", "React.createElement calls", "CSS", "WebAssembly"],
          correctIndex: 1,
          explanation: "JSX is syntactic sugar for React.createElement.",
        },
        {
          text: "Which hook manages local state in a function component?",
          options: ["useEffect", "useState", "useContext", "useMemo"],
          correctIndex: 1,
        },
        {
          text: "What is a pure component's key characteristic?",
          options: ["Same output for same props", "Always re-renders", "Uses Redux", "Has no hooks"],
          correctIndex: 0,
          points: 2,
        },
      ],
    },
    "Model evaluation": {
      title: "Model evaluation quiz",
      passingScore: 50,
      questions: [
        {
          text: "Which metric is the ratio of true positives to all actual positives?",
          options: ["Precision", "Recall", "Accuracy", "F1"],
          correctIndex: 1,
          explanation: "Recall = TP / (TP + FN).",
        },
        {
          text: "Overfitting happens when…",
          options: ["Training error is much lower than test error", "Test error is lower than training error", "The dataset is too large", "Learning rate is zero"],
          correctIndex: 0,
        },
      ],
    },
    "Weekly problem set": {
      title: "Weekly DSA problem set",
      passingScore: 50,
      questions: [
        {
          text: "What is the time complexity of binary search?",
          options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
          correctIndex: 1,
        },
        {
          text: "Which data structure is LIFO?",
          options: ["Queue", "Stack", "Heap", "Graph"],
          correctIndex: 1,
          points: 2,
        },
        {
          text: "Dynamic programming is most useful when…",
          options: ["Subproblems overlap", "The input is sorted", "The graph is a tree", "Only one variable exists"],
          correctIndex: 0,
          explanation: "DP exploits overlapping subproblems and optimal substructure.",
        },
      ],
    },
  };
  for (const [lessonTitle, data] of Object.entries(quizSeed)) {
    const lessons = await db.lesson.findMany({
      where: { title: lessonTitle },
      include: { module: { include: { course: true } } },
    });
    for (const lesson of lessons) {
      await db.quiz.create({
        data: {
          lessonId: lesson.id,
          courseId: lesson.module.course.id,
          title: data.title,
          passingScore: data.passingScore,
          questions: {
            create: data.questions.map((q, i) => ({
              text: q.text,
              options: q.options,
              correctAnswer: { index: q.correctIndex },
              points: q.points ?? 1,
              explanation: q.explanation ?? null,
              sortOrder: i,
            })),
          },
        },
      });
    }
  }

  const assignmentSeed: Record<string, { title: string; description: string; maxScore: number }> = {
    "Build your portfolio project": {
      title: "Portfolio website",
      description:
        "Build a personal portfolio with at least 3 sections (hero, projects, contact). Deploy it anywhere and submit the live URL + a short reflection on your design decisions.",
      maxScore: 100,
    },
    "Portfolio project": {
      title: "Design portfolio case study",
      description:
        "Pick one real project, document the research → wireframes → final design journey, and submit a written case study with screenshots.",
      maxScore: 100,
    },
  };
  for (const [lessonTitle, data] of Object.entries(assignmentSeed)) {
    const lessons = await db.lesson.findMany({
      where: { title: lessonTitle },
      include: { module: { include: { course: true } } },
    });
    for (const lesson of lessons) {
      await db.assignment.create({
        data: {
          lessonId: lesson.id,
          courseId: lesson.module.course.id,
          teacherId: lesson.module.course.teacherId,
          title: data.title,
          description: data.description,
          maxScore: data.maxScore,
          dueDate: daysFromNow(14),
        },
      });
    }
  }

  // ---------------- Teacher reviews ----------------
  const teacherReviewDefs: { teacherKey: string; rating: number; content: string }[] = [
    { teacherKey: "ayesha", rating: 5, content: "Ayesha apu's 1-on-1 sessions completely transformed my understanding of React. Worth every taka." },
    { teacherKey: "ayesha", rating: 5, content: "Patient, precise and incredibly knowledgeable. Best teacher I've had." },
    { teacherKey: "tanvir", rating: 5, content: "Tanvir sir explains ML concepts with amazing clarity. Highly recommended." },
    { teacherKey: "nusrat", rating: 5, content: "Nusrat apu's design critique sessions are gold. My portfolio got me interviews!" },
    { teacherKey: "rafiul", rating: 4, content: "Intense but effective. My problem-solving speed doubled in a month." },
    { teacherKey: "sadia", rating: 5, content: "Finally, accounting that makes sense. Practical and exam-ready." },
  ];
  for (const tr of teacherReviewDefs) {
    await db.review.create({
      data: {
        reviewerId: students.mim.id,
        rating: tr.rating,
        content: tr.content,
        status: "PUBLISHED",
        verifiedPurchase: true,
        targetType: "TEACHER",
        teacherId: teachers[tr.teacherKey].id,
      },
    });
  }

  // ---------------- Enrollments + progress (demo student) ----------------
  const enrollDefs: { courseKey: string; pricePaid: number; progress: number }[] = [
    { courseKey: "web", pricePaid: 4500, progress: 100 },
    { courseKey: "ml", pricePaid: 5500, progress: 45 },
    { courseKey: "english", pricePaid: 1800, progress: 12 },
    { courseKey: "react", pricePaid: 0, progress: 0 },
  ];
  for (const e of enrollDefs) {
    const courseId = courses[e.courseKey].id;
    const enrollment = await db.enrollment.create({
      data: {
        studentId: students.shawon.id,
        courseId,
        status: e.progress === 100 ? "COMPLETED" : "ACTIVE",
        pricePaid: e.pricePaid,
        purchasedAt: daysFromNow(-20),
        completedAt: e.progress === 100 ? daysFromNow(-2) : null,
      },
    });
    await db.courseProgress.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: students.shawon.id,
        courseId,
        percentComplete: e.progress,
        lastAccessedAt: daysFromNow(-1),
        completedAt: e.progress === 100 ? daysFromNow(-2) : null,
      },
    });
    if (e.progress > 0) {
      const lessons = await db.lesson.findMany({
        where: { module: { courseId } },
        take: Math.max(1, Math.floor(e.progress / 100 * 8)),
      });
      for (const lesson of lessons) {
        await db.lessonProgress.create({
          data: {
            studentId: students.shawon.id,
            lessonId: lesson.id,
            completed: true,
            watchedSeconds: lesson.durationMinutes * 60,
            lastPositionSeconds: lesson.durationMinutes * 60,
            completedAt: daysFromNow(-3),
          },
        });
      }
    }
  }

  // ---------------- Payments / commissions / wallet ----------------
  const payDefs: { courseKey?: string; bookingTeacherKey?: string; amount: number; method: string; status: string; note: string }[] = [
    { courseKey: "web", amount: 4500, method: "BKASH", status: "COMPLETED", note: "Course purchase" },
    { courseKey: "ml", amount: 5500, method: "NAGAD", status: "COMPLETED", note: "Course purchase" },
    { courseKey: "english", amount: 1800, method: "BKASH", status: "COMPLETED", note: "Course purchase" },
    { bookingTeacherKey: "rafiul", amount: 600, method: "ROCKET", status: "COMPLETED", note: "1-on-1 tutoring session" },
    { courseKey: "react", amount: 3500, method: "ROCKET", status: "FAILED", note: "Course purchase (failed)" },
  ];
  let idx = 1;
  for (const p of payDefs) {
    const providerPaymentId = `DEV-PAY-${String(1000 + idx)}`;
    const payment = await db.payment.create({
      data: {
        studentId: students.shawon.id,
        amount: p.amount,
        currency: "BDT",
        method: p.method,
        provider: "DEV",
        providerPaymentId,
        providerTrxId: `TRX${providerPaymentId.slice(-8)}`,
        status: p.status,
        purpose: p.courseKey ? "COURSE_PURCHASE" : "BOOKING",
        courseId: p.courseKey ? courses[p.courseKey].id : null,
        paidAt: p.status === "COMPLETED" ? daysFromNow(-18) : null,
        metadata: { note: p.note },
      },
    });
    if (p.status === "COMPLETED") {
      await db.transaction.create({
        data: {
          userId: students.shawon.id,
          type: "PAYMENT",
          amount: p.amount,
          description: p.note,
          reference: `TX-${providerPaymentId}`,
          paymentId: payment.id,
          createdAt: daysFromNow(-18),
        },
      });
      const teacherId = p.courseKey ? courses[p.courseKey].teacherId : teachers[p.bookingTeacherKey!].id;
      const commissionAmount = Math.round(p.amount * 0.15);
      const commission = await db.commission.create({
        data: {
          paymentId: payment.id,
          teacherId,
          amount: commissionAmount,
          ratePercent: 15,
          status: "CAPTURED",
          capturedAt: daysFromNow(-17),
        },
      });
      const wallet = await db.teacherWallet.upsert({
        where: { teacherId },
        update: {},
        create: { teacherId },
      });
      const netAmount = p.amount - commissionAmount;
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: netAmount,
          description: p.note,
          commissionId: commission.id,
          balanceAfter: wallet.availableBalance + netAmount,
          createdAt: daysFromNow(-17),
        },
      });
      await db.teacherWallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: { increment: netAmount },
          totalEarnings: { increment: netAmount },
          totalCommission: { increment: commissionAmount },
        },
      });
      await db.notification.create({
        data: {
          userId: students.shawon.id,
          type: "PAYMENT_SUCCESS",
          title: "Payment successful",
          body: `${p.note}: ৳${p.amount.toLocaleString()} paid via ${p.method}.`,
          read: idx > 2,
          createdAt: daysFromNow(-18),
        },
      });
      await db.notification.create({
        data: {
          userId: teacherId,
          type: "PAYMENT_SUCCESS",
          title: "You earned ৳" + netAmount.toLocaleString(),
          body: p.note,
          read: true,
          createdAt: daysFromNow(-17),
        },
      });
    }
    idx++;
  }

  // ---------------- Live classes ----------------
  const liveDefs: { teacherKey: string; title: string; inHours: number; minutes: number; max: number; recording: boolean; price: number; ended?: boolean }[] = [
    { teacherKey: "ayesha", title: "Live: React Hooks Deep Dive", inHours: 20, minutes: 90, max: 50, recording: true, price: 0 },
    { teacherKey: "tanvir", title: "Machine Learning Q&A — Ask Me Anything", inHours: 44, minutes: 60, max: 100, recording: false, price: 0 },
    { teacherKey: "nusrat", title: "Figma Live Workshop: Design a Landing Page", inHours: 68, minutes: 120, max: 40, recording: true, price: 0 },
    { teacherKey: "rafiul", title: "DSA Problem Solving Marathon", inHours: 92, minutes: 150, max: 80, recording: true, price: 200 },
    { teacherKey: "mahmudul", title: "English Speaking Club: Fluency Practice", inHours: 116, minutes: 60, max: 30, recording: false, price: 0 },
    { teacherKey: "ayesha", title: "Intro to Web Dev — Live Q&A", inHours: -72, minutes: 60, max: 50, recording: true, price: 0, ended: true },
  ];
  const liveIds: string[] = [];
  for (const l of liveDefs) {
    const startsAt = hoursFromNow(l.inHours);
    const live = await db.liveClass.create({
      data: {
        teacherId: teachers[l.teacherKey].id,
        title: l.title,
        description: `A live, interactive session with ${l.teacherKey === "ayesha" ? "Ayesha Rahman" : ""} — bring your questions!`,
        startsAt,
        endsAt: new Date(startsAt.getTime() + l.minutes * 60_000),
        durationMinutes: l.minutes,
        maxStudents: l.max,
        status: l.ended ? "ENDED" : "SCHEDULED",
        recordingEnabled: l.recording,
        price: l.price,
        materials: [{ title: "Slides.pdf", url: "/uploads/demo/slides.pdf" }],
      },
    });
    liveIds.push(live.id);
    if (l.ended) {
      await db.liveClassParticipant.create({
        data: {
          liveClassId: live.id,
          userId: students.shawon.id,
          role: "STUDENT",
          joinedAt: hoursFromNow(-72),
          leftAt: hoursFromNow(-71),
          attendanceStatus: "PRESENT",
        },
      });
    } else {
      await db.liveClassParticipant.create({
        data: { liveClassId: live.id, userId: students.shawon.id, role: "STUDENT", attendanceStatus: "REGISTERED" },
      });
    }
  }
  await db.notification.create({
    data: {
      userId: students.shawon.id,
      type: "LIVE_CLASS_REMINDER",
      title: "Live class reminder",
      body: "React Hooks Deep Dive starts in under 24 hours.",
      read: false,
      createdAt: hoursFromNow(-1),
    },
  });

  // ---------------- Recorded classes ----------------
  const recordedDefs: {
    title: string;
    courseKey?: string;
    status: string;
    featured?: boolean;
    seconds: number;
    tags: string[];
    published?: boolean;
    moduleIdx?: number;
    lessonIdx?: number;
  }[] = [
    { title: "HTML & CSS Crash Course (Full Recording)", courseKey: "web", status: "PUBLISHED", featured: true, seconds: 5400, tags: ["html", "css", "beginner"], moduleIdx: 0, lessonIdx: 1 },
    { title: "JavaScript ES2024 Features Explained", courseKey: "web", status: "PUBLISHED", featured: true, seconds: 4800, tags: ["javascript", "es2024"], moduleIdx: 1, lessonIdx: 0 },
    { title: "Python for Data Science — Live Session Recording", courseKey: "ml", status: "PUBLISHED", featured: false, seconds: 6300, tags: ["python", "data-science"], moduleIdx: 0, lessonIdx: 0 },
    { title: "Figma Auto Layout Masterclass", courseKey: "ux", status: "PUBLISHED", featured: true, seconds: 3900, tags: ["figma", "design"], moduleIdx: 0, lessonIdx: 1 },
    { title: "Recursion Explained with 10 Problems", courseKey: "dsa", status: "PUBLISHED", featured: true, seconds: 5100, tags: ["algorithms", "recursion"], moduleIdx: 1, lessonIdx: 1 },
    { title: "IELTS Speaking Part 2 — Model Answers", courseKey: "ielts", status: "PUBLISHED", featured: false, seconds: 3300, tags: ["ielts", "speaking"], moduleIdx: 0, lessonIdx: 0 },
    { title: "SQL Window Functions Workshop", courseKey: "ml", status: "DRAFT", featured: false, seconds: 3600, tags: ["sql"], moduleIdx: 1, lessonIdx: 1 },
    { title: "Advanced CSS Grid Techniques", courseKey: "web", status: "PROCESSING", featured: false, seconds: 2700, tags: ["css", "grid"], moduleIdx: 0, lessonIdx: 2 },
  ];
  for (const rc of recordedDefs) {
    const video = await mkVideo(
      rc.title,
      rc.status === "PUBLISHED" || rc.status === "DRAFT" ? "READY" : "PROCESSING",
      rc.seconds,
    );
    const course = rc.courseKey ? courses[rc.courseKey] : null;
    let moduleId: string | null = null;
    let lessonId: string | null = null;
    if (course && rc.moduleIdx !== undefined && rc.lessonIdx !== undefined) {
      const modules = await db.courseModule.findMany({ where: { courseId: course.id }, orderBy: { sortOrder: "asc" } });
      const mod = modules[rc.moduleIdx];
      if (mod) {
        moduleId = mod.id;
        const lessons = await db.lesson.findMany({ where: { moduleId: mod.id }, orderBy: { sortOrder: "asc" } });
        lessonId = lessons[rc.lessonIdx]?.id ?? null;
      }
    }
    await db.recordedClass.create({
      data: {
        title: rc.title,
        slug: rc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: `Full recording of "${rc.title}" — watch at your own pace, resume where you left off, and take notes.`,
        courseId: course?.id ?? null,
        moduleId,
        lessonId,
        videoId: video.id,
        status: rc.status,
        durationSeconds: rc.seconds,
        tags: rc.tags,
        isFeatured: rc.featured ?? false,
        publishedAt: rc.status === "PUBLISHED" ? daysFromNow(-6) : null,
        uploadedById: admin.id,
        viewCount: 120 + Math.floor(Math.random() * 900),
        uniqueViewers: 40 + Math.floor(Math.random() * 200),
        avgRating: 4.5 + Math.random(),
        ratingCount: 5 + Math.floor(Math.random() * 30),
      },
    });
  }

  // ---------------- Bookings ----------------
  const completedBooking = await db.booking.create({
    data: {
      studentId: students.shawon.id,
      teacherId: teachers.rafiul.id,
      startsAt: daysFromNow(-7, 15),
      endsAt: daysFromNow(-7, 16),
      durationMinutes: 60,
      price: 600,
      topic: "Dynamic programming interview preparation",
      status: "COMPLETED",
      reviewed: true,
    },
  });
  await db.booking.create({
    data: {
      studentId: students.shawon.id,
      teacherId: teachers.ayesha.id,
      startsAt: daysFromNow(2, 15),
      endsAt: daysFromNow(2, 16),
      durationMinutes: 60,
      price: 800,
      topic: "React state management review",
      status: "ACCEPTED",
    },
  });
  await db.booking.create({
    data: {
      studentId: students.shawon.id,
      teacherId: teachers.nusrat.id,
      startsAt: daysFromNow(5, 11),
      endsAt: daysFromNow(5, 12),
      durationMinutes: 60,
      price: 700,
      topic: "Portfolio design critique",
      status: "PENDING",
    },
  });
  await db.review.create({
    data: {
      reviewerId: students.shawon.id,
      rating: 5,
      content: "Brilliant session — Rafiul sir found the exact gaps in my DP skills and gave me a clear plan.",
      status: "PUBLISHED",
      verifiedPurchase: true,
      targetType: "BOOKING",
      bookingId: completedBooking.id,
      teacherId: teachers.rafiul.id,
    },
  });
  await db.notification.create({
    data: {
      userId: teachers.ayesha.id,
      type: "NEW_BOOKING",
      title: "New booking request",
      body: "Shawon Ahmed booked a 1-on-1 session for React state management.",
      read: false,
      createdAt: hoursFromNow(-5),
    },
  });
  await db.notification.create({
    data: {
      userId: students.shawon.id,
      type: "BOOKING_ACCEPTED",
      title: "Booking confirmed",
      body: "Ayesha Rahman accepted your session on " + new Date().toDateString() + ".",
      read: false,
      createdAt: hoursFromNow(-4),
    },
  });

  // ---------------- Certificate + achievement ----------------
  const cert = await db.certificate.create({
    data: {
      certificateNumber: `LH-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
      studentId: students.shawon.id,
      courseId: courses.web.id,
      enrollmentId: (await db.enrollment.findFirst({ where: { studentId: students.shawon.id, courseId: courses.web.id } }))!.id,
      issuedAt: daysFromNow(-2),
      metadata: { courseTitle: "Complete Web Development Bootcamp: Zero to Full-Stack", teacherName: "Ayesha Rahman" },
    },
  });
  for (const code of ["FIRST_COURSE_COMPLETED", "COURSE_100"]) {
    await db.achievement.create({
      data: { userId: students.shawon.id, badgeId: (await db.badge.findUniqueOrThrow({ where: { code } })).id, status: "EARNED", earnedAt: daysFromNow(-2) },
    });
  }
  await db.notification.create({
    data: {
      userId: students.shawon.id,
      type: "CERTIFICATE_ISSUED",
      title: "Certificate issued 🎓",
      body: `Your certificate (${cert.certificateNumber}) for the Web Development Bootcamp is ready.`,
      read: false,
      createdAt: daysFromNow(-2),
    },
  });

  // ---------------- Withdrawals ----------------
  await db.withdrawal.create({
    data: {
      teacherId: teachers.tanvir.id,
      amount: 2000,
      method: "BKASH",
      accountDetails: { accountNumber: "01711xxxxxx", accountHolder: "Tanvir Hasan" },
      status: "PENDING",
      requestedAt: daysFromNow(-1),
    },
  });
  await db.withdrawal.create({
    data: {
      teacherId: teachers.ayesha.id,
      amount: 1000,
      method: "NAGAD",
      accountDetails: { accountNumber: "01811xxxxxx", accountHolder: "Ayesha Rahman" },
      status: "PAID",
      requestedAt: daysFromNow(-15),
      reviewedAt: daysFromNow(-14),
      reviewedById: admin.id,
      paidAt: daysFromNow(-13),
    },
  });

  // ---------------- Coupons ----------------
  await db.coupon.create({
    data: { code: "WELCOME10", type: "PERCENTAGE", value: 10, minPurchase: 0, maxUses: 100, perUserLimit: 1, status: "ACTIVE", createdById: admin.id },
  });
  await db.coupon.create({
    data: { code: "SAVE500", type: "FIXED", value: 500, minPurchase: 2000, maxUses: 50, perUserLimit: 1, status: "ACTIVE", createdById: admin.id, expiresAt: daysFromNow(30) },
  });

  // ---------------- Conversations ----------------
  const conversation = await db.conversation.create({ data: { type: "DIRECT" } });
  await db.conversationParticipant.create({ data: { conversationId: conversation.id, userId: students.shawon.id, lastReadAt: hoursFromNow(-6) } });
  await db.conversationParticipant.create({ data: { conversationId: conversation.id, userId: teachers.ayesha.id, lastReadAt: hoursFromNow(-6) } });
  const messages: [string, string, string][] = [
    [students.shawon.id, "TEXT", "Salam Ayesha apu! I finished the JavaScript module — the closures lesson was super clear."],
    [teachers.ayesha.id, "TEXT", "Walaikum assalam Shawon! Great job 🔥 Keep the momentum going."],
    [students.shawon.id, "TEXT", "Could you review my portfolio project this week?"],
    [teachers.ayesha.id, "TEXT", "Of course. Submit it as an assignment and I'll give detailed feedback by Friday."],
    [teachers.ayesha.id, "TEXT", "Also, don't miss the live class tomorrow evening — we'll cover hooks in depth."],
  ];
  let msgIdx = 0;
  for (const [senderId, type, content] of messages) {
    await db.message.create({
      data: { conversationId: conversation.id, senderId, type, content, createdAt: hoursFromNow(-6 + msgIdx) },
    });
    msgIdx++;
  }

  // ---------------- Wishlist (Phase 4) ----------------
  const webCourse = courses.web.id;
  await db.wishlistItem.create({
    data: { userId: students.shawon.id, type: "COURSE", courseId: webCourse },
  });
  await db.wishlistItem.create({
    data: { userId: students.shawon.id, type: "TEACHER", teacherId: teachers.nusrat.id },
  });

  // Student's own course review + a flagged review for the admin demo.
  await db.review.create({
    data: {
      reviewerId: students.shawon.id,
      rating: 5,
      content:
        "This bootcamp took me from zero to deploying my own full-stack app. The React module and the live Q&A sessions were fantastic.",
      status: "PUBLISHED",
      verifiedPurchase: true,
      targetType: "COURSE",
      courseId: webCourse,
    },
  });
  await db.review.create({
    data: {
      reviewerId: students.arif.id,
      rating: 2,
      content: "Content was okay but the pace was too fast for me.",
      status: "FLAGGED",
      verifiedPurchase: true,
      targetType: "COURSE",
      courseId: courses.ml.id,
      reportCount: 3,
    },
  });

  // ---------------- Announcements ----------------
  await db.announcement.create({
    data: {
      title: "📚 Recorded Classes library is now live!",
      body: "Watch full recordings of popular live sessions on demand. New recordings are added every week.",
      audience: "ALL",
      isActive: true,
      createdById: admin.id,
    },
  });
  await db.announcement.create({
    data: {
      title: "🎓 Teacher verification is open",
      body: "Get the verified badge on your profile. Submit your documents from the teacher dashboard.",
      audience: "TEACHERS",
      isActive: true,
      createdById: admin.id,
    },
  });

  // ---------------- Audit trail ----------------
  await db.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action: "system.seed",
      entityType: "Platform",
      metadata: { note: "Demo data seeded" },
    },
  });

  console.log(`✅ Seed complete!
   Users: admin@example.com / student@example.com / teacher (ayesha@example.com) — password "${DEMO_PASSWORD}"
   Roles: SUPER_ADMIN, MODERATOR, SUPPORT, 6 teachers, 3 students
   Content: 10 categories, 10 courses, 6 live classes, 8 recorded classes, bookings, payments, wallet, coupons, reviews…`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
