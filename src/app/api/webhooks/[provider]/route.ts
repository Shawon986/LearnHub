import { apiHandler, json, badRequest } from "@/lib/api";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { handlePaymentFailure, handlePaymentSuccess } from "@/lib/payments/engine";
import { WebhookVerificationError } from "@/lib/payments/types";

// Gateway webhooks. Verification is provider-specific:
//  - Stripe: HMAC signature header (timing-safe)
//  - bKash: paymentID re-queried against the gateway API
//  - Nagad/Rocket: payload validation against merchant credentials
// Unknown payments and invalid signatures are rejected; duplicate
// events are idempotent no-ops in the engine.

export const POST = apiHandler(async (req, ctx) => {
  const { provider } = await ctx.params;

  if (provider.toUpperCase() === "DEV") {
    throw badRequest("The sandbox provider has no webhooks.");
  }

  const paymentProvider = getPaymentProvider(provider);
  let event;
  try {
    event = await paymentProvider.verifyWebhook(req);
  } catch (e) {
    if (e instanceof WebhookVerificationError) throw badRequest(e.message, "WEBHOOK_INVALID");
    throw e;
  }

  // Non-completion events (e.g. Stripe subscription noise) are acknowledged.
  if (!event.providerPaymentId) {
    return json({ ok: true, ignored: true });
  }

  // Resolve our order: by the gateway payment id we stored, or the trx id.
  const payment = await db.payment.findFirst({
    where: {
      OR: [
        { providerPaymentId: event.providerPaymentId },
        ...(event.trxId ? [{ providerTrxId: event.trxId }] : []),
      ],
    },
  });
  if (!payment) {
    console.error(
      `[webhooks] no order matches provider=${provider} providerPaymentId=${event.providerPaymentId}`,
    );
    throw badRequest("Unknown payment reference.", "WEBHOOK_UNKNOWN_PAYMENT");
  }

  if (event.status === "FAILED") {
    await handlePaymentFailure(payment.id, event);
  } else {
    const result = await handlePaymentSuccess(payment.id, event);
    if (!result.ok) {
      console.error(`[webhooks] completion failed for payment ${payment.id}`);
    }
  }
  return json({ ok: true });
});
