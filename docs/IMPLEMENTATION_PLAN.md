# LearnHub — Implementation Plan

Premium education marketplace for Bangladesh: live classes, recorded classes, 1-on-1 tutoring, courses, payments (bKash/Nagad/Rocket/Stripe), AI features.

> Status tracker: [`PROGRESS.md`](./PROGRESS.md) · Run instructions: [`../README.md`](../README.md)

---

## 1. Architecture

```
┌────────────────────────── Browser ──────────────────────────┐
│  Marketing site   Student dashboard   Teacher dashboard     │
│  Admin panel      Live classroom      Video player          │
└──────────────┬───────────────────────────────┬──────────────┘
               │ Next.js App Router            │
┌──────────────▼───────────────────────────────▼──────────────┐
│  Server Components (data fetching, SEO)                     │
│  Route Handlers /api/*  (REST, zod-validated, rate-limited) │
│  proxy.ts (edge auth gate + security headers)               │
├──────────────────────────────────────────────────────────────┤
│  src/lib — domain layer                                     │
│  auth · payments/ (provider abstraction) · video/ · ai/     │
│  realtime/ · email · notifications · audit · validation     │
├──────────────────────────────────────────────────────────────┤
│  Prisma ORM → SQLite (dev) / PostgreSQL (prod)              │
│  External providers: bKash · Nagad · Rocket · Stripe        │
│  Video: local (dev) → Cloudflare Stream / Mux / S3          │
│  AI: dev stub → OpenAI / Anthropic / AI Gateway             │
└──────────────────────────────────────────────────────────────┘
```

Monolith web app with clean module boundaries — appropriate for a marketplace of this size; every external dependency (payments, video, AI, email, realtime) sits behind a provider interface so it can be swapped or split into services later.

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router)**, React 19 | SEO-heavy marketplace + app in one codebase; RSC streaming |
| Language | TypeScript (strict) | Safety across 60+ entities |
| Database | **SQLite (dev) → PostgreSQL (prod)** via Prisma 6 | Zero-install local dev, one-line provider switch; real persistence, never mocked |
| Auth | **jose JWT** in httpOnly cookie + bcryptjs | Full control over 6 roles; no framework lock-in; docs/architecture: Lucia-recommended pattern |
| Styling | Tailwind CSS v4 + design tokens (light/dark) | Design-system speed without a CSS-in-JS runtime |
| Animation | **Motion** (Framer Motion) | Spring/stagger/scroll-reveal; Three.js/R3F later (Phase 13), lazy-loaded |
| Validation | Zod 4 | Shared schemas at every API boundary |
| Icons | lucide-react | Consistent, tree-shaken |
| Email | Provider abstraction (console dev / Resend prod) | No SDK lock-in |

## 3. Database architecture

- **63 models** covering: identity/profiles, catalog (courses→modules→lessons, quizzes, assignments), live classes, recorded classes + central `Video` asset, bookings/availability, messaging, reviews, payments/commissions/wallet/withdrawals, coupons/referrals, certificates/gamification, disputes, AI, notifications, audit, admin content.
- **Conventions**
  - "Enum" values are typed strings (`src/lib/constants.ts` is the source of truth); every API boundary validates with Zod. SQLite has no native enums — switching to Postgres native enums is optional.
  - **Money is integer BDT** (whole taka) — no float rounding bugs; commission math is integer math.
  - Every relation is explicit with `onDelete` semantics; hot query paths are indexed (`@@index`).
  - Nullable polymorphic-ish targets (Review/Resource/WishlistItem) validated in application code.
- Dev DB: `prisma/dev.db` (git-ignored). Production: PostgreSQL — see `docs/database.md` (Phase 2+ doc).

## 4. Authentication architecture

- **Stateless JWT (HS256, jose) in an httpOnly, SameSite=Lax cookie** (Secure in prod), 7-day expiry. Role embedded in the token.
- **Defense in depth**: `src/proxy.ts` does a cheap JWT+role gate at the edge; every layout re-checks via `getCurrentUser()` (fresh DB row — role/status changes take effect immediately); every privileged API route calls `requireUser()` / `requireRole()`.
- Roles: `STUDENT · TEACHER · ADMIN · MODERATOR · SUPPORT · SUPER_ADMIN`.
- Email verification + password reset via single-use hashed tokens (`AuthToken`, 24h/1h expiry).
- bcrypt cost 12; uniform login errors (no account enumeration); rate limiting per IP and per email; audit-logged.
- CSRF: SameSite=Lax + state-changing endpoints are JSON-only (no form posts); a CSRF token layer is planned for Phase 14.

## 5. API architecture

- Route Handlers under `/api/*`, all wrapped in `apiHandler()`: ApiError → clean JSON `{error:{code,message,details}}`; Zod errors → 400 with per-field details; unknown errors logged server-side, generic 500 to the client (never raw stack traces).
- `parseJson`/`parseQuery` helpers enforce Zod at the boundary.
- In-memory sliding-window rate limiter (`src/lib/rate-limit.ts`) — swap to Redis for multi-instance prod (identical API).
- Every sensitive action writes an `AuditLog` (actor from session, never from the client).

## 6. UI architecture

- **Design tokens** in `globals.css` (Tailwind v4 `@theme`): separate light/dark palettes, brand (violet) + accent (teal) + gold (achievements), semantic colors (`bg-card`, `border-line`, `text-muted-fg`…), shadows, keyframes. Glass utility, gradient text.
- **Component library** `src/components/ui/`: Button, Input, Textarea, Select, Label, Badge, Avatar, Card, Modal, Dropdown, Tabs, Tooltip, Toast, Skeleton (+ composite skeletons), Progress (bar/ring), Rating (display/input), EmptyState, StatCard, Spinner, CountUp, Reveal.
- Route groups: `(marketing)` / `(auth)` / `(dashboard)` / `(teacher)` / `(admin)` + `api`.
- Dashboard shell: config-driven nav (`src/lib/nav.ts`), collapsible sidebar (persisted), mobile drawer, per-role accent color. Nav items are resolved **client-side** so icon components never cross the server/client boundary.
- SEO-friendly URLs (`/courses/python-programming`) planned from Phase 3 onward; landing has full metadata.

## 7. Animation architecture

- Motion for: scroll reveals (`Reveal`/`RevealGroup`), stagger, springs, layout-animated tabs, modal/dropdown/toast transitions, count-up, hero parallax (mouse springs, pointer-fine devices only).
- Pure CSS keyframes for cheap ambient motion (float, shimmer, gradient-x).
- **All** motion respects `prefers-reduced-motion` (motion's `useReducedMotion` + global CSS kill-switch).
- 3D (Three.js/R3F) reserved for Phase 13 — lazy-loaded, low-poly, paused offscreen, disabled on mobile/low-power.

## 8. Payment architecture

```
Checkout → PaymentProvider (interface)
   ├─ BkashProvider   (tokenized checkout API)
   ├─ NagadProvider   (signed request API)
   ├─ RocketProvider  (PGW API)
   ├─ StripeProvider  (checkout + webhook)
   └─ DevProvider      (sandbox UI; NEVER marks real payments)
→ Webhook/redirect → server-side verify (signature/idempotency key)
→ Payment row (status PENDING→COMPLETED, providerPaymentId unique)
→ Transaction + Enrollment/Booking (idempotent: duplicate webhooks are no-ops)
→ Commission (rate from settings → teacher/course override)
→ TeacherWallet credit (pending→available) + notifications
```

- **Frontend payment status is never trusted** — only verified webhooks/callbacks update state.
- Commission is configurable globally/teacher/course (`PlatformSetting` + overrides, Phase 6).
- Refunds flow through the dispute system and mark Payment REFUNDED + reverse commission.

## 9. Video architecture

- Central `Video` asset row with status machine: `UPLOADING → QUEUED → PROCESSING → READY/FAILED` + progress/error fields. `RecordedClass` has its own lifecycle: `DRAFT → PROCESSING → READY → PUBLISHED/ARCHIVED`.
- **Provider abstraction** `src/lib/video/` (Phase 8): `VideoProvider` interface — `upload()`, `processingStatus()`, `playbackUrl(user, video)` returning **short-lived signed URLs**. Local disk + signed HMAC for dev; Cloudflare Stream / Mux / S3+CloudFront as drop-in implementations. Public permanent URLs are never exposed.
- Uploads are validated (size/MIME) and processed in background jobs — never inside HTTP requests.

## 10. Live-class architecture

- `LiveClass` + participants (attendance states), recording link to `Video`, materials, maxStudents, price.
- Classroom (Phase 7): video via a WebRTC provider abstraction (LiveKit/Zoom-style adapter — documented credential requirements), with local dev fallback; chat/whiteboard/polls via the realtime layer.
- Desktop layout: main video + side panel (chat/participants) + bottom controls; dedicated mobile layout.

## 11. Realtime architecture

- `src/lib/realtime/` abstraction (Phase 7/9): **SSE for notifications in Phase 9**, WebSocket channel (Socket.IO / platform WebSockets) for messaging + classroom. Dev falls back to polling/SSE; provider behind one interface.

## 12. AI architecture

- `src/lib/ai/` provider interface (`complete()`, `chat()`, `embed()`) with a **deterministic dev provider** (no API keys needed) and ready adapters for OpenAI / Anthropic / Vercel AI Gateway.
- Features (Phase 11): teacher matching, course recommendations, study assistant, quiz generator, teacher assistant — each a module consuming the provider interface.

## 13. Admin architecture

- Admin route group with its own shell (gold accent). Sections per nav config: users, verification queue, courses, recorded classes (**upload → processing → publish workflow**, Phase 8), payments, withdrawals, disputes, coupons, referrals, analytics, settings, audit logs.
- All admin mutations: `requireAdmin()` + audit log + (Phase 12) role-scoped permissions.

## 14. Security architecture

- See §4 (auth). Additionally: security headers in `proxy.ts` (nosniff, frame-deny, referrer, permissions-policy), bcrypt-12, rate limiting, Zod input validation at every boundary, parameterized Prisma queries (SQL-injection-safe), server-side authorization on every protected route, payment webhook signature verification + idempotency (Phase 6), short-lived signed video URLs (Phase 8), upload MIME/size validation, secrets only via env (`.env.example` documents all), audit logging.
- Full hardening pass + security tests in Phase 14.

## 15. Deployment architecture

- **Vercel-ready**: Next.js App Router + Fluid Compute defaults. Production: PostgreSQL (e.g. Neon/Vercel Marketplace), Resend for email, Cloudflare Stream or Mux for video, live payment credentials for bKash/Nagad/Rocket, AI provider key.
- Env vars documented in `.env.example`; per-environment secrets via `vercel env` (CLI recommended: `npm i -g vercel`).
- Background jobs (video processing, emails, certificates) run as queued jobs/endpoints (Phase 8+) — never in request handlers.

## 16. Development phases

| # | Phase | Contents | Status |
|---|---|---|---|
| 1 | Architecture, DB, Auth, Design system | Prisma schema (63 models), JWT auth + 6 roles, email verify/reset, rate limits, audit, design tokens, 25+ UI components, app shells, landing page | ✅ **DONE** |
| 2 | Profiles & dashboards | Full student/teacher/admin dashboards, profile editing, teacher profile page | ⬜ |
| 3 | Courses/LMS | Course creation, modules, lessons, quizzes, assignments, enrollment, progress | ⬜ |
| 4 | Discovery | Search, filters, teacher profiles, reviews, wishlist | ⬜ |
| 5 | Booking & tutoring | Availability, calendar, 1-on-1 bookings | ⬜ |
| 6 | Payments & wallet | bKash/Nagad/Rocket/Stripe abstraction, webhooks, commission, wallet, withdrawals | ⬜ |
| 7 | Live classes | Classroom UI, chat, whiteboard, polls, attendance, recording | ⬜ |
| 8 | Recorded classes | Admin upload flow, video processing, protected playback, custom player, progress | ⬜ |
| 9 | Messaging & notifications | Realtime chat, in-app/email/push notifications | ⬜ |
| 10 | Certificates, gamification, coupons, referrals, disputes | | ⬜ |
| 11 | AI features | Matching, recommendations, assistants, quiz generator | ⬜ |
| 12 | Analytics, SEO, reports, audit logs UI | | ⬜ |
| 13 | Advanced animation & 3D | Hero 3D scene, parallax polish, micro-interactions, page transitions | ⬜ |
| 14 | Security audit, performance, accessibility, testing | Unit/integration tests incl. video-access, webhook idempotency, commission, roles | ⬜ |
| 15 | Production deployment prep | Postgres migration, providers, CI, monitoring | ⬜ |

Each phase: build → lint → typecheck → build → run → verify → update `PROGRESS.md` before moving on.

## 17. Current state (after Phase 1)

- ✅ 63-model Prisma schema pushed + seeded (12 users, 10 categories, 10 courses, 6 live classes, 8 recorded classes, payments/wallet/bookings/reviews/coupons…)
- ✅ Auth: register (student/teacher) → email verify → login → role-gated areas; password reset; rate limiting; audit logs
- ✅ Design system + landing page (animated hero, sections, scroll reveals, dark mode)
- ✅ Student/Teacher/Admin shells + overview dashboards with live data
- ✅ Verified: lint clean, production build green, auth flow + role redirects smoke-tested
- Demo logins (password `Password123!`): `admin@example.com`, `student@example.com`, `ayesha@example.com` (teacher)
