import { createHmac, timingSafeEqual } from "crypto";
import { paymentCredentials } from "@/lib/env";
import type { PaymentProvider, PaymentInitResult, VerifiedWebhookEvent } from "./types";
import { ProviderNotConfiguredError, WebhookVerificationError } from "./types";

// Stripe (international cards) — REST implementation, no SDK dependency.
// Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY.

interface StripeCredentials {
  secretKey?: string;
  webhookSecret?: string;
}

export class StripeProvider implements PaymentProvider {
  readonly key = "STRIPE";
  private creds: StripeCredentials;

  constructor() {
    this.creds = paymentCredentials("STRIPE") as StripeCredentials;
  }

  private assertConfigured() {
    if (!this.creds.secretKey) {
      throw new ProviderNotConfiguredError("Stripe", "Set STRIPE_SECRET_KEY.");
    }
  }

  private async stripeApi(path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
    const form = new URLSearchParams(body).toString();
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.creds.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Stripe API error (${res.status}): ${String(data.error ?? "unknown")}`);
    }
    return data;
  }

  async createPayment(input: {
    paymentId: string;
    amount: number;
    description: string;
    customer: { name: string; email: string };
    returnUrl: string;
  }): Promise<PaymentInitResult> {
    this.assertConfigured();

    // BDT → Stripe needs a supported currency; convert to USD at a
    // documented static rate for now (production: use current FX or
    // currency_convert). Amount is integer BDT.
    const usdCents = Math.max(50, Math.round((input.amount / 110) * 100));

    const session = await this.stripeApi("checkout/sessions", {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(usdCents),
      "line_items[0][price_data][product_data][name]": input.description,
      customer_email: input.customer.email,
      "metadata[paymentId]": input.paymentId,
      success_url: `${input.returnUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.returnUrl.replace("/return", "/cancel"),
    });
    const url = session.url as string | undefined;
    if (!url) throw new Error("Stripe did not return a checkout URL.");
    return { redirectUrl: url, providerPaymentId: session.id as string };
  }

  /** Verify Stripe signature (t, v1 = HMAC-SHA256 of `${t}.${rawBody}`). */
  async verifyWebhook(req: Request): Promise<VerifiedWebhookEvent> {
    if (!this.creds.webhookSecret) {
      throw new ProviderNotConfiguredError("Stripe", "Set STRIPE_WEBHOOK_SECRET.");
    }
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new WebhookVerificationError("Missing stripe-signature.");

    const raw = await req.text();
    const parts = signature.split(",").map((p) => p.trim());
    const t = parts.find((p) => p.startsWith("t="))?.slice(2);
    const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
    if (!t || !v1) throw new WebhookVerificationError("Malformed signature header.");

    const expected = createHmac("sha256", this.creds.webhookSecret).update(`${t}.${raw}`).digest("hex");
    const provided = Buffer.from(v1, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
      throw new WebhookVerificationError("Signature mismatch.");
    }

    const event = JSON.parse(raw) as {
      type?: string;
      data?: { object?: { id?: string; payment_intent?: string; amount_total?: number } };
    };
    if (event.type !== "checkout.session.completed") {
      // Ignore non-completion events.
      return { status: "COMPLETED", providerPaymentId: null, amount: null, raw: { event: event.type } };
    }
    const object = event.data?.object;
    return {
      providerPaymentId: (object?.payment_intent as string) ?? null,
      trxId: (object?.id as string) ?? null,
      amount: object?.amount_total ? Math.round(object.amount_total / 100) : null,
      status: "COMPLETED",
    };
  }

  async verifyReturn(input: { providerPaymentId: string }): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    const session = await this.stripeApi(`checkout/sessions/${input.providerPaymentId}`, {});
    const status = session.payment_status as string | undefined;
    return {
      providerPaymentId: input.providerPaymentId,
      trxId: (session.payment_intent as string) ?? null,
      status: status === "paid" ? "COMPLETED" : "FAILED",
    };
  }
}
