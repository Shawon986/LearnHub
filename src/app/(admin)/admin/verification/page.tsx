import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { VerificationActions } from "./verification-actions";

export const metadata: Metadata = { title: "Teacher Verification" };

const STATUS_VARIANT: Record<string, "brand" | "accent" | "success" | "gold" | "danger" | "neutral"> = {
  PENDING: "brand",
  APPROVED: "success",
  REJECTED: "danger",
  CHANGES_REQUESTED: "gold",
  SUSPENDED: "neutral",
};

interface Doc {
  type: string;
  title: string;
  url?: string;
}

export default async function VerificationPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/verification");

  const applications = await db.teacherVerification.findMany({
    include: {
      teacher: {
        include: {
          teacherProfile: true,
          teacherEducation: true,
          teacherExperience: true,
          teacherSkills: true,
          teacherDocuments: { orderBy: { createdAt: "asc" } },
        },
      },
    },
    // Newest applications first — the queue never buries fresh requests.
    orderBy: { submittedAt: "desc" },
  });

  const pending = applications.filter((a) => a.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Teacher Verification</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {pending.length} application{pending.length === 1 ? "" : "s"} awaiting review.
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="No applications yet"
          description="Teachers submit verification documents from their dashboard."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const docs = safeJsonParse<Doc[]>(app.documents, []);
            return (
              <Card key={app.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={app.teacher.name} src={app.teacher.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-bold text-foreground">{app.teacher.name}</h2>
                      <Badge variant={STATUS_VARIANT[app.status] ?? "neutral"}>{app.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted-fg">
                      {app.teacher.teacherProfile?.headline ?? app.teacher.email}
                    </p>

                    {/* Full applicant details for review */}
                    <div className="mt-3 grid gap-3 rounded-xl border border-line bg-card-2/40 p-3.5 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">Contact</p>
                        <p className="truncate text-[12px] font-semibold text-foreground">
                          ✉️ {app.teacher.email}
                        </p>
                        <p className="truncate text-[12px] text-muted-fg">
                          📞 {app.teacher.phone ?? "No phone number"}
                        </p>
                        {app.teacher.teacherProfile?.location && (
                          <p className="truncate text-[12px] text-muted-fg">
                            📍 {app.teacher.teacherProfile.location}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">Skills</p>
                        <p className="text-[12px] leading-relaxed text-muted-fg">
                          {app.teacher.teacherSkills.length > 0
                            ? app.teacher.teacherSkills.map((s) => s.name).join(", ")
                            : "—"}
                        </p>
                      </div>
                      {app.teacher.teacherEducation.length > 0 && (
                        <div className="min-w-0 sm:col-span-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">Education</p>
                          <ul className="mt-0.5 space-y-1">
                            {app.teacher.teacherEducation.map((e) => (
                              <li key={e.id} className="text-[12px] text-muted-fg">
                                🎓 {e.degree}{e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""} — {e.institution}{" "}
                                ({e.startYear}–{e.endYear ?? "Present"})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {app.teacher.teacherExperience.length > 0 && (
                        <div className="min-w-0 sm:col-span-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">Experience</p>
                          <ul className="mt-0.5 space-y-1">
                            {app.teacher.teacherExperience.map((e) => (
                              <li key={e.id} className="text-[12px] text-muted-fg">
                                💼 {e.title} at {e.company} ({e.current ? "current" : e.startDate.toISOString().slice(0, 4)})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {app.teacher.bio && (
                        <div className="min-w-0 sm:col-span-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">Bio</p>
                          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-fg">{app.teacher.bio}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted-fg">
                      <Badge variant="neutral" size="sm">
                        {app.teacher.teacherEducation.length} education
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {app.teacher.teacherExperience.length} experience
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {docs.length} document{docs.length === 1 ? "" : "s"}
                      </Badge>
                      <span>Submitted {formatDate(app.submittedAt)}</span>
                    </div>

                    {/* Documents — clickable so the admin can review each file */}
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {docs.length === 0 && (
                        <li className="text-[12px] font-semibold text-faint-fg">
                          No documents submitted yet.
                        </li>
                      )}
                      {docs.map((d, i) => {
                        const docUrl = String(d.url).replace(/^\/+/, "");
                        // SECURITY: only internal upload paths may be linked
                        // (blocks javascript:/data: URLs in stored documents).
                        if (!/^[a-z0-9_\-]+\//i.test(docUrl)) return null;
                        return (
                        <li key={i}>
                          <a
                            href={`/api/uploads/${docUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11px] font-semibold text-muted-fg transition-colors hover:border-brand hover:text-brand-fg"
                          >
                            <FileText className="h-3 w-3" />
                            {d.title} ↗
                          </a>
                        </li>
                        );
                      })}
                    </ul>

                    {app.rejectionReason && (
                      <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[12px] text-danger">
                        {app.rejectionReason}
                      </p>
                    )}

                    {app.status === "PENDING" && (
                      <div className="mt-4">
                        <VerificationActions teacherId={app.teacherId} teacherName={app.teacher.name} />
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
