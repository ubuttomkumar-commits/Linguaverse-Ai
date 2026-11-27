# LINGUAVERSE AI — Production Deployment Runbook (Cloudflare + Dual Pages)

> **Environment Status Disclosure:** Live Cloudflare provisioning, deployment, and GitHub push were **NOT** executed from this build sandbox (`wrangler` CLI, `.git` metadata, and Cloudflare/GitHub credentials are absent). Use this runbook on your authorized deployment workstation or GitHub Actions runner.

---

## 1. Deployment Artifacts Produced Locally

- **User Web Application (`dist/`):** `npm run build` -> Cloudflare Pages project `linguaverse-web`
- **Separate Admin Application (`dist-admin/`):** `npm run build:admin` (`vite.admin.config.ts`) -> Cloudflare Pages project `linguaverse-admin`
- **Combined Dual Build:** `npm run build:all`
- **Edge Backend API (`worker/index.ts`):** `npx wrangler deploy` -> Cloudflare Worker `linguaverse-api`

---

## 2. Step-by-Step Cloudflare Provisioning

### Step 1: Provision Cloudflare D1, R2, and KV Resources
```bash
npx wrangler d1 create linguaverse-db
npx wrangler r2 bucket create linguaverse-audio
npx wrangler kv namespace create RATE_LIMIT_KV
npx wrangler kv namespace create SESSION_CACHE_KV
npx wrangler kv namespace create APP_CACHE_KV
```
Replace the placeholder UUIDs in `wrangler.toml` with the real IDs returned by Wrangler.

### Step 2: Configure Worker Production Secrets (Never Commit to Git)
```bash
npx wrangler secret put JWT_SIGNING_SECRET          # >= 32 random bytes (hex/base64)
npx wrangler secret put GEMINI_API_KEY              # Google Gemini server-side key
npx wrangler secret put ADMIN_BOOTSTRAP_SECRET      # >= 16 chars; required for one-time initial Super Admin provisioning
npx wrangler secret put RESEND_API_KEY              # Optional: transactional OTP & password reset email
npx wrangler secret put STRIPE_WEBHOOK_SECRET       # Optional: live Stripe webhook HMAC verification
npx wrangler secret put SSLCOMMERZ_WEBHOOK_SECRET   # Optional: live SSLCommerz webhook verification
```

Configure explicit allowlisted origins in `wrangler.toml` (`CORS_ALLOWED_ORIGIN`) including **both** your User Web App origin and your Separate Admin App origin (comma-separated, never `*`):
```toml
CORS_ALLOWED_ORIGIN = "https://linguaverse.ai,https://admin.linguaverse.ai"
```

### Step 3: Apply Additive D1 Migrations (With Pre-Migration Backup)
```bash
npx wrangler d1 export linguaverse-db --remote --output="backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql"
npx wrangler d1 migrations apply linguaverse-db --remote
```

### Step 4: Deploy Worker API & Both Cloudflare Pages Projects
```bash
# 1. Deploy Backend Worker
npx wrangler deploy

# 2. Build both User & Separate Admin SPAs targeting the deployed Worker API
VITE_API_BASE_URL="https://api.linguaverse.ai" npm run build:all

# 3. Deploy Learner Web Application
npx wrangler pages deploy dist --project-name=linguaverse-web

# 4. Deploy Separate Admin Application (dedicated subdomain, e.g. admin.linguaverse.ai)
npx wrangler pages deploy dist-admin --project-name=linguaverse-admin
```

### Step 5: Claim Initial Super Admin Account (One-Time Provisioning)
1. Open your Separate Admin Application URL (`https://admin.linguaverse.ai`).
2. Because zero `admin` / `super_admin` accounts exist in D1, the app displays **One-Time Initial Super Admin Provisioning**.
3. Enter the administrator's name, email, strong password (`>= 10` characters with upper/lower/number/symbol), and your `ADMIN_BOOTSTRAP_SECRET`.
4. Submit to provision the initial `super_admin` account. The backend immediately locks `POST /api/v1/admin/auth/bootstrap` permanently (`HTTP 409 ADMIN_ALREADY_PROVISIONED`) and writes an `admin.bootstrap.claimed` audit event.
5. Delete `ADMIN_BOOTSTRAP_SECRET` from Cloudflare Worker secrets after provisioning (`npx wrangler secret delete ADMIN_BOOTSTRAP_SECRET`).

---

## 3. GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`)

Configure these repository secrets on `ubuttomkumar-commits/Linguaverse-Ai`:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_API_BASE_URL`

Every push to `main` automatically runs:
1. `tsc --noEmit` (strict TypeScript validation)
2. Full automated suite (`179` unit, storage, SQLite migration/rollback, and Worker parity tests)
3. Dual production builds (`npm run build:all` -> `dist/` + `dist-admin/`)
4. Secret scan across both `dist/` and `dist-admin/`
5. Additive D1 migrations (`0001`–`0004`), Worker deployment, Learner Pages (`linguaverse-web`), and Separate Admin Pages (`linguaverse-admin`).
