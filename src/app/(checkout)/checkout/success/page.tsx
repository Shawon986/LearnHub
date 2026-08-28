import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuccessReveal } from "./success-reveal";
import { formatBDT, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Payment Successful" };

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment: paymentId } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!paymentId) redirect("/dashboard");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: user.id },
    include: { course: { select: { title: true, id: true, slug: true } }, booking: { select: { id: true, teacher: { select: { name: true } } } } },
  });
  if (!payment || payment.status !== "COMPLETED") notFound();

  const title = payment.course?.title ?? `1-on-1 session with ${payment.booking?.teacher.name ?? "your teacher"}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card className="p-8 text-center">
        <SuccessReveal>
          <CheckCircle2 className="h-16 w-16 text-success" />
        </SuccessReveal>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-foreground">
          Payment successful!
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-fg">
          {payment.purpose === "COURSE_PURCHASE"
            ? "You're enrolled — start learning right away."
            : "Your session is confirmed. See you there!"}
        </p>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-[15px] font-bold text-foreground">{title}</h2>
        <dl className="mt-4 space-y-2.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted-fg">Transaction ID</dt>
            <dd className="font-mono text-[12px] font-bold text-foreground">
              {payment.providerTrxId ?? payment.providerPaymentId ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">Amount</dt>
            <dd className="font-bold text-foreground">{formatBDT(payment.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">Method</dt>
            <dd className="font-bold text-foreground">{payment.method}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">Date</dt>
            <dd className="font-bold text-foreground">{formatDateTime(payment.paidAt ?? payment.createdAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">Status</dt>
            <dd>
              <Badge variant="success">COMPLETED</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        {payment.course && (
          <Link
            href={`/dashboard/courses/${payment.course.id}/learn`}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-[14px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            Continue learning <ArrowRight className="h-4 w-4" />
          </Link>
        )}
        <Link
          href="/dashboard"
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-line bg-card px-6 text-[14px] font-bold text-foreground transition-colors hover:bg-card-2"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
