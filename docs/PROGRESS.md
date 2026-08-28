# Progress Tracker

Phases follow `docs/IMPLEMENTATION_PLAN.md`. This file is the working checklist — updated after every phase.

## Phase status

| Phase | Name | Status | Verified |
|---|---|---|---|
| 1 | Architecture · Database · Auth · Design system | ✅ Complete | build ✅ lint ✅ smoke tests ✅ |
| 2 | Profiles & dashboards | ✅ Complete | build ✅ lint ✅ 31 pages smoke-tested ✅ |
| 3 | Courses/LMS | ✅ Complete | build ✅ lint ✅ progress rollup tested ✅ |
| 4 | Discovery | ✅ Complete | build ✅ lint ✅ search/profile/reviews tested ✅ |
| 5 | Booking & tutoring | ✅ Complete | build ✅ lint ✅ availability engine + reminders tested ✅ |
| 6 | Payments & wallet | ✅ Complete | build ✅ lint ✅ lifecycle/idempotency/mismatch/refund tested ✅ |
| 7 | Live classes | ✅ Complete | build ✅ lint ✅ SSE stream + bus tested ✅ |
| 8–15 | … | ⬜ Pending | — |

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

## Phase 3 — delivered

- [x] **Course builder** (`/teacher/courses/[id]`): overview editor (meta, pricing, outcomes, requirements, tags), module/lesson CRUD with up/down reordering, article content, preview flags — editable in DRAFT/UNPUBLISHED
- [x] **Quiz engine**: quiz settings (passing score, time limit), question CRUD (MCQ, 2–6 options, points, explanations), student quiz taker with **server-side scoring**, pass → auto lesson completion, retry support
- [x] **Assignments**: teacher creates per lesson, students submit (editable until graded), teacher grades with score + feedback + student notification
- [x] **Publish flow**: teacher submits for review → admins notified → `/admin/courses` approve (→ live + teacher notification) / reject with reason / unpublish / archive — all audited
- [x] **Public pages**: `/courses` listing with category chips; `/courses/[slug]` detail with SEO metadata, outcomes, curriculum accordion, requirements, reviews, teacher card, sticky enrollment card
- [x] **Enrollment**: free courses enroll immediately (real Enrollment + progress row + teacher notification); paid CTA honestly marked for Phase 6 payments; "Continue learning" for enrolled users
- [x] **Learning page** (`/dashboard/courses/[id]/learn`): curriculum sidebar with completion ticks, article viewer, video placeholder (Phase 8), quiz taker, assignment panel, mark-complete + prev/next, progress ring
- [x] **Progress rollup**: lesson completion → course percent → enrollment COMPLETED at 100% + FIRST_COURSE_COMPLETED achievement + notifications (verified live: 0% → 25% with 1/4 lessons)
- [x] Seed: 3 quizzes (8 questions), 2 assignments wired into courses
- [x] Verified: lint clean, build green (51 routes), course/list/detail/learn/builder/admin pages 200, zero server errors

## Phase 4 — delivered

- [x] **Public teacher profiles** (`/teachers/[id]`): header with verification badge, stats strip (rating, rate, courses, live classes), about, skills, education, experience, rating distribution, reviews, courses grid, weekly availability schedule, save (wishlist), booking/messaging CTAs honestly staged
- [x] **Teacher directory** (`/teachers`): search by name/skill/headline, card grid linking to profiles
- [x] **Advanced search** (`/search`): tabs (courses/teachers/live), server-side filters (category, price range, min rating, difficulty, language, 5 sort orders), pagination, result counts, autocomplete with recent (localStorage) + popular searches
- [x] **Reviews**: write/update course reviews (enrollment required → verified-purchase badge), teacher reviews (booking/enrollment required), delete own, **report flow** (3 reports → FLAGGED + admin notification), aggregate recalculation
- [x] **Admin moderation** (`/admin/reviews`): status filters, flagged queue, remove/restore with audit
- [x] **Wishlist everywhere**: toggle buttons on course pages, teacher profiles; seeded items render in the student wishlist page
- [x] Seed: wishlist items, student's own course review (edit mode), flagged review for moderation demo
- [x] Verified: lint clean, build green (54 routes), search filters/teacher profile/review forms/moderation all render, zero server errors

## Phase 5 — delivered

- [x] **Availability engine** (`src/lib/availability.ts`): 14-day bookable-date listing, 30-min slot generation from weekly slots, blocked-date exceptions, conflict detection vs pending/accepted bookings AND live classes (verified live: slots around a 15:00 booking are excluded)
- [x] **Booking API**: `GET /api/teachers/[id]/availability` (dates + per-date slots, conflict-aware)
- [x] **Booking modal** on teacher profiles: 3-step flow (date grid → time chips → duration + topic + price preview) → creates PENDING booking with validation (future, in-slot, no conflicts, no student double-booking) + notifications + audit
- [x] **Session lifecycle**: teacher accept/decline (Phase 2), student cancel (Phase 2), new: mark COMPLETED / NO_SHOW for ended sessions → student notified + review eligible
- [x] **Reminders**: accepted sessions starting within 24h get one reminder to both parties (`remindedAt` dedupe) — opportunistic from dashboard layouts, scheduled job in Phase 9+ (verified: reminder fired, dedupe set)
- [x] **Review prompt** on completed sessions (links to teacher profile review form)
- [x] Seed: reminder-due session, past-accepted session for outcome buttons
- [x] Verified: lint clean, build green, availability API conflict-exclusion, reminders, outcome section all confirmed

## Phase 6 — delivered

- [x] **Provider abstraction**: `PaymentProvider` interface + DEV sandbox, bKash (tokenized grant/create/execute), Nagad (signed PGW), Rocket (PGW), Stripe (REST checkout + timing-safe HMAC webhook verification) — real API shapes, clear not-configured errors, `PAYMENT_PROVIDERS` controls availability
- [x] **Checkout**: order summary → method selection → gateway redirect → return-URL re-verification → animated success page with transaction details; sandbox gateway page (`/checkout/[id]/dev-pay`) with success/fail simulation
- [x] **Webhooks**: `/api/webhooks/[provider]` with per-provider verification; unknown references + invalid signatures rejected
- [x] **Engine invariants** (verified by automated lifecycle test): frontend can never complete a payment · idempotent completion (replay = no-op) · amount-mismatch rejection · commission split (15% → ৳525/৳2,975 on ৳3,500) · atomic refunds reversing payment + commission + wallet + enrollment
- [x] **Commission resolution**: course → teacher → global overrides via settings keys
- [x] **Wiring**: paid course "Enroll" → checkout; booking acceptance creates the payment order + checkout link notification; student payments page shows "Complete payment →" for pending orders
- [x] **Admin payments**: filterable ledger with lifetime revenue + refund flow
- [x] Docs: `docs/payments.md` (architecture, credentials, invariants, webhooks)
- [x] Verified: lint clean, build green (56 routes), lifecycle/idempotency/mismatch/refund tests pass, checkout + sandbox + admin pages render, zero server errors

## Phase 7 — delivered

- [x] **Realtime layer**: in-process classroom event bus + SSE stream (`/api/classrooms/[id]/stream`, force-dynamic, immediate heartbeat, snapshot replay for late joiners); mutations flow server action → bus → SSE (Redis pub/sub swap documented for multi-instance)
- [x] **Classroom UI** (`/classroom/[id]`): video/avatar tiles with mic states, chat panel, participants panel with raised hands + host mute/remove, polls (create/vote/close with live result bars), emoji reactions overlay, collaborative whiteboard (pointer strokes, colors, eraser, host clear, session replay), bottom control bar, mobile drawer layout
- [x] **Lifecycle**: teacher Start/End class (attendance rollup → PRESENT/LATE/ABSENT), student Join now button, join/leave presence, chat lock, participant moderation, recording toggle event, start notifications to all registered students
- [x] **WebRTC abstraction** (`src/lib/live/webrtc.ts`): provider interface; LiveKit implementation mints real access tokens with jose (HS256, no SDK); dev provider shows honest avatar-tile mode
- [x] **Paid live classes**: registration creates a payment order → checkout → engine creates the participant on completion (Payment.liveClassId)
- [x] Verified: bus pub/sub all event types (chat/poll/hand/reaction/stroke), SSE stream connects for student + host (403 for outsiders), classroom renders both roles with correct controls, zero server errors

## Known next steps (Phase 8 kickoff)

1. Admin recorded-class upload flow: /admin/recorded-classes (All/Upload/Drafts/Processing/Published/Archived), course→module→lesson picker, thumbnail + resources + metadata, upload progress, retry on failure
2. Video storage abstraction: local file storage with HMAC-signed streaming URLs (protected playback — never expose raw URLs), Cloudflare Stream / Mux / S3 adapters
3. Premium custom video player: playback speed, quality, captions, PiP, keyboard shortcuts, resume, bookmarks, in-player notes, progress tracking
4. Public recorded-class library (/recorded-classes) + watch page with authorization checks
5. `docs/` deep-dives as their subsystems land: database.md, authentication.md, live-classes.md, recorded-classes.md, video-storage.md, security.md, deployment.md, environment-variables.md
