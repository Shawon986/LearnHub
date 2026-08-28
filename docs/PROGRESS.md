# Progress Tracker

Phases follow `docs/IMPLEMENTATION_PLAN.md`. This file is the working checklist — updated after every phase.

## Phase status

| Phase | Name | Status | Verified |
|---|---|---|---|
| 1 | Architecture · Database · Auth · Design system | ✅ Complete | build ✅ lint ✅ smoke tests ✅ |
| 2 | Profiles & dashboards | ✅ Complete | build ✅ lint ✅ 31 pages smoke-tested ✅ |
| 3–15 | … | ⬜ Pending | — |

## Phase 1 — delivered

- [x] Next.js 16 + TS strict + Tailwind v4 scaffold
- [x] Prisma schema: 63 models, relations, indexes (SQLite dev / Postgres prod path)
- [x] Seed: 12 users (6 roles incl. SUPER_ADMIN), 10 categories, 10 courses, 6 live classes, 8 recorded classes, bookings, payments, commissions, wallet, withdrawals, coupons, referrals, reviews, certificates, achievements, conversations, announcements, audit
- [x] Auth: register (STUDENT/TEACHER), login, logout, email verification, resend, forgot/reset password
- [x] Sessions: JWT httpOnly cookie (jose), 7d expiry, role embedded + fresh DB re-check on privileged access
- [x] Edge gate: `src/proxy.ts` (Next 16 proxy) — auth redirects, role routing, security headers
- [x] Rate limiting (login/register/forgot/resend), audit logging, uniform API errors
- [x] Design tokens (light/dark), fonts, shadows, glass, keyframes
- [x] UI kit: Button, Input, Textarea, Select, Label, Badge, Avatar, Card, Modal, Dropdown, Tabs, Tooltip, Toast, Skeleton set, Progress bar/ring, Rating input/display, EmptyState, StatCard, Spinner, CountUp, Reveal
- [x] Layouts: marketing header/footer, student/teacher/admin shells (collapsible sidebar, mobile drawer, role accent)
- [x] Landing page: animated hero (parallax, floating cards, staggered headline), stats count-up, categories, courses, live, recorded, teachers, how-it-works, why, AI band, testimonials, pricing, FAQ, CTA
- [x] Dashboards: student (progress, continue learning, live classes, achievements, recommendations, teachers), teacher (stats, quick actions, schedule, activity), admin (platform stats, moderation queue, signups)
- [x] Verification: `npm run lint` clean · `npm run build` green · auth lifecycle smoke-tested (register→verify→login), role redirects, all three dashboards render

## Quality checklist — phase gate results

- [x] Authentication works · [x] Role authorization works · [x] No broken routes · [x] No hardcoded secrets
- [ ] (Remaining items in the final quality checklist are tied to later phases and will be checked at their phase gates.)

## Phase 2 — delivered

- [x] **Notifications**: service lib (prefs-aware), `/api/notifications` (list, mark read/all), bell dropdown with unread badge in every shell, full center page (student/teacher/admin)
- [x] **Student sections**: settings (profile edit, interests, password change, referral code copy), my courses w/ progress, live classes (register/leave with capacity checks), recorded library, bookings (cancel + notifications), wishlist (remove), payments + transactions history, certificates, my reviews, achievements (earned/locked), referrals (code, stats, invite list)
- [x] **Teacher sections**: profile editor (info, skills, education, experience — full CRUD), students list, courses (list + create draft), live classes (schedule + cancel with participant notifications), monthly calendar, availability (weekly slots + blocked dates), bookings (accept/decline + student notifications), reviews with rating distribution, earnings (wallet, withdrawal requests with min/fee, transaction history), settings
- [x] **Admin sections**: user management (search, role/status filters, suspend/ban/activate, role changes with SUPER_ADMIN-only rules — all audited), teacher verification queue (approve/reject/request-changes → badge + notification), categories CRUD, platform settings (commission, referral rewards, withdrawal min/fee, branding), announcements (broadcast notifications to audience)
- [x] **Server actions**: 30+ actions across student/teacher/admin with requireRole + zod + audit + revalidatePath
- [x] Verified: lint clean, build green (49 routes), all 31 dashboard pages render 200 under correct roles, notification API round-trip, role guards intact, zero server errors

## Known next steps (Phase 3 kickoff)

1. Course curriculum builder (modules → lessons → videos → quizzes CRUD), publish flow with admin review
2. Public course detail page (`/courses/[slug]`) with SEO metadata + enrollment (purchase unlocks with payments — Phase 6; free courses can enroll immediately)
3. Quiz engine (attempts, scoring, review) + assignments (submit, grade)
4. Lesson/progress tracking wiring (mark complete, course percent rollups)
5. `docs/` deep-dives as their subsystems land: database.md, authentication.md, payments.md, live-classes.md, recorded-classes.md, video-storage.md, security.md, deployment.md, environment-variables.md
