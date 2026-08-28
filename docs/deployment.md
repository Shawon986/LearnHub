# Deployment

## Recommended: Vercel + Neon

1. **Database**: provision PostgreSQL (Neon via Vercel Marketplace),
   set `DATABASE_URL` in Vercel env, run `npx prisma db push` once
   (CI: run it in the build step or use `prisma migrate`).
2. **Env vars** (Vercel → Project Settings → Environment Variables):
   - `AUTH_SECRET` (32+ random bytes — `openssl rand -hex 32`)
   - `APP_URL` (production URL)
   - `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM`
   - `PAYMENT_PROVIDERS=BKASH,NAGAD,STRIPE` (remove `DEV`!) + the
     gateway credentials for each
   - `VIDEO_PROVIDER=cloudflare` (or mux) + credentials
   - `AI_PROVIDER=openai|anthropic|gateway` + keys
   - `LIVE_PROVIDER=livekit` + LiveKit credentials (Phase 7 classroom)
   - `CRON_SECRET` (random) for `/api/cron/reminders`
3. **Cron**: Vercel Cron Job → `/api/cron/reminders`, every 30 min,
   with header `Authorization: Bearer <CRON_SECRET>`.
4. **Uploads caveat**: the local video provider writes to the server
   filesystem, which is ephemeral on serverless — use Cloudflare Stream
   or Mux for production video (see `docs/video-storage.md`).
5. Deploy: push to the production branch (Git integration) or
   `vercel --prod` (CLI: `npm i -g vercel`).

## Any Node host

`npm run build && npm start` — same env requirements. SQLite is not
recommended for multi-instance; use PostgreSQL.

## Pre-launch checklist

- [ ] All env vars set (none left as dev defaults)
- [ ] `PAYMENT_PROVIDERS` excludes `DEV`
- [ ] Real provider webhooks registered (bKash/Nagad/Rocket/Stripe URLs:
  `https://<app>/api/webhooks/<provider>`)
- [ ] Gateway sandbox → live credentials swapped and a real end-to-end
  payment test completed
- [ ] Video provider configured and a full upload→process→play test done
- [ ] CRON_SECRET set and reminders verified
- [ ] `npm run test` green, `npm run lint` clean, `npm run build` green
