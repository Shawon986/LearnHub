import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/students");

  const enrollments = await db.enrollment.findMany({
    where: { course: { teacherId: user.id }, status: { in: ["ACTIVE", "COMPLETED"] } },
    include: { student: true, course: { select: { title: true } } },
    orderBy: { purchasedAt: "desc" },
  });

  // Distinct students with their course list.
  const byStudent = new Map<string, { student: { id: string; name: string; email: string; avatarUrl: string | null; createdAt: Date }; courses: string[] }>();
  for (const e of enrollments) {
    const entry = byStudent.get(e.studentId) ?? {
      student: e.student,
      courses: [],
    };
    entry.courses.push(e.course.title);
    byStudent.set(e.studentId, entry);
  }
  const students = [...byStudent.values()];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Students</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {students.length} active student{students.length === 1 ? "" : "s"} across your courses.
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title="No students yet"
          description="Publish a course and enrollments will appear here."
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {students.map(({ student, courses }) => (
              <li key={student.id} className="flex items-center gap-4 px-5 py-4">
                <Avatar name={student.name} src={student.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-foreground">{student.name}</p>
                  <p className="truncate text-[11px] text-faint-fg">{student.email}</p>
                </div>
                <div className="hidden max-w-64 flex-wrap gap-1 sm:flex">
                  {courses.slice(0, 2).map((c) => (
                    <Badge key={c} variant="neutral" size="sm">
                      {c}
                    </Badge>
                  ))}
                  {courses.length > 2 && (
                    <Badge variant="neutral" size="sm">
                      +{courses.length - 2}
                    </Badge>
                  )}
                </div>
                <span className="hidden w-24 text-right text-[11px] text-faint-fg md:block">
                  Joined {formatDate(student.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
