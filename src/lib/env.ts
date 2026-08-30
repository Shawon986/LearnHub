import { z } from "zod";

// Validate environment at first use so a missing variable fails
// loudly with a clear message instead of breaking at runtime.

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  EMAIL_PROVIDER: z.string().default("console"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  VIDEO_PROVIDER: z.string().default("local"),
  VIDEO_LOCAL_DIR: z.string().default("./uploads"),
  AI_PROVIDER: z.string().default("dev"),
  PAYMENT_PROVIDERS: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();

/** Returns the comma-separated PAYMENT_PROVIDERS as a set.
 *  Production NEVER defaults to the DEV sandbox: an unset list means no
 *  provider is enabled (payments stay PENDING until real gateways are
 *  configured). Local development keeps the DEV sandbox. */
export function enabledPaymentProviders(): string[] {
  const raw = process.env.PAYMENT_PROVIDERS;
  if (!raw) return process.env.NODE_ENV === "production" ? [] : ["DEV"];
  return raw
    .split(",")
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

/** Optional payment credentials, read lazily (only when that provider is used). */
export function paymentCredentials(provider: string) {
  switch (provider.toUpperCase()) {
    case "BKASH":
      return {
        appKey: process.env.BKASH_APP_KEY,
        appSecret: process.env.BKASH_APP_SECRET,
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
        baseUrl:
          process.env.BKASH_BASE_URL ?? "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
      };
    case "NAGAD":
      return {
        merchantId: process.env.NAGAD_MERCHANT_ID,
        publicKey: process.env.NAGAD_PUBLIC_KEY,
        privateKey: process.env.NAGAD_PRIVATE_KEY,
        baseUrl: process.env.NAGAD_BASE_URL,
      };
    case "ROCKET":
      return {
        userId: process.env.ROCKET_USER_ID,
        password: process.env.ROCKET_PASSWORD,
        baseUrl: process.env.ROCKET_BASE_URL,
      };
    case "STRIPE":
      return {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      };
    default:
      return {};
  }
}
