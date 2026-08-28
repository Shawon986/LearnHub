import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { devPaymentsEnabled } from "@/lib/payments/engine";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBDT } from "@/lib/format";
import { DevGateway } from "./dev-gateway";

export const metadata: Metadata = { title: "Sandbox Payment" };

export default async function DevPayPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${paymentId}/dev-pay`);

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: user.id },
  });
  if (!payment) notFound();
  if (payment.status === "COMPLETED") redirect(`/checkout/success?payment=${payment.id}`);
  if (payment.provider !== "DEV") notFound();
  if (!devPaymentsEnabled()) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="p-8 text-center">
          <h1 className="font-display text-lg font-bold text-foreground">
            Sandbox payments are disabled
          </h1>
          <p className="mt-2 text-[13px] text-muted-fg">
            The sandbox provider is disabled in this environment — configure real payment
            providers via PAYMENT_PROVIDERS (see docs/payments.md).
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 text-center">
        <Badge variant="gold" size="md">
          <FlaskConical className="h-3.5 w-3.5" /> Simulated gateway — no real money moves
        </Badge>
      </div>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-gold to-amber-600 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/75">Sandbox Gateway</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{formatBDT(payment.amount)}</p>
          <p className="text-[12px] text-white/80">Merchant: LearnHub (development)</p>
        </div>
        <div className="p-6">
          <DevGateway paymentId={payment.id} />
        </div>
      </Card>
    </div>
  );
}
