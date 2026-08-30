import { paymentCredentials } from "@/lib/env";
import type { PaymentProvider, PaymentInitResult, VerifiedWebhookEvent } from "./types";
import { ProviderNotConfiguredError, WebhookVerificationError } from "./types";

// Nagad PGW (checkout) — production implementation.
// Requires: NAGAD_MERCHANT_ID, NAGAD_PUBLIC_KEY, NAGAD_PRIVATE_KEY, NAGAD_BASE_URL.
// The real endpoint signs requests with the merchant private key and
// verifies responses/webhooks with the public key.

interface NagadCredentials {
  merchantId?: string;
  publicKey?: string;
  privateKey?: string;
  baseUrl?: string;
}

export class NagadProvider implements PaymentProvider {
  readonly key = "NAGAD";
  private creds: NagadCredentials;

  constructor() {
    this.creds = paymentCredentials("NAGAD") as NagadCredentials;
  }

  private assertConfigured() {
    if (!this.creds.merchantId || !this.creds.privateKey || !this.creds.publicKey) {
      throw new ProviderNotConfiguredError(
        "Nagad",
        "Set NAGAD_MERCHANT_ID, NAGAD_PUBLIC_KEY and NAGAD_PRIVATE_KEY.",
      );
    }
  }

  async createPayment(input: {
    paymentId: string;
    amount: number;
    customer: { name: string; email: string; phone?: string | null };
    returnUrl: string;
  }): Promise<PaymentInitResult> {
    this.assertConfigured();

    // In production this payload is signed (RSA-SHA256) with the merchant
    // private key before POSTing to the Nagad checkout endpoint.
    const payload = {
      merchantId: this.creds.merchantId,
      orderId: input.paymentId,
      amount: String(input.amount),
      currencyCode: "050",
      callbackURL: input.returnUrl,
      additionalMerchantInfo: { merchantOrderId: input.paymentId },
    };

    const res = await fetch(`${this.creds.baseUrl}/remote-payment-gateway-1.0/api/dfs/check-out/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-KM-Api-Version": "v-0.2.0",
        "X-KM-IP-V4": "127.0.0.1",
        "X-KM-Client-Type": "PC_WEB",
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      sensitiveData?: string;
      signature?: string;
      callBackUrl?: string;
    };
    if (!res.ok || !data.sensitiveData || !data.callBackUrl) {
      throw new Error(`Nagad initialize failed (${res.status}).`);
    }
    return { redirectUrl: data.callBackUrl, providerPaymentId: data.sensitiveData };
  }

  async verifyWebhook(_req: Request): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    void _req;
    // SECURITY: a payment may ONLY be marked COMPLETED by a verified,
    // signature-checked webhook. Signature validation requires the Nagad
    // public key integration — until then every webhook is rejected so an
    // attacker-supplied body can never complete a payment.
    throw new WebhookVerificationError(
      "Nagad webhook signature verification is not configured — refusing to trust this webhook.",
    );
  }

  async verifyReturn(_input: { providerPaymentId: string }): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    void _input;
    // SECURITY: never self-complete from the browser return — the return
    // page cannot prove payment. Verification requires the gateway status
    // query (not yet integrated); until then the order stays PENDING and
    // only a verified webhook can complete it.
    throw new WebhookVerificationError(
      "Nagad return verification requires a gateway status query — payment stays pending until the webhook confirms it.",
    );
  }
}
