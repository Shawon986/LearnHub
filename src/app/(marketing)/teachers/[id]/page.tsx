import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Clock,
  Globe2,
  GraduationCap,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { safeJsonParse } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Card } from "@/components/ui/card";
import { CourseCard, type CourseCardData } from "@/components/shared/course-card";
import { WishlistButton } from "@/components/shared/wishlist-button";
import { ReviewForm } from "@/components/shared/review-form";
import { BookingButton } from "@/components/booking/booking-modal";
import { MessageButton } from "@/components/shared/message-button";
import { formatBDT, formatDate } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const teacher = await db.user.findFirst({
    where: { id, role: "TEACHER" },
    include: { teacherProfile: true },
  });
  if (!teacher) return { title: "Teacher not found" };
  return {
    title: `${teacher.name} — Teacher`,
    description:
      teacher.teacherProfile?.headline ??
      `${teacher.name} teaches on LearnHub — book 1-on-1 sessions or enroll in their courses.`,
  };
}

export default async function TeacherProfilePage({ params }: PageProps) {
  const { id } = await params;
  const teacher = await db.user.findFirst({
    where: { id, role: "TEACHER" },
    include: {
      teacherProfile: true,
      teacherSkills: true,
      teacherEducation: { orderBy: { startYear: "desc" } },
      teacherExperience: { orderBy: { startDate: "desc" } },
    },
  });
  if (!teacher) notFound();
  const profile = teacher.teacherProfile;

  const [
    reviews,
    reviewAgg,
    courses,
    liveClasses,
    availabilitySlots,
    enrollmentCount,
    bookingCount,
  ] = await Promise.all([
    db.review.findMany({
      where: { teacherId: id, status: "PUBLISHED", targetType: "TEACHER" },
      include: { reviewer: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.review.aggregate({
      where: { teacherId: id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    }),
    db.course.findMany({
      where: { teacherId: id, status: "PUBLISHED" },
      include: { category: true },
      orderBy: { enrollmentCount: "desc" },
      take: 6,
    }),
    db.liveClass.findMany({
      where: { teacherId: id, startsAt: { gte: new Date() }, status: { in: ["SCHEDULED"] } },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
    db.availabilitySlot.findMany({ where: { teacherId: id }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    db.enrollment.count({ where: { course: { teacherId: id }, status: { in: ["ACTIVE", "COMPLETED"] } } }),
    db.booking.count({ where: { teacherId: id, status: "COMPLETED" } }),
  ]);

  const avg = Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  // Current user context for review/wishlist state.
  const currentUser = await getCurrentUser();
  let canReview = false;
  let myReview = null as { id: string; rating: number; content: string } | null;
  let saved = false;
  if (currentUser && currentUser.id !== id) {
    const [booking, enrollment, existingReview, wishItem] = await Promise.all([
      db.booking.findFirst({ where: { studentId: currentUser.id, teacherId: id } }),
      db.enrollment.findFirst({ where: { studentId: currentUser.id, course: { teacherId: id } } }),
      db.review.findFirst({
        where: { reviewerId: currentUser.id, teacherId: id, targetType: "TEACHER" },
      }),
      db.wishlistItem.findFirst({
        where: { userId: currentUser.id, type: "TEACHER", teacherId: id },
      }),
    ]);
    canReview = Boolean(booking || enrollment || existingReview);
    if (existingReview && existingReview.content) {
      myReview = { id: existingReview.id, rating: existingReview.rating, content: existingReview.content };
    }
    saved = Boolean(wishItem);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: teacher.name,
    description: profile?.headline ?? undefined,
    mainEntity: {
      "@type": "Person",
      name: teacher.name,
      jobTitle: profile?.headline ?? undefined,
      knowsAbout: teacher.teacherSkills.map((s) => s.name),
      ...(profile?.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location } } : {}),
    },
    aggregateRating: reviewAgg._count > 0
      ? { "@type": "AggregateRating", ratingValue: Math.round((reviewAgg._avg.rating ?? 0) * 10) / 10, reviewCount: reviewAgg._count }
      : undefined,
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const slotsByDay = new Map<number, string[]>();
  for (const s of availabilitySlots) {
    const list = slotsByDay.get(s.dayOfWeek) ?? [];
    list.push(`${s.startTime}–${s.endTime}`);
    slotsByDay.set(s.dayOfWeek, list);
  }

  const courseCards: CourseCardData[] = courses.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    type: c.type,
    price: c.price,
    compareAtPrice: c.compareAtPrice,
    thumbnailUrl: c.thumbnailUrl,
    teacherName: teacher.name,
    teacherAvatarUrl: teacher.avatarUrl,
    categoryName: c.category.name,
    avgRating: c.avgRating,
    reviewCount: c.reviewCount,
    enrollmentCount: c.enrollmentCount,
    totalDurationMinutes: c.totalDurationMinutes,
    totalLessons: c.totalLessons,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand via-violet-700 to-accent p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-5 text-white">
            <Avatar name={teacher.name} src={teacher.avatarUrl} size="xl" className="ring-4 ring-white/25" />
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold sm:text-3xl">
                {teacher.name}
                {profile?.verified && (
                  <BadgeCheck className="h-6 w-6 text-emerald-300" aria-label="Verified teacher" />
                )}
              </h1>
              <p className="mt-1 text-[14px] text-white/85">{profile?.headline ?? "Teacher on LearnHub"}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/80">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> {profile?.totalStudents ?? enrollmentCount} students
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> {profile?.yearsExperience ?? 0} years experience
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" /> {bookingCount} sessions taught
                </span>
                {profile?.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {profile.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <WishlistButton
                type="TEACHER"
                targetId={id}
                initialSaved={saved}
                label={saved ? "Saved" : "Save"}
                className="border border-white/25 bg-white/15 text-white hover:bg-white/25"
              />
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-4">
          <div className="p-5 text-center">
            <p className="font-display text-xl font-extrabold text-foreground">{avg.toFixed(1)}</p>
            <Rating value={avg} size={12} className="mt-1 justify-center" />
            <p className="mt-1 text-[11px] text-faint-fg">{reviewAgg._count} reviews</p>
          </div>
          <div className="p-5 text-center">
            <p className="font-display text-xl font-extrabold text-foreground">
              {profile && profile.hourlyRate > 0 ? `${formatBDT(profile.hourlyRate)}/hr` : "—"}
            </p>
            <p className="mt-1 text-[11px] text-faint-fg">1-on-1 rate</p>
          </div>
          <div className="p-5 text-center">
            <p className="font-display text-xl font-extrabold text-foreground">{courses.length}</p>
            <p className="mt-1 text-[11px] text-faint-fg">Courses</p>
          </div>
          <div className="p-5 text-center">
            <p className="font-display text-xl font-extrabold text-foreground">{liveClasses.length}</p>
            <p className="mt-1 text-[11px] text-faint-fg">Upcoming live classes</p>
          </div>
        </div>
      </Card>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.7fr_1fr]">
        {/* Left column */}
        <div className="space-y-10">
          {/* About */}
          {profile?.about && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="mb-3 font-display text-lg font-bold text-foreground">
                About
              </h2>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-muted-fg">{profile.about}</p>
            </section>
          )}

          {/* Skills */}
          {teacher.teacherSkills.length > 0 && (
            <section aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-brand-fg" /> Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {teacher.teacherSkills.map((s) => (
                  <Badge key={s.id} variant="brand" size="md">
                    {s.name}
                    <span className="text-[10px] font-bold uppercase opacity-70">· {s.proficiency}</span>
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {teacher.teacherEducation.length > 0 && (
            <section aria-labelledby="edu-heading">
              <h2 id="edu-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <GraduationCap className="h-4 w-4 text-brand-fg" /> Education
              </h2>
              <ul className="space-y-3">
                {teacher.teacherEducation.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-xl border border-line bg-card p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                      <GraduationCap className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">
                        {e.degree}{e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}
                      </p>
                      <p className="text-[12px] text-muted-fg">
                        {e.institution} · {e.startYear}–{e.endYear ?? "Present"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Experience */}
          {teacher.teacherExperience.length > 0 && (
            <section aria-labelledby="exp-heading">
              <h2 id="exp-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Briefcase className="h-4 w-4 text-brand-fg" /> Experience
              </h2>
              <ul className="space-y-3">
                {teacher.teacherExperience.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 rounded-xl border border-line bg-card p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-foreground">{e.title}</p>
                      <p className="text-[12px] text-muted-fg">
                        {e.company} · {formatDate(e.startDate)}–{e.current ? "Present" : e.endDate ? formatDate(e.endDate) : "—"}
                      </p>
                      {e.description && (
                        <p className="mt-1 text-[12px] text-faint-fg">{e.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Courses */}
          <section aria-labelledby="courses-heading">
            <h2 id="courses-heading" className="mb-4 font-display text-lg font-bold text-foreground">
              Courses by {teacher.name.split(" ")[0]}
            </h2>
            {courseCards.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
                No published courses yet.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {courseCards.map((c) => (
                  <CourseCard key={c.id} course={c} href={`/courses/${c.slug}`} />
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section aria-labelledby="reviews-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="reviews-heading" className="font-display text-lg font-bold text-foreground">
                Reviews ({reviews.length})
              </h2>
            </div>

            {/* Distribution */}
            <div className="mb-5 flex flex-wrap items-center gap-6 rounded-2xl border border-line bg-card p-5">
              <div className="text-center">
                <p className="font-display text-3xl font-extrabold text-foreground">{avg.toFixed(1)}</p>
                <Rating value={avg} size={14} className="mt-1 justify-center" />
              </div>
              <div className="min-w-40 flex-1 space-y-1.5">
                {distribution.map((d) => (
                  <div key={d.star} className="flex items-center gap-2 text-[12px]">
                    <span className="w-8 font-bold text-muted-fg">{d.star}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-card-2">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-faint-fg">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
                  No reviews yet — book a session and share your experience.
                </p>
              ) : (
                reviews.map((r) => (
                  <Card key={r.id} className="p-5">
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
                      <p className="mt-3 text-[13px] leading-relaxed text-muted-fg">{r.content}</p>
                    )}
                  </Card>
                ))
              )}
            </div>

            {/* Review form */}
            <div className="mt-6">
              <ReviewForm
                targetType="TEACHER"
                targetId={id}
                targetName={teacher.name}
                existing={myReview}
                canReview={canReview}
                ineligibleReason={
                  currentUser?.id === id
                    ? "You cannot review your own profile."
                    : currentUser
                      ? "Book a 1-on-1 session or enroll in one of this teacher's courses to leave a review (booking arrives in Phase 5)."
                      : undefined
                }
              />
            </div>
          </section>
        </div>

        {/* Right column */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* Booking card */}
          <Card className="p-6">
            <h2 className="font-display text-[15px] font-bold text-foreground">Book a 1-on-1 session</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">
              {profile && profile.hourlyRate > 0
                ? `${formatBDT(profile.hourlyRate)} per hour — choose a time from the teacher's availability.`
                : "Contact for pricing."}
            </p>
            <div className="mt-4 space-y-2">
              <BookingButton
                teacherId={id}
                teacherName={teacher.name}
                hourlyRate={profile?.hourlyRate ?? 0}
              />
              <MessageButton teacherId={id} teacherName={teacher.name} />
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-faint-fg">
              Payment is collected when the teacher confirms your booking.
            </p>
          </Card>

          {/* Languages */}
          {profile && safeJsonParse<string[]>(profile.languages, []).length > 0 && (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-foreground">
                <Globe2 className="h-4 w-4 text-brand-fg" /> Languages
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {safeJsonParse<string[]>(profile.languages, []).map((l) => (
                  <Badge key={l} variant="neutral" size="md">
                    {l}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Weekly availability */}
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-foreground">
              <CalendarDays className="h-4 w-4 text-brand-fg" /> Weekly availability
            </h2>
            <ul className="mt-3 space-y-2">
              {dayNames.map((d, i) => {
                const slots = slotsByDay.get(i) ?? [];
                return (
                  <li key={d} className="flex items-center justify-between text-[12px]">
                    <span className="font-semibold text-muted-fg">{d}</span>
                    <span className="text-foreground">
                      {slots.length > 0 ? slots.join(" · ") : <span className="text-faint-fg">Off</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
