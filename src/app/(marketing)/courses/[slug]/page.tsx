import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  Globe2,
  PlayCircle,
  Signal,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { safeJsonParse, safeJsonLd } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Card } from "@/components/ui/card";
import { EnrollButton } from "./enroll-button";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { ReviewForm } from "@/components/shared/review-form";
import { formatBDT, formatNumber, formatDurationSeconds } from "@/lib/format";
import { gradientFor } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await db.course.findUnique({ where: { slug } });
  if (!course || course.status !== "PUBLISHED") {
    return { title: "Course not found" };
  }
  return {
    title: course.title,
    description: course.subtitle ?? course.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: course.title,
      description: course.subtitle ?? undefined,
      type: "website",
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await db.course.findUnique({
    where: { slug },
    include: {
      teacher: { include: { teacherProfile: true, teacherSkills: true } },
      category: true,
      modules: {
        include: {
          lessons: { orderBy: { sortOrder: "asc" }, include: { quiz: { include: { _count: { select: { questions: true } } } } } },
        },
        orderBy: { sortOrder: "asc" },
      },
      reviews: {
        where: { status: "PUBLISHED", targetType: "COURSE" },
        include: { reviewer: { select: { name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || course.status !== "PUBLISHED") notFound();

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
  const currentUser = await getCurrentUser();
  const [enrollment, myReview, savedWish] = currentUser
    ? await Promise.all([
        db.enrollment.findUnique({
          where: { studentId_courseId: { studentId: currentUser.id, courseId: course.id } },
        }),
        db.review.findFirst({
          where: { reviewerId: currentUser.id, courseId: course.id, targetType: "COURSE" },
        }),
        db.wishlistItem.findFirst({
          where: { userId: currentUser.id, type: "COURSE", courseId: course.id },
        }),
      ])
    : [null, null, null];

  const requirements = safeJsonParse<string[]>(course.requirements, []);
  const outcomes = safeJsonParse<string[]>(course.outcomes, []);
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalSeconds = course.totalDurationMinutes * 60;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle ?? course.description ?? undefined,
    provider: {
      "@type": "Organization",
      name: "LearnHub",
      sameAs: baseUrl,
    },
    ...(course.teacher.teacherProfile?.verified
      ? {
          hasCourseInstance: {
            "@type": "CourseInstance",
            instructor: { "@type": "Person", name: course.teacher.name },
          },
        }
      : {}),
    aggregateRating: course.reviewCount > 0
      ? { "@type": "AggregateRating", ratingValue: course.avgRating, reviewCount: course.reviewCount }
      : undefined,
    offers:
      course.price > 0
        ? { "@type": "Offer", price: course.price, priceCurrency: "BDT", availability: "https://schema.org/InStock" }
        : { "@type": "Offer", price: 0, priceCurrency: "BDT" },
  };

  return (
    <div className="bg-brand-surface min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
          <nav className="mb-6 text-[12px] font-semibold text-muted-fg" aria-label="Breadcrumb">
            <Link href="/courses" className="hover:text-foreground">
              Courses
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/courses?category=${course.category.slug}`} className="hover:text-foreground">
              {course.category.name}
            </Link>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            {/* Left */}
            <div>
              <Badge variant="brand" size="md" className="mb-4">
                {course.type.replace("_", " ")}
              </Badge>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
                {course.title}
              </h1>
              {course.subtitle && (
                <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-fg">{course.subtitle}</p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-muted-fg">
                <span className="flex items-center gap-1.5">
                  <Rating value={course.avgRating} size={14} />
                  <strong className="text-foreground">{course.avgRating.toFixed(1)}</strong> ({course.reviewCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {formatNumber(course._count.enrollments)} students
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {formatDurationSeconds(totalSeconds)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Signal className="h-4 w-4" /> {course.difficulty.replace("_", " ").toLowerCase()}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4" /> {course.language}
                </span>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Avatar name={course.teacher.name} src={course.teacher.avatarUrl} size="md" />
                <div>
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                    {course.teacher.name}
                    {course.teacher.teacherProfile?.verified && (
                      <BadgeCheck className="h-4 w-4 text-accent" aria-label="Verified teacher" />
                    )}
                  </p>
                  <p className="text-[12px] text-faint-fg">
                    {course.teacher.teacherProfile?.headline ?? "Instructor"}
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky enrollment card */}
            <div className="lg:pl-4">
              <Card className="lg:sticky lg:top-24">
                <div className={`relative flex h-44 items-center justify-center rounded-t-2xl bg-gradient-to-br ${gradientFor(course.title)}`}>
                  <PlayCircle className="h-12 w-12 fill-white/80 text-white/80" aria-hidden />
                  {course.compareAtPrice && course.compareAtPrice > course.price && (
                    <Badge variant="danger" className="absolute left-4 top-4">
                      −{Math.round((1 - course.price / course.compareAtPrice) * 100)}%
                    </Badge>
                  )}
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-foreground">
                      {course.price === 0 ? "Free" : formatBDT(course.price)}
                    </span>
                    {course.compareAtPrice && course.compareAtPrice > course.price && (
                      <span className="text-sm text-faint-fg line-through">
                        {formatBDT(course.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <EnrollButton
                      courseId={course.id}
                      price={course.price}
                      enrolled={Boolean(enrollment)}
                      hasSession={Boolean(currentUser)}
                    />
                    <WishlistButton
                      type="COURSE"
                      targetId={course.id}
                      initialSaved={Boolean(savedWish)}
                      className="border border-line bg-card hover:bg-card-2"
                    />
                  </div>

                  <ul className="space-y-2.5 border-t border-line pt-4 text-[13px] text-muted-fg">
                    <li className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-brand-fg" /> {course.modules.length} modules · {totalLessons} lessons
                    </li>
                    <li className="flex items-center gap-2">
                      <PlayCircle className="h-4 w-4 text-brand-fg" /> Recorded + live sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-brand-fg" /> Certificate on completion
                    </li>
                    <li className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-brand-fg" /> Lifetime access
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto mt-6 grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-10">
          {/* What you'll learn */}
          <section aria-labelledby="outcomes-heading">
            <h2 id="outcomes-heading" className="mb-4 font-display text-lg font-bold text-foreground">
              What you&apos;ll learn
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {outcomes.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted-fg">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          {/* Curriculum */}
          <section aria-labelledby="curriculum-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="curriculum-heading" className="font-display text-lg font-bold text-foreground">
                Curriculum
              </h2>
              <span className="text-[12px] text-faint-fg">
                {course.modules.length} modules · {totalLessons} lessons
              </span>
            </div>
            <div className="space-y-3">
              {course.modules.map((m, mi) => (
                <details
                  key={m.id}
                  className="group rounded-2xl border border-line bg-card shadow-soft"
                  open={mi === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-wide text-faint-fg">
                        Module {mi + 1}
                      </p>
                      <h3 className="mt-0.5 font-display text-[15px] font-bold text-foreground">
                        {m.title}
                      </h3>
                    </div>
                    <span className="text-[12px] text-faint-fg">
                      {m.lessons.length} lessons
                    </span>
                  </summary>
                  <ul className="border-t border-line">
                    {m.lessons.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center gap-3 border-b border-line/60 px-5 py-3 text-[13px] last:border-b-0"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card-2 text-muted-fg">
                          {l.type === "VIDEO" ? (
                            <PlayCircle className="h-3.5 w-3.5" />
                          ) : l.type === "QUIZ" ? (
                            <BookOpen className="h-3.5 w-3.5" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="flex-1 text-muted-fg">{l.title}</span>
                        {l.quiz && (
                          <Badge variant="neutral" size="sm">
                            {l.quiz._count.questions} questions
                          </Badge>
                        )}
                        {l.isPreview && <Badge variant="accent" size="sm">Preview</Badge>}
                        {l.durationMinutes > 0 && (
                          <span className="text-[11px] tabular-nums text-faint-fg">{l.durationMinutes}m</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          {/* Requirements */}
          {requirements.length > 0 && (
            <section aria-labelledby="req-heading">
              <h2 id="req-heading" className="mb-4 font-display text-lg font-bold text-foreground">
                Requirements
              </h2>
              <ul className="space-y-2">
                {requirements.map((r, i) => (
                  <li key={i} className="text-[13px] text-muted-fg">
                    • {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Description */}
          {course.description && (
            <section aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="mb-4 font-display text-lg font-bold text-foreground">
                Description
              </h2>
              <p className="text-[14px] leading-relaxed text-muted-fg">{course.description}</p>
            </section>
          )}

          {/* Reviews */}
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="mb-4 font-display text-lg font-bold text-foreground">
              Student reviews
            </h2>
            {course.reviews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
                No reviews yet — be the first after completing the course.
              </p>
            ) : (
              <div className="space-y-3">
                {course.reviews.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.reviewer.name} src={r.reviewer.avatarUrl} size="sm" />
                      <div>
                        <p className="text-[13px] font-bold text-foreground">{r.reviewer.name}</p>
                        <Rating value={r.rating} size={12} />
                      </div>
                      {r.verifiedPurchase && (
                        <Badge variant="success" size="sm" className="ml-auto">
                          Verified
                        </Badge>
                      )}
                    </div>
                    {r.content && (
                      <p className="mt-2.5 text-[13px] leading-relaxed text-muted-fg">{r.content}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-6">
              <ReviewForm
                targetType="COURSE"
                targetId={course.id}
                targetName={course.title}
                existing={
                  myReview && myReview.content
                    ? { id: myReview.id, rating: myReview.rating, content: myReview.content }
                    : null
                }
                canReview={Boolean(enrollment)}
                ineligibleReason={
                  currentUser?.id === course.teacherId
                    ? "You cannot review your own course."
                    : currentUser
                      ? "Enroll in this course to leave a review."
                      : undefined
                }
              />
            </div>
          </section>
        </div>

        {/* Right column: teacher */}
        <aside aria-label="About the instructor">
          <Card className="p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-4">
              <Avatar name={course.teacher.name} src={course.teacher.avatarUrl} size="lg" />
              <div>
                <p className="flex items-center gap-1.5 font-display text-[15px] font-bold text-foreground">
                  {course.teacher.name}
                  {course.teacher.teacherProfile?.verified && (
                    <BadgeCheck className="h-4 w-4 text-accent" />
                  )}
                </p>
                <p className="text-[12px] text-faint-fg">
                  {course.teacher.teacherProfile?.location ?? "Bangladesh"}
                </p>
              </div>
            </div>

            {course.teacher.teacherProfile?.about && (
              <p className="mt-4 text-[13px] leading-relaxed text-muted-fg">
                {course.teacher.teacherProfile.about}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-1.5">
              {course.teacher.teacherSkills.slice(0, 5).map((s) => (
                <Badge key={s.id} variant="brand" size="sm">
                  {s.name}
                </Badge>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-line pt-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-fg">Students</span>
                <span className="font-bold text-foreground">
                  {formatNumber(course.teacher.teacherProfile?.totalStudents ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-fg">Experience</span>
                <span className="font-bold text-foreground">
                  {course.teacher.teacherProfile?.yearsExperience ?? 0} years
                </span>
              </div>
              {course.teacher.teacherProfile && course.teacher.teacherProfile.hourlyRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-fg">1-on-1 rate</span>
                  <span className="font-bold text-foreground">
                    {formatBDT(course.teacher.teacherProfile.hourlyRate)}/hr
                  </span>
                </div>
              )}
            </div>

            <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-center text-[12px] font-semibold text-brand-fg">
              Booking 1-on-1 sessions arrives in Phase 5
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
