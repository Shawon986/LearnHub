import type { PaymentProvider, PaymentInitResult, VerifiedWebhookEvent } from "./types";

/**
 * Development sandbox provider.
 *
 * IMPORTANT: this provider never verifies anything from the network —
 * it exists to exercise the checkout flow locally. The simulated gateway
 * page (/checkout/[id]/dev-pay) only completes payments through the
 * engine when PAYMENT_PROVIDERS explicitly includes DEV, and the engine
 * still records them with provider="DEV" so they're auditable as sandbox
 * payments. Production deployments must configure real providers.
 */
export class DevProvider implements PaymentProvider {
  readonly key = "DEV";

  async createPayment(input: { paymentId: string; amount: number }): Promise<PaymentInitResult> {
    return { redirectUrl: `/checkout/${input.paymentId}/dev-pay` };
  }

  async verifyWebhook(): Promise<VerifiedWebhookEvent> {
    throw new Error("DEV provider has no webhooks.");
  }

  async verifyReturn(): Promise<VerifiedWebhookEvent> {
    throw new Error("DEV provider verifies via the sandbox page.");
  }
}
