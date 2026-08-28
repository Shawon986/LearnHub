import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { CourseCard, type CourseCardData } from "@/components/shared/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All Courses",
  description: "Browse every published course on LearnHub — taught by verified experts.",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const [categories, courses] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(category ? { category: { slug: category } } : {}),
      },
      include: { teacher: true, category: true },
      orderBy: { enrollmentCount: "desc" },
      take: 60,
    }),
  ]);

  const cards: CourseCardData[] = courses.map((c) => ({
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-1.5">
        <h1 className="font-display text-3xl font-extrabold text-foreground">All courses</h1>
        <p className="text-[15px] text-muted-fg">
          {courses.length} published course{courses.length === 1 ? "" : "s"}
          {category ? ` in this category` : ""}.
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar" role="navigation" aria-label="Categories">
        <Link
          href="/courses"
          className={cn(
            "shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors",
            !category
              ? "border-brand bg-brand text-white"
              : "border-line bg-card text-muted-fg hover:border-line-strong hover:text-foreground",
          )}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/courses?category=${c.slug}`}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-[13px] font-bold transition-colors",
              category === c.slug
                ? "border-brand bg-brand text-white"
                : "border-line bg-card text-muted-fg hover:border-line-strong hover:text-foreground",
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="No courses found"
          description="Try a different category — new courses are published every week."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <CourseCard key={c.id} course={c} href={`/courses/${c.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
