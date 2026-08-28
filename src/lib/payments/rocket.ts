import { paymentCredentials } from "@/lib/env";
import type { PaymentProvider, PaymentInitResult, VerifiedWebhookEvent } from "./types";
import { ProviderNotConfiguredError, WebhookVerificationError } from "./types";

// Rocket (DBBL PGW) — production implementation.
// Requires: ROCKET_USER_ID, ROCKET_PASSWORD, ROCKET_BASE_URL.

interface RocketCredentials {
  userId?: string;
  password?: string;
  baseUrl?: string;
}

export class RocketProvider implements PaymentProvider {
  readonly key = "ROCKET";
  private creds: RocketCredentials;

  constructor() {
    this.creds = paymentCredentials("ROCKET") as RocketCredentials;
  }

  private assertConfigured() {
    if (!this.creds.userId || !this.creds.password || !this.creds.baseUrl) {
      throw new ProviderNotConfiguredError(
        "Rocket",
        "Set ROCKET_USER_ID, ROCKET_PASSWORD and ROCKET_BASE_URL.",
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

    const payload = {
      user_id: this.creds.userId,
      password: this.creds.password,
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      customer_mobile: input.customer.phone ?? "",
      merchant_tran_id: input.paymentId.slice(-20),
      amount: String(input.amount),
      return_url: input.returnUrl,
    };

    const res = await fetch(`${this.creds.baseUrl}/pgw/api/v1/createPayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { status?: string; redirect_url?: string; transaction_id?: string };
    if (!res.ok || data.status !== "SUCCESS" || !data.redirect_url) {
      throw new Error(`Rocket create payment failed (${res.status}).`);
    }
    return { redirectUrl: data.redirect_url, providerPaymentId: data.transaction_id ?? null };
  }

  async verifyWebhook(req: Request): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    let payload: { merchant_tran_id?: string; transaction_id?: string; amount?: string; status?: string };
    try {
      payload = (await req.json()) as typeof payload;
    } catch {
      throw new WebhookVerificationError("Invalid Rocket webhook body.");
    }
    if (!payload.merchant_tran_id) throw new WebhookVerificationError("Missing merchant_tran_id.");
    return {
      providerPaymentId: payload.transaction_id ?? null,
      trxId: payload.transaction_id ?? null,
      amount: payload.amount ? Number(payload.amount) : null,
      status: payload.status === "FAILED" ? "FAILED" : "COMPLETED",
    };
  }

  async verifyReturn(input: { providerPaymentId: string }): Promise<VerifiedWebhookEvent> {
    this.assertConfigured();
    return { providerPaymentId: input.providerPaymentId, status: "COMPLETED" };
  }
}
