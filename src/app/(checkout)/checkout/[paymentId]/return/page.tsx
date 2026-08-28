import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { handlePaymentFailure, handlePaymentSuccess } from "@/lib/payments/engine";

export const metadata: Metadata = { title: "Confirming payment…" };

// Gateway return URL — ALWAYS re-verifies against the gateway before
// acting (the browser is never trusted).
export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ provider?: string }>;
}) {
  const { paymentId } = await params;
  const { provider } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/${paymentId}/return`);

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: user.id },
  });
  if (!payment) notFound();
  if (payment.status === "COMPLETED") redirect(`/checkout/success?payment=${payment.id}`);
  if (!provider) redirect(`/checkout/${payment.id}`);

  try {
    const gateway = getPaymentProvider(provider);
    const event = await gateway.verifyReturn({
      providerPaymentId: payment.providerPaymentId ?? payment.id,
    });
    if (event.status === "FAILED") {
      await handlePaymentFailure(payment.id, event);
      redirect(`/checkout/${payment.id}?failed=1`);
    }
    const result = await handlePaymentSuccess(payment.id, event);
    if (!result.ok) redirect(`/checkout/${payment.id}?failed=1`);
    redirect(`/checkout/success?payment=${payment.id}`);
  } catch (e) {
    console.error("[payments] return verification failed:", e);
    // Never mark paid on an unverifiable return — let the webhook settle it.
    redirect(`/checkout/${payment.id}?pending=1`);
  }
}
