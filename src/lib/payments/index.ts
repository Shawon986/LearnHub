import { enabledPaymentProviders } from "@/lib/env";
import type { PaymentProvider } from "./types";
import { DevProvider } from "./dev";
import { BkashProvider } from "./bkash";
import { NagadProvider } from "./nagad";
import { RocketProvider } from "./rocket";
import { StripeProvider } from "./stripe";

const REGISTRY: Record<string, () => PaymentProvider> = {
  BKASH: () => new BkashProvider(),
  NAGAD: () => new NagadProvider(),
  ROCKET: () => new RocketProvider(),
  STRIPE: () => new StripeProvider(),
  DEV: () => new DevProvider(),
};

/** Providers enabled via PAYMENT_PROVIDERS env (defaults to DEV locally). */
export function availablePaymentMethods(): { key: string; label: string; dev: boolean }[] {
  const labels: Record<string, string> = {
    BKASH: "bKash",
    NAGAD: "Nagad",
    ROCKET: "Rocket",
    STRIPE: "Stripe (international cards)",
    DEV: "Sandbox (test payments)",
  };
  return enabledPaymentProviders()
    .filter((p) => REGISTRY[p])
    .map((p) => ({ key: p, label: labels[p] ?? p, dev: p === "DEV" }));
}

export function getPaymentProvider(method: string): PaymentProvider {
  const factory = REGISTRY[method.toUpperCase()];
  if (!factory) throw new Error(`Unknown payment method: ${method}`);
  return factory();
}
