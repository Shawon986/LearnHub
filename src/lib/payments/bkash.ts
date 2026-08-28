import { paymentCredentials } from "@/lib/env";
import type { PaymentProvider, PaymentInitResult, VerifiedWebhookEvent } from "./types";
import { ProviderNotConfiguredError, WebhookVerificationError } from "./types";

// bKash Tokenized Checkout (v1.2.0-beta) — production implementation.
// Requires: BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD,
// BKASH_BASE_URL (sandbox: https://tokenized.sandbox.bka.sh/v1.2.0-beta).
// Docs: https://developer.bka.sh/docs

interface BkashCredentials {
  appKey?: string;
  appSecret?: string;
  username?: string;
  password?: string;
  baseUrl?: string;
}

export class BkashProvider implements PaymentProvider {
  readonly key = "BKASH";
  private creds: BkashCredentials;

  constructor() {
    this.creds = paymentCredentials("BKASH") as BkashCredentials;
  }

  private assertConfigured() {
    if (!this.creds.appKey || !this.creds.appSecret || !this.creds.username || !this.creds.password) {
      throw new ProviderNotConfiguredError(
        "bKash",
        "Set BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME and BKASH_PASSWORD.",
      );
    }
  }

  private async grantToken(): Promise<string> {
    const res = await fetch(`${this.creds.baseUrl}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: this.creds.username!,
        password: this.creds.password!,
      },
      body: JSON.stringify({
        app_key: this.creds.appKey,
        app_secret: this.creds.appSecret,
      }),
    });
    const data = (await res.json()) as { id_token?: string; statusCode?: string };
    if (!res.ok || !data.id_token) {
      throw new Error(`bKash token grant failed (${res.status}).`);
    }
    return data.id_token;
  }

  async createPayment(input: {
    paymentId: string;
    amount: number;
    currency: string;
    description: string;
    customer: { name: string; email: string; phone?: string | null };
    returnUrl: string;
  }): Promise<PaymentInitResult> {
    this.assertConfigured();
    const token = await this.grantToken();

    const res = await fetch(`${this.creds.baseUrl}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": this.creds.appKey!,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: input.customer.phone ?? input.customer.email,
        callbackURL: input.returnUrl,
        amount: String(input.amount),
        currency: input.currency,
        intent: "sale",
        merchantInvoiceNumber: input.paymentId.slice(-14),
      }),
    });
    const data = (await res.json()) as { paymentID?: string; bkashURL?: string; statusCode?: string };
    if (!res.ok || !data.paymentID || !data.bkashURL) {
      throw new Error(`bKash create payment failed (${res.status}).`);
    }
    return { redirectUrl: data.bkashURL, providerPaymentId: data.paymentID };
  }

  /** Query payment status via the execute endpoint (used for webhooks). */
  private async queryStatus(paymentID: string, token: string): Promise<VerifiedWebhookEvent> {
    const res = await fetch(`${this.creds.baseUrl}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: token,
        "X-APP-Key": this.creds.appKey!,
      },
      body: JSON.stringify({ paymentID }),
    });
    const data = (await res.json()) as {
      paymentID?: string;
      trxID?: string;
      transactionStatus?: string;
      amount?: string;
    };
    return {
      providerPaymentId: data.paymentID ?? paymentID,
      trxId: data.trxID ?? null,
      amount: data.amount ? Number(data.amount) : null,
      status: data.transactionStatus === "Completed" ? "COMPLETED" : "FAILED",
    };
  }

  async verifyWebhook(req: Request): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    let payload: { paymentID?: string };
    try {
      payload = (await req.json()) as { paymentID?: string };
    } catch {
      throw new WebhookVerificationError("Invalid bKash webhook body.");
    }
    if (!payload.paymentID) throw new WebhookVerificationError("Missing paymentID.");
    const token = await this.grantToken();
    return this.queryStatus(payload.paymentID, token);
  }

  async verifyReturn(input: { providerPaymentId: string }): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    const token = await this.grantToken();
    return this.queryStatus(input.providerPaymentId, token);
  }
}
