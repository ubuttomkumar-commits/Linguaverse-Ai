# LINGUAVERSE AI — Environment & Secret Setup Guide

This guide documents every environment variable across **Local Express Development**, **Local Cloudflare Wrangler Development**, and **Cloudflare Production**.

---

## 1. Secret Hygiene Rules

1. **Never commit secrets** (`.env`, `.dev.vars`, `.dev.vars.*`, `*.pem`, `*.key`, `.data/` are all ignored in `.gitignore`).
2. **Never prefix secrets with `VITE_`** — any `VITE_*` variable is embedded directly into browser JS bundles (`dist/` and `dist-admin/`).
3. **Production Fail-Closed Guarantees:**
   - Missing `JWT_SIGNING_SECRET` in `APP_ENV=production` -> returns `500 AUTH_CONFIG_ERROR` (never falls back to a dev signing key).
   - Missing `ADMIN_BOOTSTRAP_SECRET` in `APP_ENV=production` -> returns `503 BOOTSTRAP_SECRET_REQUIRED` (blocks unauthenticated first-admin takeover).
   - Missing payment webhook secrets -> returns `503 WEBHOOK_NOT_CONFIGURED` (never accepts unverified billing webhooks).

---

## 2. Configuration Files

| Runtime | Template File (Committed) | Local Secret File (Gitignored) | Production Injection |
| --- | --- | --- | --- |
| Local Node/Express (`npm run dev`) | `.env.example` | `.env` | N/A (local dev) |
| Local Cloudflare Worker (`npx wrangler dev`) | `.dev.vars.example` | `.dev.vars` | `npx wrangler secret put <NAME> --env production` |
| Frontend Builds (`dist/`, `dist-admin/`) | `VITE_API_BASE_URL` | Shell env var at build time | Cloudflare Pages Environment Variables |

### Setup Local Files (PowerShell)
```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

---

## 3. Complete Variable Reference

### 3.1 Core Backend & Security Variables

| Variable | Required in Prod | Surface | Purpose / Fallback Behavior |
| --- | --- | --- | --- |
| `APP_ENV` | Yes (`production`) | Worker (`wrangler.toml`) / Express | Activates strict fail-closed JWT, bootstrap secret, and `Secure` cookie policies |
| `GEMINI_API_KEY` | Yes (for AI features) | Worker secret / Express `.env` | Server-side Google Gemini API calls (Speaking, Transfer, Academy Assist, Mistake Coach, DNA Coach, Replay, IELTS, Writing). Never exposed to client |
| `JWT_SIGNING_SECRET` | Yes (`>= 32` chars) | Worker secret / Express `.env` | HMAC-SHA256 signing key for session cookies & tokens |
| `ADMIN_BOOTSTRAP_SECRET` | Yes (`>= 16` chars) | Worker secret / Express `.env` | One-time secret required to provision the first `super_admin` in Separate Admin App |
| `CORS_ALLOWED_ORIGIN` | Yes (exact origins) | Worker secret / Express `.env` | Comma-separated allowlist, e.g. `https://app.yourdomain.com,https://admin.yourdomain.com` |
| `AUDIO_RETENTION_DAYS` | Optional (`30`) | `wrangler.toml [vars]` | Days before Cron maintenance purges expired R2 learner audio clips |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Optional (`25`–`30`) | `wrangler.toml [vars]` | Edge KV sliding rate limit ceiling |

### 3.2 Frontend Build Variables (Non-Secret)

| Variable | Required in Prod | Surface | Purpose |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes for Cloudflare Pages | `npm run build` & `npm run build:admin` | Base URL of deployed Cloudflare Worker (e.g. `https://api.yourdomain.com`). When blank in local Express dev, frontend calls same-origin `/api/*` |

### 3.3 External Service Readiness Matrix

All optional external integrations degrade honestly and securely when credentials are absent:

| Integration | Variables | Behavior When Unconfigured |
| --- | --- | --- |
| **Transactional Email (OTP / Reset)** | `RESEND_API_KEY` or `EMAIL_PROVIDER_API_KEY` + `EMAIL_FROM` | Local dev shows an explicit `local_dev_preview` OTP notice; production requires a real Resend or Brevo API key for inbox delivery |
| **Google OAuth 2.0** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `GET /api/v1/auth/providers` returns `configured: false`; no fake OAuth buttons or bypasses |
| **Stripe Billing Webhooks** | `STRIPE_WEBHOOK_SECRET` | Checkout returns honest `pending_provider`; webhook endpoint fails closed with `503` |
| **SSLCommerz Billing Webhooks** | `SSLCOMMERZ_STORE_PASSWD` | Checkout returns honest `pending_provider`; webhook endpoint fails closed with `503` |
| **Paddle Billing Webhooks** | `PADDLE_WEBHOOK_SECRET` | Checkout returns honest `pending_provider`; webhook endpoint fails closed with `503` |
| **Additional AI / Speech Providers** | `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Registered in Admin AI Provider Registry as `awaiting_credentials`; zero fake health greenlights |
| **Cloudflare Turnstile (Bot Protection)** | `TURNSTILE_SECRET_KEY` | Ready for optional edge verification on auth endpoints |
