# 🎓 LearnHub — Premium Education Marketplace (Bangladesh)

A production-grade education marketplace: **live classes, recorded classes, 1-on-1 tutoring, courses, payments (bKash/Nagad/Rocket/Stripe), AI learning features** — built with a premium design system.

**Status:** Phase 1 complete (architecture, database, auth, design system, dashboards, landing page). See [`docs/PROGRESS.md`](docs/PROGRESS.md) and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Prisma 6 (SQLite dev → PostgreSQL prod) · Tailwind CSS v4 design tokens · Motion · Zod 4 · jose JWT auth · lucide-react

## Quickstart

```bash
npm install

# 1. Environment (dev defaults work out of the box)
cp .env.example .env        # fill AUTH_SECRET (openssl rand -hex 32)

# 2. Database
npm run db:push             # create SQLite schema (prisma/dev.db)
npm run db:seed             # demo data (idempotent)

# 3. Run
npm run dev                 # http://localhost:3000
```

### Demo accounts (password: `Password123!`)

| Role | Email |
|---|---|
| Super admin | `admin@example.com` |
| Teacher (verified) | `ayesha@example.com` |
| Student | `student@example.com` |
| Teacher (verification pending — admin queue demo) | `mahmudul@example.com` |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (typecheck + lint gate) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (run after `next build` once to generate route types) |
| `npm run test` | Vitest suite (dedicated test database) |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma workflow |

## Project layout

```
prisma/           schema (63 models) + seed
src/app/          (marketing) (auth) (dashboard) (teacher) (admin) route groups, api/*
src/components/   ui/ (design system) · layout/ (shells) · landing/ · shared/ (cards)
src/lib/          auth · payments · video · ai · realtime abstractions, db, api, validation…
src/proxy.ts      edge auth gate + security headers
docs/             IMPLEMENTATION_PLAN.md · PROGRESS.md
```

## Configuration

All credentials live in env vars — see [`.env.example`](.env.example) for the complete list (payment gateways, video providers, AI providers, email). Never commit `.env`.

## Roadmap

15 phases — payments, live classrooms, recorded-class library with protected playback, messaging, certificates, gamification, AI features, analytics, 3D/animations, hardening, deployment. Tracked in [`docs/PROGRESS.md`](docs/PROGRESS.md).
