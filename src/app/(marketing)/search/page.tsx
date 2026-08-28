import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { searchQuerySchema } from "@/lib/validation/discovery";
import { SearchBox } from "./search-box";
import { CourseCard, type CourseCardData } from "@/components/shared/course-card";
import { TeacherCard, type TeacherCardData } from "@/components/shared/teacher-card";
import { LiveClassCard, type LiveClassCardData } from "@/components/shared/live-class-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search",
  description: "Search courses, teachers and live classes on LearnHub.",
};

const PAGE_SIZE = 12;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = searchQuerySchema.parse({
    q: typeof raw.q === "string" ? raw.q : "",
    type: typeof raw.type === "string" ? raw.type : "courses",
    category: typeof raw.category === "string" ? raw.category : undefined,
    priceMin: typeof raw.priceMin === "string" ? raw.priceMin : undefined,
    priceMax: typeof raw.priceMax === "string" ? raw.priceMax : undefined,
    ratingMin: typeof raw.ratingMin === "string" ? raw.ratingMin : undefined,
    difficulty: typeof raw.difficulty === "string" ? raw.difficulty : undefined,
    language: typeof raw.language === "string" ? raw.language : undefined,
    sort: typeof raw.sort === "string" ? raw.sort : "popular",
    page: typeof raw.page === "string" ? raw.page : 1,
  });

  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" } });
  const languages = ["English", "বাংলা"];

  let total = 0;
  let courses: CourseCardData[] = [];
  let teachers: TeacherCardData[] = [];
  let liveCards: LiveClassCardData[] = [];

  if (params.type === "courses") {
    const where: Prisma.CourseWhereInput = {
      status: "PUBLISHED",
      ...(params.q
        ? {
            OR: [
              { title: { contains: params.q } },
              { subtitle: { contains: params.q } },
              { description: { contains: params.q } },
            ],
          }
        : {}),
      ...(params.category ? { categoryId: params.category } : {}),
      ...(params.priceMin !== undefined || params.priceMax !== undefined
        ? {
            price: {
              ...(params.priceMin !== undefined ? { gte: params.priceMin } : {}),
              ...(params.priceMax !== undefined ? { lte: params.priceMax } : {}),
            },
          }
        : {}),
      ...(params.ratingMin !== undefined ? { avgRating: { gte: params.ratingMin } } : {}),
      ...(params.difficulty ? { difficulty: params.difficulty } : {}),
      ...(params.language ? { language: params.language } : {}),
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput = {
      popular: { enrollmentCount: "desc" },
      newest: { publishedAt: "desc" },
      rating: { avgRating: "desc" },
      priceAsc: { price: "asc" },
      priceDesc: { price: "desc" },
    }[params.sort] as Prisma.CourseOrderByWithRelationInput;

    const [rows, count] = await Promise.all([
      db.course.findMany({
        where,
        include: { teacher: true, category: true },
        orderBy,
        skip: (params.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.course.count({ where }),
    ]);
    total = count;
    courses = rows.map((c) => ({
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
  } else if (params.type === "teachers") {
    const where: Prisma.UserWhereInput = {
      role: "TEACHER",
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q } },
              { teacherProfile: { headline: { contains: params.q } } },
              { teacherSkills: { some: { name: { contains: params.q } } } },
            ],
          }
        : {}),
      ...(params.priceMin !== undefined || params.priceMax !== undefined
        ? {
            teacherProfile: {
              hourlyRate: {
                ...(params.priceMin !== undefined ? { gte: params.priceMin } : {}),
                ...(params.priceMax !== undefined ? { lte: params.priceMax } : {}),
              },
            },
          }
        : {}),
    };

    const ratingAgg = await db.review.groupBy({
      by: ["teacherId"],
      where: { targetType: "TEACHER", status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    });
    const ratingByTeacher = new Map(
      ratingAgg.map((r) => [r.teacherId, { avg: r._avg.rating ?? 0, count: r._count }]),
    );

    const rows = await db.user.findMany({
      where,
      include: { teacherProfile: true, teacherSkills: true },
      take: PAGE_SIZE * 5,
    });
    const [countRows] = await Promise.all([db.user.count({ where })]);
    total = countRows;

    let mapped = rows.map((t) => {
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
    if (params.ratingMin !== undefined) {
      mapped = mapped.filter((t) => t.avgRating >= params.ratingMin!);
    }
    if (params.sort === "rating") {
      mapped.sort((a, b) => b.avgRating - a.avgRating);
    } else if (params.sort === "priceAsc") {
      mapped.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (params.sort === "priceDesc") {
      mapped.sort((a, b) => b.hourlyRate - a.hourlyRate);
    }
    teachers = mapped.slice((params.page - 1) * PAGE_SIZE, params.page * PAGE_SIZE);
  } else {
    const where: Prisma.LiveClassWhereInput = {
      status: { in: ["SCHEDULED", "LIVE"] },
      startsAt: { gte: new Date() },
      ...(params.q ? { title: { contains: params.q } } : {}),
    };
    const [rows, count] = await Promise.all([
      db.liveClass.findMany({
        where,
        include: { teacher: true },
        orderBy: { startsAt: "asc" },
        skip: (params.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.liveClass.count({ where }),
    ]);
    total = count;
    liveCards = rows.map((l) => ({
      id: l.id,
      title: l.title,
      startsAt: l.startsAt.toISOString(),
      endsAt: l.endsAt.toISOString(),
      status: l.status,
      teacherName: l.teacher.name,
      teacherAvatarUrl: l.teacher.avatarUrl,
      durationSeconds: l.durationMinutes * 60,
    }));
  }

  // Popular searches for the autocomplete.
  const popular = (await db.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { enrollmentCount: "desc" },
    take: 4,
    select: { title: true },
  })).map((c) => c.title);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const makeUrl = (overrides: Record<string, string | number | undefined>) => {
    const merged = { q: params.q || undefined, type: params.type, category: params.category, priceMin: params.priceMin, priceMax: params.priceMax, ratingMin: params.ratingMin, difficulty: params.difficulty, language: params.language, sort: params.sort, page: 1, ...overrides };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
    return `/search?${sp.toString()}`;
  };

  const TABS = [
    { value: "courses", label: `Courses` },
    { value: "teachers", label: "Teachers" },
    { value: "live", label: "Live Classes" },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="mb-4 text-center font-display text-3xl font-extrabold text-foreground">
          What do you want to learn?
        </h1>
        <SearchBox initialQuery={params.q} popular={popular} />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex justify-center gap-1">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={makeUrl({ type: t.value })}
            aria-current={params.type === t.value ? "page" : undefined}
            className={cn(
              "rounded-full px-5 py-2 text-[13px] font-bold transition-colors",
              params.type === t.value
                ? "bg-brand text-white"
                : "text-muted-fg hover:bg-card-2 hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside aria-label="Filters">
          <form method="GET" className="space-y-4 rounded-2xl border border-line bg-card p-5 shadow-soft">
            <input type="hidden" name="q" value={params.q ?? ""} />
            <input type="hidden" name="type" value={params.type} />
            <p className="text-xs font-extrabold uppercase tracking-wide text-faint-fg">Filters</p>

            {params.type !== "live" && (
              <label className="block space-y-1.5">
                <span className="text-[12px] font-bold text-muted-fg">Category</span>
                <select
                  name="category"
                  defaultValue={params.category ?? ""}
                  className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-muted-fg">Min ৳</span>
                <input
                  name="priceMin"
                  type="number"
                  min={0}
                  defaultValue={params.priceMin ?? ""}
                  className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[12px] font-bold text-muted-fg">Max ৳</span>
                <input
                  name="priceMax"
                  type="number"
                  min={0}
                  defaultValue={params.priceMax ?? ""}
                  className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-bold text-muted-fg">Minimum rating</span>
              <select
                name="ratingMin"
                defaultValue={params.ratingMin ?? ""}
                className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
              >
                <option value="">Any rating</option>
                {[4.5, 4, 3.5, 3].map((r) => (
                  <option key={r} value={r}>
                    {r}+ stars
                  </option>
                ))}
              </select>
            </label>

            {params.type === "courses" && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-bold text-muted-fg">Difficulty</span>
                  <select
                    name="difficulty"
                    defaultValue={params.difficulty ?? ""}
                    className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
                  >
                    <option value="">All levels</option>
                    {["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"].map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[12px] font-bold text-muted-fg">Language</span>
                  <select
                    name="language"
                    defaultValue={params.language ?? ""}
                    className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
                  >
                    <option value="">Any language</option>
                    {languages.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="block space-y-1.5">
              <span className="text-[12px] font-bold text-muted-fg">Sort by</span>
              <select
                name="sort"
                defaultValue={params.sort}
                className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[13px] focus:border-brand focus:outline-none"
              >
                <option value="popular">Most popular</option>
                <option value="newest">Newest</option>
                <option value="rating">Highest rated</option>
                <option value="priceAsc">Price: low to high</option>
                <option value="priceDesc">Price: high to low</option>
              </select>
            </label>

            <button
              type="submit"
              className="h-10 w-full rounded-xl bg-brand text-[13px] font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Apply filters
            </button>
            <Link
              href={`/search?type=${params.type}`}
              className="block text-center text-[12px] font-bold text-faint-fg hover:text-foreground"
            >
              Clear all
            </Link>
          </form>
        </aside>

        {/* Results */}
        <div className="space-y-5">
          <p className="text-[13px] text-muted-fg">
            <strong className="text-foreground">{total}</strong> result{total === 1 ? "" : "s"}
            {params.q && (
              <>
                {" "}for “<strong className="text-foreground">{params.q}</strong>”
              </>
            )}
          </p>

          {total === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title="Nothing matched"
              description="Try different keywords or loosen the filters."
            />
          ) : params.type === "courses" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} href={`/courses/${c.slug}`} />
              ))}
            </div>
          ) : params.type === "teachers" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {teachers.map((t) => (
                <TeacherCard key={t.id} teacher={t} href={`/teachers/${t.id}`} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {liveCards.map((l) => (
                <LiveClassCard key={l.id} liveClass={l} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
              {params.page > 1 && (
                <Link
                  href={makeUrl({ page: params.page - 1 })}
                  className="rounded-xl border border-line bg-card px-4 py-2 text-[13px] font-bold text-muted-fg transition-colors hover:text-foreground"
                >
                  ← Prev
                </Link>
              )}
              <span className="px-3 text-[13px] font-bold text-muted-fg">
                Page {params.page} of {totalPages}
              </span>
              {params.page < totalPages && (
                <Link
                  href={makeUrl({ page: params.page + 1 })}
                  className="rounded-xl border border-line bg-card px-4 py-2 text-[13px] font-bold text-muted-fg transition-colors hover:text-foreground"
                >
                  Next →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
