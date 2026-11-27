# LINGUAVERSE AI — Cloudflare Production Deployment Guide (10-Step Runbook)

> **Validation Status:** Validated against **Wrangler `4.168.0`** via `npx wrangler deploy --dry-run --env staging` (`0` warnings, `945.21 KiB` / `189.95 KiB` gzip), `npx wrangler deploy --dry-run --env production` (`0` warnings, `945.21 KiB` / `189.95 KiB` gzip), and `npx wrangler d1 migrations list linguaverse-db --local --env production` (lists strictly the 4 forward migrations `0001`–`0004`).  
> **Live Deployment Status:** **NOT deployed to live Cloudflare production** (awaiting owner Cloudflare account credentials and authorization; all UUIDs in `wrangler.toml` remain non-secret placeholders).

---

## Architecture & Environment Isolation

| Component | Cloudflare Service | Staging Resource (`--env staging`) | Production Resource (`--env production`) | Entry / Output |
| --- | --- | --- | --- | --- |
| **API Backend & Cron** | Cloudflare Workers | `linguaverse-ai-api-staging` | `linguaverse-ai-api-prod` | `worker/index.ts` |
| **Relational Database** | Cloudflare D1 | `linguaverse-db-staging` | `linguaverse-db` | `migrations/0001..0004*.sql` |
| **Private Learner Audio** | Cloudflare R2 | `linguaverse-audio-staging` | `linguaverse-audio` | `AUDIO_BUCKET` |
| **Admin CMS Media** | Cloudflare R2 | `linguaverse-media-staging` | `linguaverse-media` | `MEDIA_BUCKET` |
| **Edge Cache/Sessions/Limits** | Cloudflare KV | Staging KV IDs (`0011..0016` placeholders) | Production KV IDs (`0021..0026` placeholders) | `LINGUAVERSE_KV`, `SESSION_KV`, `RATE_LIMIT_KV` |
| **Scheduled Maintenance** | Cron Triggers | `0 3 * * *`, `0 */6 * * *` | `0 3 * * *`, `0 */6 * * *` | `scheduled()` |
| **Learner PWA** | Cloudflare Pages | Preview branch deploys | `linguaverse-ai` | `npm run build` -> `dist/` |
| **Separate Admin App** | Cloudflare Pages | Preview branch deploys | `linguaverse-admin` | `npm run build:admin` -> `dist-admin/` |

**Intentionally Omitted Paid/Stateful Services:** Durable Objects and Cloudflare Queues are **not** used (Community DMs are permanently disabled per PRD safety policy, and Worker `fetch()` + Cron Triggers satisfy all PRD workloads without extra billing).

---

## Separate Deployment Procedures (PowerShell)

### 1. Cloudflare D1 Database (Create, Migrate, Seed)
```powershell
npx wrangler login
npx wrangler d1 create linguaverse-db
npx wrangler d1 create linguaverse-db-staging
# Copy returned real database_id values into `[[env.production.d1_databases]]` and `[[env.staging.d1_databases]]` in wrangler.toml

npx wrangler d1 migrations list linguaverse-db --remote --env production
npx wrangler d1 migrations apply linguaverse-db --remote --env production
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/seeds/seed_reference_data.sql
```

### 2. Cloudflare R2 Buckets (Audio + CMS Media)
```powershell
npx wrangler r2 bucket create linguaverse-audio
npx wrangler r2 bucket create linguaverse-audio-staging
npx wrangler r2 bucket create linguaverse-audio-preview
npx wrangler r2 bucket create linguaverse-media
npx wrangler r2 bucket create linguaverse-media-staging
npx wrangler r2 bucket create linguaverse-media-preview
```

### 3. Cloudflare KV Namespaces (Production & Staging Separated)
```powershell
# Production KV namespaces -> paste IDs into [[env.production.kv_namespaces]] in wrangler.toml
npx wrangler kv namespace create LINGUAVERSE_KV --env production
npx wrangler kv namespace create LINGUAVERSE_KV --env production --preview
npx wrangler kv namespace create SESSION_KV --env production
npx wrangler kv namespace create SESSION_KV --env production --preview
npx wrangler kv namespace create RATE_LIMIT_KV --env production
npx wrangler kv namespace create RATE_LIMIT_KV --env production --preview

# Staging KV namespaces -> paste IDs into [[env.staging.kv_namespaces]] in wrangler.toml
npx wrangler kv namespace create LINGUAVERSE_KV --env staging
npx wrangler kv namespace create LINGUAVERSE_KV --env staging --preview
npx wrangler kv namespace create SESSION_KV --env staging
npx wrangler kv namespace create SESSION_KV --env staging --preview
npx wrangler kv namespace create RATE_LIMIT_KV --env staging
npx wrangler kv namespace create RATE_LIMIT_KV --env staging --preview
```

### 4. Production Secrets (Never Commit to Git or `wrangler.toml`)
```powershell
# Required core secrets
npx wrangler secret put GEMINI_API_KEY --env production
npx wrangler secret put JWT_SIGNING_SECRET --env production
npx wrangler secret put ADMIN_BOOTSTRAP_SECRET --env production
npx wrangler secret put CORS_ALLOWED_ORIGIN --env production

# Optional external integrations (fail closed / honestly disabled until configured)
npx wrangler secret put RESEND_API_KEY --env production
npx wrangler secret put GOOGLE_CLIENT_ID --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
npx wrangler secret put SSLCOMMERZ_STORE_PASSWD --env production
npx wrangler secret put PADDLE_WEBHOOK_SECRET --env production
```

### 5. Cloudflare Worker (Dry-Run Validation & Deploy)
```powershell
# Always verify zero config warnings first
npx wrangler deploy --dry-run --env production

# Deploy production Worker + Cron Triggers
npx wrangler deploy --env production
```

### 6. Learner PWA (`dist/` -> Cloudflare Pages `linguaverse-ai`)
```powershell
$env:VITE_API_BASE_URL = "https://<your-api-domain>"
npm run build
npx wrangler pages project create linguaverse-ai --production-branch main
npx wrangler pages deploy dist --project-name linguaverse-ai
```

### 7. Separate Admin App (`dist-admin/` -> Cloudflare Pages `linguaverse-admin`)
```powershell
$env:VITE_API_BASE_URL = "https://<your-api-domain>"
npm run build:admin
npx wrangler pages project create linguaverse-admin --production-branch main
npx wrangler pages deploy dist-admin --project-name linguaverse-admin
```
> Put **Cloudflare Access (Zero Trust)** in front of `linguaverse-admin` in addition to built-in RBAC, HttpOnly cookies, and the permanent one-time Super Admin bootstrap lock.

### 8. Domain & CORS Configuration
1. Attach custom domains in Cloudflare:
   - Worker API: uncomment `routes` under `[env.production]` in `wrangler.toml` (e.g. `api.yourdomain.com/*`).
   - Learner Pages (`linguaverse-ai`): attach `app.yourdomain.com` (or `yourdomain.com`).
   - Admin Pages (`linguaverse-admin`): attach `admin.yourdomain.com`.
2. Set `CORS_ALLOWED_ORIGIN` secret to the exact comma-separated origins (never `*`):
   `https://app.yourdomain.com,https://admin.yourdomain.com`
3. Rebuild both Pages apps with `$env:VITE_API_BASE_URL = "https://api.yourdomain.com"` if switching from `*.workers.dev` to a custom API domain.

### 9. Live Smoke Verification & Initial Super Admin Bootstrap
```powershell
# 1. Open https://admin.yourdomain.com and complete the one-time Super Admin bootstrap using ADMIN_BOOTSTRAP_SECRET
# 2. Run automated live smoke checks
node scripts/smoke-test-deployment.mjs `
  --api-url https://<your-api-domain> `
  --web-url https://<your-learner-domain> `
  --admin-url https://<your-admin-domain>
```

### 10. Backup & Rollback
- Full pre-migration backup (`wrangler d1 export`), D1 Time Travel restore, explicit versioned Worker rollback (`npx wrangler versions list --env production` -> `npx wrangler rollback <version-id> --env production --message "..."`), Pages deployment rollback, and non-destructive SQL rollbacks (`db/rollbacks/ROLLBACK_0004..0002*.sql`) are documented in `docs/DATABASE_DEPLOYMENT.md` and `docs/ROLLBACK.md`.
