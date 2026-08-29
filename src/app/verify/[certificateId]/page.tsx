import type { Metadata } from "next";
import QRCode from "qrcode";
import { Award, BadgeCheck, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { safeJsonParse } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Certificate Verification" };

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const certificate = await db.certificate.findUnique({
    where: { certificateNumber: certificateId },
    include: {
      student: { select: { name: true } },
      course: { select: { title: true, teacher: { select: { name: true } } } },
    },
  });

  if (!certificate) {
    return (
      <div className="bg-brand-surface flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-line bg-card p-8 text-center shadow-lift">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
            <CircleX className="h-8 w-8" />
          </div>
          <div>
            <h1 className="font-display text-xl font-extrabold text-foreground">Certificate not found</h1>
            <p className="mt-2 text-sm text-muted-fg">
              No certificate matches <strong className="font-mono">{certificateId}</strong>. Check the
              certificate number with the recipient.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const meta = safeJsonParse<{ courseTitle?: string; teacherName?: string; studentName?: string }>(
    certificate.metadata,
    {},
  );
  const verifyUrl = `${env.APP_URL}/verify/${certificate.certificateNumber}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 220, margin: 1, color: { dark: "#101223", light: "#ffffff" } });

  return (
    <div className="bg-brand-surface flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6">
        <Logo animated={false} size="md" />
      </div>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
        {/* Certificate header */}
        <div className="bg-gradient-to-r from-brand via-blue-700 to-accent p-8 text-center text-white">
          <Award className="mx-auto h-10 w-10" aria-hidden />
          <h1 className="mt-2 font-display text-2xl font-extrabold">Certificate of Completion</h1>
          <p className="mt-1 text-[13px] text-white/80">Verified by LearnHub</p>
        </div>

        <div className="grid gap-6 p-8 sm:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <p className="text-[12px] font-bold uppercase tracking-widest text-faint-fg">This certifies that</p>
            <p className="font-display text-xl font-extrabold text-foreground">
              {meta.studentName ?? certificate.student.name}
            </p>
            <p className="text-[13px] leading-relaxed text-muted-fg">
              has successfully completed the course
            </p>
            <p className="font-display text-lg font-bold text-foreground">
              {meta.courseTitle ?? certificate.course.title}
            </p>
            <p className="text-[13px] text-muted-fg">
              taught by {meta.teacherName ?? certificate.course.teacher.name}
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-[12px] text-muted-fg">
              <span>
                Certificate ID: <strong className="font-mono text-foreground">{certificate.certificateNumber}</strong>
              </span>
              <span>Issued {formatDate(certificate.issuedAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code for ${verifyUrl}`} className="h-55 w-55 rounded-xl border border-line bg-white p-2" />
            <p className="max-w-52 text-center text-[10px] leading-relaxed text-faint-fg">
              Scan to verify at {verifyUrl}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-1.5 rounded-full bg-success-soft px-4 py-2 text-[12px] font-bold text-success">
        <BadgeCheck className="h-4 w-4" /> This certificate is authentic
      </p>
    </div>
  );
}
