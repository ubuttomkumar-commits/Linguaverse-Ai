# LINGUAVERSE AI — Production Deployment Runbook (Cloudflare Pages + Workers + D1 + R2 + KV)

This guide covers deploying the complete **LINGUAVERSE AI** platform (PRD v5.0) to Cloudflare with zero frontend secrets, real Gmail 6-digit OTP email verification, isolated Workers API (`worker/`), D1 relational database, R2 private audio storage, and KV edge rate limiting.

---

## 1. Prerequisites
- Node.js 20+ and npm
- Cloudflare account with Workers, Pages, D1, R2, and KV enabled
- Wrangler CLI (`npx wrangler login` or `CLOUDFLARE_API_TOKEN` environment variable)
- Server-side API keys (set as Cloudflare Secrets, **never** committed to Git):
  - `GEMINI_API_KEY` (Google AI Studio / Gemini API)
  - `RESEND_API_KEY` (Resend) **or** `EMAIL_PROVIDER_API_KEY` (Brevo) for Gmail 6-digit OTP verification emails
  - `JWT_SIGNING_SECRET` (random 32+ byte secret for HMAC-SHA256 session tokens)

---

## 2. Provision Cloudflare Resources

### 2.1 Create D1 Database & Apply PRD v5.0 Schema
```bash
npx wrangler d1 create linguaverse-db
```
Copy the returned `database_id` into `wrangler.toml` under `[[d1_databases]]`, then apply `schema.sql`:
```bash
# Local preview DB
npx wrangler d1 execute linguaverse-db --local --file=./schema.sql

# Production remote D1 DB
npx wrangler d1 execute linguaverse-db --remote --file=./schema.sql
```

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
```
Optional sender address in `wrangler.toml` `[vars]`:
```toml
EMAIL_FROM = "LINGUAVERSE AI <noreply@yourdomain.com>"
```

---

## 4. Deploy Isolated Cloudflare Worker API (`worker/index.ts`)
```bash
npx wrangler deploy
```
Verify live worker health:
```bash
curl https://<your-worker-subdomain>.workers.dev/api/v1/health
```
Expected JSON:
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

## 6. Post-Deployment Verification Checklist
1. **Landing Page (`/`)**: Confirm `EN / বাংলা` toggle, 3D Acoustic Core, Live Sentence Sandbox, and `"Interactive Sample Preview"` labels render cleanly with zero console errors.
2. **Real Gmail OTP Registration (`/register` -> `/verify-email`)**:
   - Register a test Gmail account.
   - Verify `/onboarding` and `/app` redirect back to `/verify-email` while `email_verified = 0`.
   - Enter the 6-digit OTP received in Gmail -> confirm redirect to `/onboarding`.
3. **Admin Control Center (`/admin`)**:
   - Confirm `learner` role receives `403` on `/api/v1/admin/*`.
   - Promote an initial admin account in D1:
     ```bash
     npx wrangler d1 execute linguaverse-db --remote \
       --command="UPDATE users SET role = 'super_admin' WHERE email = 'your-admin@gmail.com';"
     ```
   - Verify **Overview**, **Users**, **Curriculum Builder**, **AI Ops**, **Reported Mistakes**, and **Audit Log** tabs show real D1 records with zero fake metrics.
