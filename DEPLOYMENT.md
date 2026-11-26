# LINGUAVERSE AI — Production Deployment Runbook (Cloudflare Pages + Workers + D1 + R2 + KV)

This guide covers deploying the complete **LINGUAVERSE AI** platform (PRD v6.1) to Cloudflare with zero frontend secrets, real Gmail 6-digit OTP email verification, isolated Workers API (`worker/`), D1 relational database, R2 private audio storage, and KV edge rate limiting.

---

## 1. Prerequisites
- Node.js 20+ and npm (or Bun)
- Cloudflare account with Workers, Pages, D1, R2, and KV enabled
- Wrangler CLI (`npx wrangler login` or `CLOUDFLARE_API_TOKEN` environment variable)
- Required server-side secrets (set via `wrangler secret put`, **never** committed to Git):
  - `GEMINI_API_KEY` (Google AI Studio / Gemini API)
  - `RESEND_API_KEY` (Resend) **or** `EMAIL_PROVIDER_API_KEY` (Brevo) for Gmail 6-digit OTP verification emails
  - `JWT_SIGNING_SECRET` (random 32+ byte secret for HMAC-SHA256 session tokens)
- Optional modular provider secrets (adapters remain honestly `UNCONFIGURED` until set):
  - `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`
  - `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (required for genuine acoustic phoneme-level scoring)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `STRIPE_WEBHOOK_SECRET`, `SSLCOMMERZ_STORE_PASSWD`, `PADDLE_WEBHOOK_SECRET`
  - `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile bot protection)

---

## 2. Provision Cloudflare Resources

### 2.1 Create D1 Database & Apply Additive Migrations (`0001` → `0002` → `0003` → `0004`)
```bash
npx wrangler d1 create linguaverse-db
```
Copy the returned `database_id` into `wrangler.toml` under `[[d1_databases]]`, then apply migrations sequentially (all migrations use `CREATE TABLE IF NOT EXISTS` and preserve pre-existing user data):
```bash
# Local preview DB
npx wrangler d1 execute linguaverse-db --local --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute linguaverse-db --local --file=./migrations/0002_parts06_12_parity.sql
npx wrangler d1 execute linguaverse-db --local --file=./migrations/0003_p3_community_vocab_billing.sql
npx wrangler d1 execute linguaverse-db --local --file=./migrations/0004_prd61_examinations_labs_providers.sql

# Back up existing remote D1 database before applying migrations
npx wrangler d1 export linguaverse-db --remote --output=./backup-linguaverse-db.sql

# Production remote D1 DB
npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0001_initial_schema.sql
npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0002_parts06_12_parity.sql
npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0003_p3_community_vocab_billing.sql
npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0004_prd61_examinations_labs_providers.sql
```
Non-destructive rollback scripts (`migrations/ROLLBACK_0004_prd61_examinations_labs_providers.sql`, `migrations/ROLLBACK_0003_p3_community_vocab_billing.sql`, and `migrations/ROLLBACK_0002_parts06_12_parity.sql`) drop only their respective additive tables without touching core `users`, `sessions`, or prior tables.

### 2.2 Create Private R2 Audio Bucket
```bash
npx wrangler r2 bucket create linguaverse-audio
npx wrangler r2 bucket create linguaverse-audio-preview
```

### 2.3 Create KV Namespaces
```bash
npx wrangler kv namespace create LINGUAVERSE_KV
npx wrangler kv namespace create SESSION_KV
npx wrangler kv namespace create RATE_LIMIT_KV
```
Copy the returned namespace IDs into `wrangler.toml`.

---

## 3. Configure Worker Secrets (Zero Frontend Exposure)
```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put RESEND_API_KEY
# Or if using Brevo instead of Resend:
# npx wrangler secret put EMAIL_PROVIDER_API_KEY
npx wrangler secret put JWT_SIGNING_SECRET

# Optional payment gateway HMAC webhook secrets (endpoints fail closed with 503 until set):
# npx wrangler secret put STRIPE_WEBHOOK_SECRET
# npx wrangler secret put SSLCOMMERZ_STORE_PASSWD
# npx wrangler secret put PADDLE_WEBHOOK_SECRET

# Optional speech / pronunciation / OAuth / bot-shield secrets:
# npx wrangler secret put DEEPGRAM_API_KEY
# npx wrangler secret put OPENAI_API_KEY
# npx wrangler secret put ELEVENLABS_API_KEY
# npx wrangler secret put AZURE_SPEECH_KEY
# npx wrangler secret put AZURE_SPEECH_REGION
# npx wrangler secret put GOOGLE_CLIENT_ID
# npx wrangler secret put GOOGLE_CLIENT_SECRET
# npx wrangler secret put TURNSTILE_SECRET_KEY
```
Optional sender address and strict CORS allowlist in `wrangler.toml` `[vars]`:
```toml
EMAIL_FROM = "LINGUAVERSE AI <noreply@yourdomain.com>"
CORS_ALLOWED_ORIGIN = "https://your-production-domain.pages.dev"
```

---

## 4. Deploy Isolated Cloudflare Worker API (`worker/index.ts`)
```bash
npx wrangler deploy
```
Verify live worker health & public status:
```bash
curl https://<your-worker-subdomain>.workers.dev/api/v1/health
curl https://<your-worker-subdomain>.workers.dev/api/v1/system/status
```
Expected `/api/v1/health` JSON:
```json
{
  "ok": true,
  "service": "linguaverse-ai-worker",
  "aiConfigured": true,
  "emailConfigured": true
}
```

---

## 5. Build & Deploy Frontend to Cloudflare Pages
Set `VITE_API_BASE_URL` to your deployed Cloudflare Worker URL (e.g., `https://linguaverse-ai-api.<subdomain>.workers.dev` or `https://api.linguaverse.ai`):
```bash
VITE_API_BASE_URL=https://linguaverse-ai-api.<subdomain>.workers.dev npm run build
npx wrangler pages deploy dist --project-name=linguaverse-ai
```

---

## 6. Automated GitHub Actions CI/CD (`.github/workflows/ci-cd.yml`)
Configure the following in GitHub Repository Settings → Secrets and Variables → Actions:
- **Repository Secrets**:
  - `CLOUDFLARE_API_TOKEN` (scoped to D1, Workers, Pages)
  - `CLOUDFLARE_ACCOUNT_ID`
- **Repository Variables**:
  - `VITE_API_BASE_URL` (your deployed Worker URL)

Pull requests automatically run `npm run lint`, all domain/storage/Worker parity tests, `npm run build`, and a `dist/` secret-leakage scan. Pushes to `main` (or manual `workflow_dispatch` with `deploy_cloudflare=true`) run migrations `0001 -> 0002 -> 0003 -> 0004` and deploy the Worker + Pages build.

---

## 7. Post-Deployment Verification Checklist
1. **Landing Page (`/`)**: Confirm `EN / বাংলা` toggle, 3D Acoustic Core, Live Sentence Sandbox, and `"Interactive Sample Preview"` labels render cleanly with zero console errors.
2. **Real Gmail OTP Registration (`/register` -> `/verify-email`)**:
   - Register a test Gmail account.
   - Verify `/onboarding` and `/app` redirect back to `/verify-email` while `email_verified = 0`.
   - Enter the 6-digit OTP received in Gmail -> confirm redirect to `/onboarding`.
3. **Learner Modules (`/app/ielts`, `/app/writing`, `/app/vocabulary`, `/app/community`, `/app/progress`, `/app/settings`)**:
   - Verify IELTS Exam Prep (`/app/ielts`) displays the mandatory non-official Exam Truth Policy disclaimer and persists attempts.
   - Verify Writing & Labs (`/app/writing`) preserves original diary text alongside rewrites and tags Human Communication Bridge logs strictly as `User-Reported Offline Activity`.
   - Verify Progress (`/app/progress`) renders Learning Plateau & Communication Readiness signals honestly from real attempts.
   - Verify Settings (`/app/settings`) persists notification preferences & quiet hours server-side.
   - Verify Community keeps direct messaging permanently disabled and Subscription displays honest `pending_provider` status until payment secrets are set.
4. **Admin Control Center (`/admin`)**:
   - Confirm `learner` role receives `403` on `/api/v1/admin/*`.
   - Promote an initial admin account in D1:
     ```bash
     npx wrangler d1 execute linguaverse-db --remote \
       --command="UPDATE users SET role = 'super_admin' WHERE email = 'your-admin@gmail.com';"
     ```
   - Verify **Overview**, **Website CMS**, **Users** (with suspend session revocation & delete confirmation), **Curriculum Builder**, **AI Ops**, **AI & API Providers** (12 providers masked, zero raw keys), **Reported Mistakes**, **Moderation & Appeals**, **Subscriptions & Support**, **System & Flags** (interactive Maintenance Mode & feature flags), **Health & Broadcasts**, and **Audit Log** tabs.

