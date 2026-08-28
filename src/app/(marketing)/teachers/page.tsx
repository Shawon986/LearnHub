import type { Metadata } from "next";
import { Search, Users } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { TeacherCard, type TeacherCardData } from "@/components/shared/teacher-card";

export const metadata: Metadata = {
  title: "Find Teachers",
  description: "Browse verified teachers on LearnHub — filter by skill, rating and rate.",
};

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [teachers, ratingAgg] = await Promise.all([
    db.user.findMany({
      where: {
        role: "TEACHER",
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { teacherProfile: { headline: { contains: q } } },
                { teacherSkills: { some: { name: { contains: q } } } },
              ],
            }
          : {}),
      },
      include: { teacherProfile: true, teacherSkills: true },
      take: 60,
    }),
    db.review.groupBy({
      by: ["teacherId"],
      where: { targetType: "TEACHER", status: "PUBLISHED" },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

  const ratingByTeacher = new Map(
    ratingAgg.map((r) => [r.teacherId, { avg: r._avg.rating ?? 0, count: r._count }]),
  );

  const cards: TeacherCardData[] = teachers.map((t) => {
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Find your teacher</h1>
          <p className="mt-1 text-[15px] text-muted-fg">
            {teachers.length} teacher{teachers.length === 1 ? "" : "s"} ready to help you grow.
          </p>
        </div>
        <form method="GET" className="flex max-w-lg gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name, skill or headline…"
              className="h-11 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-sm shadow-soft placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Search
          </button>
        </form>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No teachers found"
          description="Try a different name or skill."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((t) => (
            <TeacherCard key={t.id} teacher={t} href={`/teachers/${t.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
