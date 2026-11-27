# LINGUAVERSE AI — Testing & Verification Guide

## 1. Automated Test Suite (`179 / 179 PASS`)

Run the full automated domain, storage, SQLite migration/rollback, and Cloudflare Worker parity suite:

```bash
npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts
```

### Suite Coverage Breakdown
- **Domain Unit Tests (`src/domain/*.test.ts`):**
  - Auth & security policies (`authSecurityEngine`, `otpVerification`, `securityPolicy`, `adminBootstrapEngine`, `paymentWebhookEngine`)
  - Onboarding, 5-skill diagnostic, Dashboard 8-stage loop, Academy 7-stage SRS mastery cap
  - Speaking Studio, rolling conversation context, Mistake Memory analytics & neural map, Communication DNA
  - Transfer Lab 30-scenario engine & anti-fabrication objective merging, Communication Replay immutability & measured PCM waveforms
  - Vocabulary SM-2 SRS deck, Community moderation & DM ban, Subscriptions & honest finance, Verified idempotent gamification
  - IELTS examination engine, Writing Diary / Shadowing / Human Bridge labs, AI Provider Registry & Feature Flags
- **Storage Repository Tests (`src/services/storage/localRepository.test.ts`):**
  - End-to-end persistence for auth, onboarding, diagnostic, Academy lessons, Speaking Studio, Mistake Memory, and Transfer Lab idempotent XP.
- **Database Migration & Cloudflare Worker Parity Tests (`worker/workerParity.test.ts`, `worker/workerHardening.test.ts`):**
  - **Test #136:** Executes real SQLite D1 migrations `0001 -> 0002 -> 0003 -> 0004` against Node 22 `node:sqlite`, verifies exact table parity with canonical `schema.sql`, and verifies non-destructive rollbacks (`ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002`) preserve existing rows.
  - **Tests #137–145:** Full Worker parity for Auth recovery, Parts 06–12 AI & cloud state, R2 owner-scoped deletion, Vocabulary SRS, Community RBAC, Subscriptions & HMAC-SHA256 webhooks, Security Headers, Feature Flags, AI Providers, IELTS, Writing/Human Bridge, and Notifications.
  - **Test #146:** Separate Admin Application Worker parity — initial status, production fail-closed (`503`) without `ADMIN_BOOTSTRAP_SECRET`, invalid secret rejection (`403`), one-time `super_admin` provisioning (`201`), permanent lock (`409`), standard learner rejection (`403`), admin login (`200`), `/me` (`200`), and `/logout` revocation (`401`).
  - **Test #147 (4 subtests):** Worker hardening S6 (JWT fail-closed), S7 (strict CORS allowlist), S10 (D1 mic consent + MIME allowlist), and S11 (rate limit `429` + `Retry-After`).

---

## 2. Static, Dual-Build & Dependency Verification

```bash
# TypeScript strict typecheck (0 errors)
npm run lint

# Dual production builds: User Web App (dist/) + Separate Admin App (dist-admin/)
npm run build:all

# Dependency vulnerability audit (0 vulnerabilities across 273 packages)
bun audit

# Secret leakage scan across both production bundles
! grep -rnE "AIza[0-9A-Za-z_-]{35}|sk_live_|whsec_|re_[0-9A-Za-z]{20,}" dist/ dist-admin/
```

---

## 3. Live Express & Real Browser Verification

Verified live against `http://localhost:3000` using HTTP security checks and headless Chromium (`playwright-cli`) at desktop (`1440×900`) and mobile (`390×844`):
- **Learner Web App (`/` & `/app/*`):** Zero horizontal overflow (`overflowPx: 0`), zero application console errors across `/app`, `/app/learn`, `/app/speak`, `/app/improve`, `/app/progress`, `/app/transfer-lab`, `/app/replay`, `/app/vocabulary`, `/app/community`, `/app/achievements`, `/app/subscription`, `/app/ielts`, `/app/writing`, and `/app/settings`.
- **Separate Admin Application (`/admin.html`):**
  - Live Express HTTP checks: `GET /api/v1/admin/auth/status` (`200`, `bootstrapAvailable: true`) -> `POST /api/v1/admin/auth/bootstrap` (`201`) -> repeat bootstrap (`409`) -> `GET /api/v1/admin/auth/me` (`200`) -> `POST /api/v1/admin/auth/logout` (`200`) -> post-logout `/me` (`401`).
  - Browser E2E: One-Time Initial Super Admin Provisioning screen -> valid Super Admin creation -> standalone Admin Control Center (`SERVER-VERIFIED RBAC · SUPER_ADMIN`, live `Users (1)`, live `AI & API Providers`, live `Audit Log (7)` with `admin.bootstrap.claimed` entries) -> reload persistence via HttpOnly cookie -> `Sign Out` -> locked `Server-Verified Administrator Sign-In` screen -> mobile `390×844` zero overflow and zero application console errors.

---

## 4. Known Testing Boundaries (Honestly Disclosed)

- **Physical Microphone & Speaker Hardware:** Headless Linux lacks audio capture/output hardware; microphone recording (`MediaRecorder`), browser `SpeechRecognition`, and audible playback must be smoke-tested on a physical desktop/mobile device.
- **External Third-Party Providers:** Live Resend/Brevo email delivery, Google OAuth redirects, and live Stripe/SSLCommerz payment checkouts require live production credentials not stored in this sandbox.
- **Remote Cloudflare Staging/Production:** Live `wrangler` deployment and remote D1 execution must be run from an authorized Cloudflare account.
