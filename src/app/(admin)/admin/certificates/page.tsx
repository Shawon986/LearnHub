import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Award } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Certificates" };

export default async function AdminCertificatesPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/certificates");

  const certificates = await db.certificate.findMany({
    include: {
      student: { select: { name: true, avatarUrl: true } },
      course: { select: { title: true } },
    },
    orderBy: { issuedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Certificates</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {certificates.length} issued. Every certificate has a public verification page.
        </p>
      </div>

      {certificates.length === 0 ? (
        <EmptyState icon={<Award />} title="No certificates yet" description="Certificates are issued when students complete courses." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-150 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Number</th>
                <th className="hidden px-4 py-3 md:table-cell">Issued</th>
                <th className="px-4 py-3 text-right">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {certificates.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.student.name} src={c.student.avatarUrl} size="sm" />
                      <span className="text-[13px] font-bold text-foreground">{c.student.name}</span>
                    </div>
                  </td>
                  <td className="max-w-56 px-4 py-3.5">
                    <span className="block truncate text-[12px] text-muted-fg">{c.course.title}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[12px] font-bold text-foreground">{c.certificateNumber}</span>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {formatDate(c.issuedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/verify/${c.certificateNumber}`}
                      target="_blank"
                      className="text-[12px] font-bold text-brand-fg hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
