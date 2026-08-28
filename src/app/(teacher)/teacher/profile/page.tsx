import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { TeacherProfileEditor } from "./teacher-profile-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Teacher Profile" };

export default async function TeacherProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/profile");

  const [profile, skills, education, experience, verification] = await Promise.all([
    db.teacherProfile.findUnique({ where: { userId: user.id } }),
    db.teacherSkill.findMany({ where: { teacherId: user.id }, orderBy: { name: "asc" } }),
    db.teacherEducation.findMany({ where: { teacherId: user.id } }),
    db.teacherExperience.findMany({ where: { teacherId: user.id } }),
    db.teacherVerification.findUnique({ where: { teacherId: user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Your Profile</h1>
          <p className="mt-1 text-sm text-muted-fg">
            This is what students see when they discover you.
          </p>
        </div>
        <Badge
          variant={profile?.verified ? "accent" : verification?.status === "PENDING" ? "gold" : "neutral"}
          size="md"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {profile?.verified
            ? "Verified"
            : verification?.status === "PENDING"
              ? "Verification pending"
              : verification?.status === "REJECTED"
                ? "Verification rejected"
                : verification?.status === "CHANGES_REQUESTED"
                  ? "Changes requested"
                  : "Not verified"}
        </Badge>
      </div>

      <TeacherProfileEditor
        initial={{
          name: user.name,
          email: user.email,
          headline: profile?.headline ?? "",
          about: profile?.about ?? "",
          hourlyRate: profile?.hourlyRate ?? 0,
          yearsExperience: profile?.yearsExperience ?? 0,
          languages: safeJsonParse<string[]>(profile?.languages, []),
          location: profile?.location ?? "",
          skills: skills.map((s) => ({ id: s.id, name: s.name, proficiency: s.proficiency })),
          education: education.map((e) => ({
            id: e.id,
            institution: e.institution,
            degree: e.degree,
            fieldOfStudy: e.fieldOfStudy ?? "",
            startYear: e.startYear,
            endYear: e.endYear ?? null,
          })),
          experience: experience.map((e) => ({
            id: e.id,
            title: e.title,
            company: e.company,
            startDate: e.startDate.toISOString().slice(0, 10),
            endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : "",
            current: e.current,
          })),
        }}
      />

      {verification && verification.status === "CHANGES_REQUESTED" && verification.rejectionReason && (
        <Card className="border-gold/40 bg-gold-soft/40">
          <CardContent className="p-4 text-[13px] text-foreground">
            <strong>Our review team asked for changes:</strong> {verification.rejectionReason}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
