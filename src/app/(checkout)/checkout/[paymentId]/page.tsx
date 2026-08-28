import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BookOpen, CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT, formatDateTime } from "@/lib/format";
import { CheckoutClient } from "./checkout-client";
import { availablePaymentMethods } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${paymentId}`);

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: user.id },
    include: {
      course: { include: { teacher: { select: { name: true } } } },
      booking: { include: { teacher: { select: { name: true } } } },
    },
  });
  if (!payment) notFound();

  // Already paid → success screen.
  if (payment.status === "COMPLETED") {
    redirect(`/checkout/success?payment=${payment.id}`);
  }

  const title = payment.course?.title ?? `1-on-1 session with ${payment.booking?.teacher.name ?? "teacher"}`;
  const subtitle = payment.course
    ? `Course · by ${payment.course.teacher.name}`
    : `Tutoring · ${payment.booking?.durationMinutes ?? 60} minutes`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Checkout</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Order created {formatDateTime(payment.createdAt)} ·{" "}
          <Badge variant="gold" size="sm">
            {payment.status}
          </Badge>
        </p>
      </div>

      {/* Order summary */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
            {payment.course ? <BookOpen className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[15px] font-bold leading-snug text-foreground">{title}</h2>
            <p className="mt-0.5 text-[12px] text-muted-fg">{subtitle}</p>
            {payment.booking && (
              <p className="mt-1 text-[12px] text-faint-fg">
                {formatDateTime(payment.booking.startsAt)} · {payment.booking.topic ?? "No topic given"}
              </p>
            )}
          </div>
          <p className="font-display text-xl font-extrabold text-foreground">{formatBDT(payment.amount)}</p>
        </div>

        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-muted-fg">Subtotal</dt>
            <dd className="font-semibold text-foreground">{formatBDT(payment.amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-fg">Platform fee (student)</dt>
            <dd className="font-semibold text-foreground">৳0</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2">
            <dt className="font-bold text-foreground">Total</dt>
            <dd className="font-display text-lg font-extrabold text-foreground">{formatBDT(payment.amount)}</dd>
          </div>
        </dl>
      </Card>

      <CheckoutClient
        paymentId={payment.id}
        amount={payment.amount}
        methods={availablePaymentMethods()}
        status={payment.status}
      />
    </div>
  );
}
