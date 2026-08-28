import { MonitorPlay, ShieldCheck, Users, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { Hero } from "@/components/landing/hero";
import { CategoriesSection, type CategoryCardData } from "@/components/landing/categories-section";
import { AiSection } from "@/components/landing/ai-section";
import { FaqSection } from "@/components/landing/faq-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingSection } from "@/components/landing/pricing-section";
import { TestimonialsSection, type TestimonialData } from "@/components/landing/testimonials-section";
import { CtaSection } from "@/components/landing/cta-section";
import { SectionHeading } from "@/components/shared/section-heading";
import { CourseCard, type CourseCardData } from "@/components/shared/course-card";
import { TeacherCard, type TeacherCardData } from "@/components/shared/teacher-card";
import { LiveClassCard, type LiveClassCardData } from "@/components/shared/live-class-card";
import { RecordedClassCard, type RecordedClassCardData } from "@/components/shared/recorded-class-card";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

const WHY = [
  {
    icon: ShieldCheck,
    title: "Verified teachers",
    description: "Every teacher passes identity and credential verification before teaching.",
  },
  {
    icon: Zap,
    title: "Instant enrollment",
    description: "Pay with bKash, Nagad or Rocket and start learning in under a minute.",
  },
  {
    icon: MonitorPlay,
    title: "Live + on-demand",
    description: "Interactive live classrooms with chat and whiteboard, plus recorded classes 24/7.",
  },
  {
    icon: Users,
    title: "Real community",
    description: "Messages, reviews, streaks and leaderboards keep you motivated every day.",
  },
];

export default async function HomePage() {
  const [
    teacherCount,
    studentCount,
    publishedCourses,
    categories,
    teachers,
    teacherRatingAgg,
    courses,
    liveClasses,
    recordedClasses,
    testimonialsRaw,
  ] = await Promise.all([
    db.user.count({ where: { role: "TEACHER" } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.course.count({ where: { status: "PUBLISHED" } }),
    db.category.findMany({ where: { isFeatured: true }, orderBy: { sortOrder: "asc" }, take: 10 }),
    db.user.findMany({
      where: { role: "TEACHER", teacherProfile: { verified: true } },
      include: { teacherProfile: true, teacherSkills: true },
      take: 6,
    }),
    db.review.groupBy({
      by: ["teacherId"],
      where: { targetType: "TEACHER", status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    }),
    db.course.findMany({
      where: { status: "PUBLISHED" },
      include: { teacher: true, category: true },
      orderBy: { enrollmentCount: "desc" },
      take: 8,
    }),
    db.liveClass.findMany({
      where: { startsAt: { gte: new Date() }, status: { in: ["SCHEDULED", "LIVE"] } },
      include: { teacher: true },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    db.recordedClass.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 4,
    }),
    db.review.findMany({
      where: { status: "PUBLISHED", content: { not: null } },
      include: { reviewer: true, course: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const categoryCards: CategoryCardData[] = await Promise.all(
    categories.map(async (cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      color: cat.color,
      description: cat.description,
      courseCount: await db.course.count({
        where: { categoryId: cat.id, status: "PUBLISHED" },
      }),
    })),
  );

  const ratingByTeacher = new Map(
    teacherRatingAgg.map((r) => [r.teacherId, { avg: r._avg.rating ?? 0, count: r._count }]),
  );

  const teacherCards: TeacherCardData[] = teachers.map((t) => {
    const agg = ratingByTeacher.get(t.id);
    return {
      id: t.id,
      name: t.name,
      avatarUrl: t.avatarUrl,
      headline: t.teacherProfile?.headline ?? null,
      verified: t.teacherProfile?.verified ?? false,
      hourlyRate: t.teacherProfile?.hourlyRate ?? 0,
      avgRating: Math.round((agg?.avg ?? 0) * 10) / 10,
      reviewCount: agg?.count ?? 0,
      totalStudents: t.teacherProfile?.totalStudents ?? 0,
      skills: t.teacherSkills.map((s) => s.name),
      location: t.teacherProfile?.location ?? null,
    };
  });

  const courseCards: CourseCardData[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    type: c.type,
    price: c.price,
    compareAtPrice: c.compareAtPrice,
    thumbnailUrl: c.thumbnailUrl,
    teacherName: c.teacher.name,
    teacherAvatarUrl: c.teacher.avatarUrl,
    categoryName: c.category.name,
    avgRating: c.avgRating,
    reviewCount: c.reviewCount,
    enrollmentCount: c.enrollmentCount,
    totalDurationMinutes: c.totalDurationMinutes,
    totalLessons: c.totalLessons,
  }));

  const liveCards: LiveClassCardData[] = liveClasses.map((l) => ({
    id: l.id,
    title: l.title,
    startsAt: l.startsAt.toISOString(),
    endsAt: l.endsAt.toISOString(),
    status: l.status,
    teacherName: l.teacher.name,
    teacherAvatarUrl: l.teacher.avatarUrl,
    durationSeconds: l.durationMinutes * 60,
  }));

  const recordedCards: RecordedClassCardData[] = recordedClasses.map((r) => ({
    id: r.id,
    title: r.title,
    durationSeconds: r.durationSeconds,
    tags: safeJsonParse<string[]>(r.tags, []),
    viewCount: r.viewCount,
    avgRating: r.avgRating,
    ratingCount: r.ratingCount,
  }));

  const testimonials: TestimonialData[] = testimonialsRaw
    .filter((t) => t.content)
    .slice(0, 6)
    .map((t) => ({
      id: t.id,
      authorName: t.reviewer?.name ?? "Anonymous",
      rating: t.rating,
      content: t.content!,
      context: t.course?.title ? `on ${t.course.title}` : "Verified learner",
    }));

  return (
    <>
      <Hero
        stats={{
          teachers: teacherCount,
          students: studentCount,
          courses: publishedCourses,
          avgRating: 4.9,
        }}
      />

      {/* Popular categories */}
      <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Categories"
          title="What do you want to learn today?"
          description="From programming to design, business to languages — find your path."
        />
        <CategoriesSection categories={categoryCards} />
      </section>

      {/* Featured courses */}
      <section id="courses" className="scroll-mt-24 border-y border-line bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Featured courses"
            title="Most popular courses on LearnHub"
            description="Structured curriculums, real projects and certificates — taught by verified experts."
          />
          <RevealGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {courseCards.map((c) => (
              <RevealItem key={c.id} className="h-full">
                <CourseCard course={c} href={`/courses/${c.slug}`} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Live classes */}
      <section id="live" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Live classes"
          title="Learn together, in real time"
          description="Interactive classrooms with chat, whiteboard, polls and screen sharing."
        />
        <RevealGroup className="grid gap-5 md:grid-cols-3">
          {liveCards.map((l) => (
            <RevealItem key={l.id}>
              <LiveClassCard liveClass={l} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* Recorded classes */}
      <section id="recorded" className="scroll-mt-24 border-y border-line bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Recorded classes"
            title="Missed a class? Watch the recording"
            description="Full recordings of popular live sessions — resume where you left off, take notes, download resources."
          />
          <RevealGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {recordedCards.map((r) => (
              <RevealItem key={r.id}>
                <RecordedClassCard recorded={r} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Teachers */}
      <section id="teachers" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Teachers"
          title="Learn from verified experts"
          description="Every teacher is vetted. Book 1-on-1 sessions or enroll in their courses."
        />
        <RevealGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {teacherCards.map((t) => (
            <RevealItem key={t.id} className="h-full">
              <TeacherCard teacher={t} href={`/teachers/${t.id}`} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-line bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Four steps to your next skill"
            description="Simple for students, powerful for teachers."
          />
          <HowItWorks />
        </div>
      </section>

      {/* Why choose us */}
      <section id="why" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Why LearnHub"
          title="Built for Bangladesh, made for the world"
        />
        <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <RevealItem key={w.title}>
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-fg [&>svg]:h-5 [&>svg]:w-5">
                  <w.icon />
                </span>
                <h3 className="font-display text-[15px] font-bold text-foreground">{w.title}</h3>
                <p className="text-[13px] leading-relaxed text-muted-fg">{w.description}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* AI */}
      <section id="ai" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20 sm:px-6">
        <AiSection />
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <SectionHeading
          eyebrow="Success stories"
          title="Learners love LearnHub"
          description="Real reviews from verified students."
        />
        <TestimonialsSection testimonials={testimonials} />
      </section>

      {/* Pricing / commission */}
      <section id="pricing" className="scroll-mt-24 border-t border-line bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Fair for everyone"
            description="Students pay for value. Teachers keep 85% of every sale — no hidden fees."
          />
          <PricingSection />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions? Answered." />
        <FaqSection />
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <CtaSection />
      </section>
    </>
  );
}
