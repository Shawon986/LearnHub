# Environment Variables

Copy `.env.example` → `.env`. Everything has a safe dev default except
`AUTH_SECRET` (required, 32+ chars).

| Variable | Dev default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma connection (Postgres in production) |
| `AUTH_SECRET` | *(required)* | JWT signing (HS256) |
| `APP_URL` | `http://localhost:3000` | Public base URL (emails, certificates, sitemap) |
| `EMAIL_PROVIDER` | `console` | `console` (dev) / `resend` |
| `RESEND_API_KEY` | — | Resend API key |
| `EMAIL_FROM` | — | Sender address |
| `PAYMENT_PROVIDERS` | `DEV` | Comma-separated checkout methods (remove DEV in prod) |
| `ALLOW_DEV_PAYMENTS` | — | `true` enables the DEV sandbox on a production deployment (explicit trial opt-in; payments stay `provider=DEV`) |
| `BKASH_APP_KEY/APP_SECRET/USERNAME/PASSWORD/BASE_URL` | — | bKash tokenized checkout |
| `NAGAD_MERCHANT_ID/PUBLIC_KEY/PRIVATE_KEY/BASE_URL` | — | Nagad PGW |
| `ROCKET_USER_ID/PASSWORD/BASE_URL` | — | Rocket PGW |
| `STRIPE_SECRET_KEY/WEBHOOK_SECRET/PUBLISHABLE_KEY` | — | Stripe checkout + signed webhooks |
| `VIDEO_PROVIDER` | `local` | `local` / `cloudflare` / `mux` |
| `VIDEO_LOCAL_DIR` | `./uploads` | Local storage root |
| `CLOUDFLARE_STREAM_*` / `MUX_*` | — | Cloud video providers |
| `AI_PROVIDER` | `dev` | `dev` / `openai` / `anthropic` / `gateway` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_URL` | — | AI credentials |
| `CRON_SECRET` | *(optional)* | Protects `/api/cron/reminders` |

All secrets stay out of source control (`.env*` is git-ignored).
