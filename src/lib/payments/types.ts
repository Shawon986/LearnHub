// Payment provider abstraction — every gateway implements this.
// Providers are selected by method (BKASH|NAGAD|ROCKET|STRIPE|DEV).
// The engine (src/lib/payments/engine.ts) is the ONLY place that
// mutates payment state, and it only acts on server-verified events.

export interface PaymentInitResult {
  /** Where the customer goes to pay. */
  redirectUrl: string;
  /** Gateway-side payment id, when the gateway issues one upfront. */
  providerPaymentId?: string | null;
}

export interface VerifiedWebhookEvent {
  /** Gateway payment id (must match what we stored, when issued upfront). */
  providerPaymentId?: string | null;
  /** Gateway transaction reference. */
  trxId?: string | null;
  /** Amount confirmed by the gateway (BDT, integer). */
  amount?: number | null;
  /** Gateway-reported outcome. */
  status: "COMPLETED" | "FAILED";
  /** Raw payload for audit metadata. */
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly key: string;
  /** Create a payment at the gateway; returns where to send the customer. */
  createPayment(input: {
    /** Our internal payment id (used in callback URLs / metadata). */
    paymentId: string;
    amount: number;
    currency: string;
    description: string;
    customer: { name: string; email: string; phone?: string | null };
    /** Where the gateway redirects after payment. */
    returnUrl: string;
  }): Promise<PaymentInitResult>;

  /**
   * Verify a webhook/callback and normalize it to VerifiedWebhookEvent.
   * Throws on invalid signatures — the caller returns 400.
   */
  verifyWebhook(req: Request): Promise<VerifiedWebhookEvent>;

  /** Best-effort status check for the return-URL path. */
  verifyReturn(input: { providerPaymentId: string }): Promise<VerifiedWebhookEvent>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: string, hint: string) {
    super(
      `${provider} is not configured. ${hint} See .env.example and docs/payments.md.`,
    );
    this.name = "ProviderNotConfiguredError";
  }
}

export class WebhookVerificationError extends Error {
  constructor(message = "Webhook signature verification failed.") {
    super(message);
    this.name = "WebhookVerificationError";
  }
}
