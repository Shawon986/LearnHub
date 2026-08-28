# Security

## Headers (src/proxy.ts, every response)

`X-Content-Type-Options: nosniff` · `X-Frame-Options: DENY` ·
`Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy: camera=(self), microphone=(self), geolocation=()`

## Authentication & sessions

See `docs/authentication.md` — bcrypt-12, JWT httpOnly cookies,
defense-in-depth role checks, uniform anti-enumeration errors, rate
limiting on auth endpoints (per IP and per email).

## Payments

- The frontend can never mark a payment complete — only gateway-verified
  events act (signed webhooks; Stripe uses timing-safe HMAC).
- Idempotent completion, amount-mismatch rejection, atomic refunds.
- Sandbox (DEV) payments are operator-gated via `PAYMENT_PROVIDERS` and
  always recorded with `provider=DEV`.

## Uploads & files

- Extension + MIME whitelists, 500 MB (video) / 5 MB (images) caps.
- All files served through authorized routes; path traversal blocked by
  root-prefix checks; video access re-verified at the byte level.

## Data

- Parameterized Prisma queries (SQL-injection-safe), Zod validation at
  every boundary, centralized error handling that never leaks stack
  traces, audit logging for every sensitive action.

## Known production hardening (documented, not yet applied)

- CSRF token layer for cookie-auth mutations (currently: SameSite=Lax +
  JSON-only mutations).
- Redis-backed rate limiting for multi-instance deployments.
- CSP header — deferred because JSON-LD + inline styles need nonce
  plumbing; plan before enabling.

## Secrets

All credentials via env (`.env.example` documents every variable). A
scan for hardcoded keys (AWS/GitHub/Stripe patterns) comes back clean.
