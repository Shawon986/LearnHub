# Production Verification Plan

Run through this checklist with **live sandbox credentials** before launch.
The DEV sandbox exercises the checkout flow, but only these tests prove the
real gateways work.

## 1. Payments (each provider)

Set `PAYMENT_PROVIDERS` to include the provider, add its credentials, then:

- [ ] Initiate a real course purchase → redirected to the gateway
- [ ] Complete the payment with sandbox money
- [ ] Webhook arrives (`/api/webhooks/<provider>`) → payment COMPLETED,
      enrollment created, commission captured, wallet credited
- [ ] Replay the same webhook → no double credit (check wallet balance)
- [ ] Cancel at the gateway → payment FAILED, no enrollment
- [ ] Refund a COMPLETED payment from the admin → wallet/enrollment reversed
- [ ] Wrong-amount webhook (if testable) → payment FAILED

### bKash specifics
- Sandbox: `BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta`
- Use the sandbox app key/secret; test mobile number + OTP + PIN from
  bKash's sandbox docs.

### Nagad specifics
- Set `NAGAD_BASE_URL` to the sandbox endpoint; verify the signed request
  format against Nagad's current PGW docs (signature scheme can drift
  between versions — regenerate the payload signing if the API rejects).

### Rocket specifics
- Sandbox credentials from DBBL; confirm the `createPayment` response
  shape (field names have changed across PGW versions).

### Stripe specifics
- Use test mode keys; simulate `checkout.session.completed` webhooks from
  the Stripe dashboard (or CLI) — the HMAC verification must accept them.

## 2. Video (Cloudflare Stream or Mux)

- [ ] Upload a real MP4 via the admin wizard → provider upload path works
- [ ] Watch the processing status transition → READY
- [ ] Play it via the signed-token player with seek (Range requests)
- [ ] Unenrolled user blocked on a course-linked recording

## 3. Live classroom (LiveKit)

- [ ] `LIVE_PROVIDER=livekit` + credentials → join room token mints
- [ ] Two browsers join the same class → audio/video flows
- [ ] Host mute/remove reflects in the SFU session

## 4. Email (Resend)

- [ ] Register a user with `EMAIL_PROVIDER=resend` → verification email
      arrives (check spam!)
- [ ] Enable payment-receipt emails in notification preferences → receipt
      arrives after a sandbox payment

## 5. Cron & reminders

- [ ] Set `CRON_SECRET`; hit `/api/cron/reminders` without the header → 401
- [ ] With the header → reminder sweep runs (dedupe via remindedAt)

## 6. Observability

- [ ] Vercel Observability (or your APM) attached to the project
- [ ] Error tracking configured (Sentry optional)
- [ ] Database: Neon PITR backups enabled (or your host's equivalent)
- [ ] Payment + auth failure alerts subscribed

## 7. Final go/no-go

- [ ] `npm run test` green · `npm run lint` clean · `npm run build` green
- [ ] `PAYMENT_PROVIDERS` excludes `DEV`
- [ ] No `.env` values are dev defaults (APP_URL, secrets, providers)
