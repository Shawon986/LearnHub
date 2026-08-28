# Authentication & Authorization

## Sessions

- Stateless JWT (HS256, `jose`) in an **httpOnly, SameSite=Lax cookie**
  (`session`), 7-day expiry, `Secure` in production.
- Payload: `sub` (user id), `role`, `name`, `email`. Signed with
  `AUTH_SECRET` (32+ bytes — see `.env.example`).
- `src/lib/auth/session.ts`:
  - `getSession()` — cookie → verified payload
  - `getCurrentUser()` — fresh DB row (role/status changes take effect
    immediately; non-ACTIVE users are treated as signed out)
  - `requireUser()` / `requireRole()` / `requireAdmin()` — throw 401/403
  - `redirectIfUnauthorized()` — redirect helper for layouts
  - `assertSessionRole()` — guard for shared code

## Defense in depth

1. `src/proxy.ts` (Next 16 proxy) — cheap JWT + role gate at the edge,
   plus security headers on every response.
2. Every protected layout re-checks the DB user.
3. Every privileged action re-checks roles server-side (server actions
   and route handlers alike) — the browser is never trusted.

## Roles

`STUDENT · TEACHER · ADMIN · MODERATOR · SUPPORT · SUPER_ADMIN`
- Admin areas: any admin role; destructive/platform decisions: ADMIN/SUPER_ADMIN;
  changes to admin accounts: SUPER_ADMIN only.

## Flows

- Register (student/teacher) → email verification (single-use token, 24h) →
  activate. Password reset via single-use token (1h).
- Passwords: bcrypt cost 12. Login: uniform errors (no account enumeration),
  rate-limited per IP and per email.
- CSRF: SameSite=Lax + JSON-only mutations; a token layer is noted as a
  production hardening option in `docs/security.md`.

## Verified by tests

`src/lib/auth/session.test.ts` covers role routing (student→admin blocked,
teacher→student blocked, admin→teacher allowed, anonymous→login).
