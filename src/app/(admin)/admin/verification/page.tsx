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
      teacher: { include: { teacherProfile: true, teacherEducation: true, teacherExperience: true } },
    },
    orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
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

                    {/* Documents */}
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {docs.map((d, i) => (
                        <li
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card-2 px-2.5 py-1.5 text-[11px] font-semibold text-muted-fg"
                        >
                          <FileText className="h-3 w-3" />
                          {d.title}
                        </li>
                      ))}
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
