import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BadgeCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/certificates");

  const certificates = await db.certificate.findMany({
    where: { studentId: user.id },
    include: { course: { select: { title: true, teacher: { select: { name: true } } } } },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Certificates</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Complete a course to earn its certificate. Public verification arrives in Phase 10.
        </p>
      </div>

      {certificates.length === 0 ? (
        <EmptyState
          icon={<Award />}
          title="No certificates yet"
          description="Finish 100% of a course and its certificate will be issued automatically."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {certificates.map((c) => (
            <Card key={c.id} hoverable className="relative overflow-hidden p-6">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-soft"
                aria-hidden
              />
              <div className="relative flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                  <Award className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-[15px] font-extrabold leading-snug text-foreground">
                    {c.course.title}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-muted-fg">
                    Instructor: {c.course.teacher.name}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="gold">
                      <BadgeCheck className="h-3 w-3" />
                      {c.certificateNumber}
                    </Badge>
                    <span className="text-[11px] text-faint-fg">Issued {formatDate(c.issuedAt)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/verify/${c.certificateNumber}`}
                      target="_blank"
                      className="rounded-lg bg-brand-soft px-3 py-1.5 text-[12px] font-bold text-brand-fg transition-colors hover:bg-brand-soft/70"
                    >
                      View & verify ↗
                    </Link>
                    <Link
                      href={`/verify/${c.certificateNumber}`}
                      target="_blank"
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
                    >
                      Public link ↗
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
