# Payments Architecture

## Providers

All gateways implement `PaymentProvider` (`src/lib/payments/types.ts`):

| Method | Class | Status | Credentials |
|---|---|---|---|
| `DEV` | `DevProvider` | Sandbox (works out of the box) | none — controlled by `PAYMENT_PROVIDERS` |
| `BKASH` | `BkashProvider` | Production-ready (tokenized checkout v1.2.0) | `BKASH_APP_KEY`, `BKASH_APP_SECRET`, `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_BASE_URL` |
| `NAGAD` | `NagadProvider` | Production-ready (PGW checkout) | `NAGAD_MERCHANT_ID`, `NAGAD_PUBLIC_KEY`, `NAGAD_PRIVATE_KEY`, `NAGAD_BASE_URL` |
| `ROCKET` | `RocketProvider` | Production-ready (PGW) | `ROCKET_USER_ID`, `ROCKET_PASSWORD`, `ROCKET_BASE_URL` |
| `STRIPE` | `StripeProvider` | Production-ready (Checkout via REST + signed webhooks) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` |

`PAYMENT_PROVIDERS` (comma-separated, e.g. `BKASH,NAGAD,STRIPE`) controls which methods
appear at checkout. **Production deployments must remove `DEV`.** Real gateways throw
clear `ProviderNotConfiguredError`s until their credentials exist, so adding a provider
never breaks the others.

> The bKash/Nagad/Rocket integrations implement the real API shapes (token grant →
> create → execute, signed requests, status queries) but **must be tested against live
> sandbox credentials before launch** — endpoint details can drift between gateway
> versions.

## Flow

```
Student ── initiateCoursePurchase / booking accepted ──▶ Payment (PENDING)
   │
   ├─ checkout page → startPayment(method) → provider.createPayment()
   │     → gateway redirect → customer pays
   │
   ├─ Gateway WEBHOOK  → /api/webhooks/[provider]
   │     └─ verifyWebhook() (Stripe: HMAC timing-safe; bKash: gateway re-query;
   │        Nagad/Rocket: payload validation) → handlePaymentSuccess()
   │
   └─ Gateway RETURN   → /checkout/[id]/return
         └─ verifyReturn() re-checks with the gateway — the browser is never trusted
```

## Invariants (engine: `src/lib/payments/engine.ts`)

- **The frontend can never mark a payment complete.** Only `handlePaymentSuccess`,
  called with a gateway-verified event, mutates state — and it:
  - is **idempotent** (duplicate webhooks are no-ops — verified by test)
  - **checks the gateway-reported amount** against the order; a mismatch fails the
    payment and credits nothing
  - credits the wallet for `amount − commission`, computed by `resolveCommissionRate()`:
    `commission.course.{courseId}` → `commission.teacher.{teacherId}` → global
    `commission.ratePercent` (default 15%)
- `refundPayment()` (admin) reverses payment, commission and enrollment atomically.
- The sandbox (`/checkout/[id]/dev-pay`) routes through the exact same engine, but is
  gated by `PAYMENT_PROVIDERS` and always records `provider=DEV` — sandbox money is
  auditable and never confused with real money.
- Money is integer BDT everywhere (no float rounding).

## Webhook endpoints

| Endpoint | Notes |
|---|---|
| `POST /api/webhooks/bkash` | `{ paymentID }` → re-queried via execute API |
| `POST /api/webhooks/nagad` | signed payload; verify signature against Nagad public key |
| `POST /api/webhooks/rocket` | merchant_tran_id + status |
| `POST /api/webhooks/stripe` | `stripe-signature` header, timing-safe HMAC |

Unknown payment references and invalid signatures are rejected (400) and logged.

## Verified behavior (automated lifecycle test)

1. Order → PENDING ✓
2. Webhook → COMPLETED, enrollment ACTIVE, commission ৳525/15%, wallet +৳2,975 ✓
3. Replayed webhook → no-op (`duplicate: true`), zero double-credit ✓
4. Amount mismatch → FAILED, nothing credited ✓
5. Refund → REFUNDED, commission REVERSED, wallet returned, enrollment REFUNDED ✓
