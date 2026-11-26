# LINGUAVERSE AI

**Voice-first, evidence-based AI English learning & communication intelligence platform tailored for Bangla-speaking learners (`EN` + `বাংলা`).**

## Key Capabilities

1. **Bilingual-First Architecture (`EN` / `বাংলা`)**: Seamless interface language switching plus Bangla explanations contrasting Bangla L1 interference patterns against natural English.
2. **The Academy (`/app/learn`)**: Structured Pre-A1 to B2 courses with a 7-stage interactive Lesson Player (objectives, bilingual concept + contrast table, TTS audio examples at `0.75x`/`1.0x`, guided practice, independent writing, graded assessment, and spaced repetition scheduling that caps single-attempt mastery at `<= 45%`).
3. **AI Speaking Studio (`/app/speak`)**: 7 real-world modes, 5-level Pressure Ladder, browser `MediaRecorder` + Web Speech Recognition + text fallback, IndexedDB voice replay, and Gemini structured JSON evaluation (`/api/speaking/evaluate`).
4. **Mistake Memory & Communication DNA (`/app/improve`, `/app/progress`)**: Captures real errors from diagnostics, lessons, speaking, and transfer drills; runs targeted `"Fix This Mistake"` micro-drills; supports `"Report False Correction"` flagging; computes 5 independent Communication DNA dimensions only when `sampleSize >= 3`.
5. **Transfer Lab & Verified Gamification (`/app/transfer-lab`)**: Bridges recent lessons and recurring mistakes into unassisted real-world scenarios graded across a 4-dimension Gemini rubric (`/api/transfer/evaluate`), backed by an auditable, idempotent XP ledger.
6. **The Language Portal — Authentication Module (`/login`, `/register`, `/forgot-password`, `/verify-email`, `/reset-password`, `/auth/success`)**:
   - Split-screen futuristic portal with custom Three.js 3D Neural Communication Orb & soundwave rings (with automatic lightweight SVG fallback on mobile/reduced-motion/no-WebGL).
   - Full lifecycle: Sign In (Remember Me 30-day vs 24-hour TTL), Create Account with live Password Strength Meter & Terms modal, 6-digit SHA-256 OTP Email Verification with 10-minute expiry & 60-second resend cooldown, Anti-Enumeration Forgot Password, single-use server-validated Password Reset with session revocation, and Authentication Success celebration state.
   - Server-backed security endpoints (`/api/v1/auth/csrf`, `/providers`, `/register`, `/login`, `/me`, `/logout`, `/verify-email`, `/forgot-password`, `/reset-password/validate`, `/reset-password`) using Node `crypto.scrypt` salted password hashing, `HttpOnly` `SameSite=Lax` cookies, CSRF double-submit protection, sliding-window rate limiting, and honest Google OAuth provider availability checks.
7. **IELTS & English Examination Preparation (`/app/ielts`)**: Original practice tasks across Speaking Parts 1–3, Writing Task 1/2 & General Training Letter, Reading, and Listening with timers, word counts, deterministic objective grading, live Gemini rubric estimates, and mandatory Exam Truth Policy disclaimers.
8. **Writing Intelligence, Shadowing & Human Bridge Labs (`/app/writing`)**:
   - **Writing & Language Diary Studio**: 8 writing modes, verbatim original text preservation alongside learner rewrites, and Gemini bilingual writing intelligence feedback.
   - **Japanese-Inspired Shadowing & Chunk Lab**: Curated high-frequency chunks with speech playback and transparent text-overlap practice feedback (never fabricated acoustic phoneme scores).
   - **Human Communication Bridge**: Real-world offline English conversation reflection logs strictly tagged `User-Reported Offline Activity`.
9. **Evidence-Based Progress, Plateau Recovery & Notifications (`/app/progress`, `/app/settings`)**: Learning Plateau & Recovery Signal detection, Independent Communication Readiness tracking, and server-persisted daily reminder schedules with quiet hours and platform announcements.
10. **Admin Control Center & Privacy Sovereignty (`/admin`, `/app/settings`)**:
   - Server-verified RBAC-guarded tabs: **Overview**, **Website CMS**, **Users** (role/status management, session revocation on suspend, confirmation-gated account deletion), **Curriculum Builder**, **AI Ops**, **AI & API Providers** (12-provider masked registry, runtime model/timeout/retry/quota controls, live health checks, write-only local rotation + Cloudflare `wrangler secret put` commands), **Reported Mistakes**, **Moderation & Appeals**, **Subscriptions & Support**, **System & Flags** (interactive Maintenance Mode & feature flags), **Health & Broadcasts**, and **Immutable Audit Log**.
   - Granular privacy consent switches (**Mic Recording Storage**, **AI Telemetry Logging**), one-click **JSON Learning Data Export**, and **Verified Recordings & Account Deletion**.

For the complete Express + Cloudflare Worker endpoint reference, see [`docs/API.md`](./docs/API.md). For Cloudflare deployment and rollback steps, see [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## Local Development

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env (or AI Studio Secrets)
npm run dev
```

The Express + Vite dev server runs on `http://localhost:3000`.

### Verification Commands

```bash
# TypeScript type-check
npm run lint

# Full automated test suite (Domain engines, LocalPersistenceRepository, SQLite D1 Migrations 0001-0004 & Rollbacks, Worker Parity & Security Hardening)
npx tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts

# Production SPA build
npm run build
```

---

## Cloudflare Production Deployment (Pages + Workers + D1 + R2 + KV)

This repository includes production-ready Cloudflare infrastructure configuration:

- **`wrangler.toml`**: Configures Cloudflare Pages (`dist/`), Workers API, D1 (`DB`), R2 (`AUDIO_BUCKET`), and KV (`LINGUAVERSE_KV`, `SESSION_KV`, `RATE_LIMIT_KV`).
- **`migrations/` & `schema.sql`**: Sequential additive SQLite migrations (`0001` → `0002` → `0003` → `0004`) with non-destructive rollback scripts (`ROLLBACK_0004`, `ROLLBACK_0003`, `ROLLBACK_0002`) matching canonical `schema.sql` 100%.
- **`src/services/apiClient.ts` & `src/services/storage/d1ApiRepository.ts`**: Cleanly switch the entire frontend from local persistence to live `/api/v1/*` Cloudflare Workers endpoints by setting `VITE_API_BASE_URL` with zero UI code rewrites.

### Deployment Steps (Run Manually by Operator)

1. **Create Cloudflare Resources**
   ```bash
   npx wrangler d1 create linguaverse-db
   npx wrangler r2 bucket create linguaverse-audio
   npx wrangler kv namespace create LINGUAVERSE_KV
   npx wrangler kv namespace create SESSION_KV
   npx wrangler kv namespace create RATE_LIMIT_KV
   ```
   Copy the generated IDs into `wrangler.toml`.

2. **Back Up & Apply Sequential D1 Migrations**
   ```bash
   npx wrangler d1 export linguaverse-db --remote --output=./backup-linguaverse-db.sql
   npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0001_initial_schema.sql
   npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0002_parts06_12_parity.sql
   npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0003_p3_community_vocab_billing.sql
   npx wrangler d1 execute linguaverse-db --remote --file=./migrations/0004_prd61_examinations_labs_providers.sql
   ```

3. **Configure Production Secrets (Never Commit Keys)**
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put JWT_SIGNING_SECRET
   ```

4. **Deploy Worker API & Pages Frontend**
   ```bash
   npx wrangler deploy --env production
   VITE_API_BASE_URL=https://api.linguaverse.ai npm run build
   npx wrangler pages deploy dist --project-name=linguaverse-ai
   ```

---

## Security & Privacy Checklist
- **No client-side secrets**: Gemini API calls are proxied exclusively through server/Worker routes (`/api/speaking/evaluate`, `/api/transfer/evaluate`).
- **Hardened Authentication**: Passwords are hashed server-side with `crypto.scrypt` + random salt and compared with `crypto.timingSafeEqual`; sessions use `HttpOnly` `SameSite=Lax` cookies; mutating `/api/v1/auth/*` routes enforce CSRF double-submit tokens and sliding-window rate limits; password reset tokens are SHA-256 hashed, 15-minute expiring, single-use, and revoke all prior sessions on completion.
- **Honest External Providers**: Google OAuth is exposed only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured on the server; local development email/OTP preview banners appear only when no transactional email provider key (`RESEND_API_KEY` / `EMAIL_PROVIDER_API_KEY`) is configured.
- **RBAC Enforcement**: `/admin` enforces granular role grants (`admin`, `content_manager`, `ai_ops`, `learner` blocked). Production Workers validate signed JWT claims + D1 `users.role` on every `/api/v1/admin/*` route.
- **Consent-First Audio & Telemetry**: Audio blobs are persisted to IndexedDB/R2 only when `storeMicRecordings` is enabled; AI usage telemetry is recorded only when `logAiEvaluations` is enabled.
- **Right to Portability & Erasure**: Learners can export a full structured JSON archive or trigger verified cleanup of all voice recordings and account records from `/settings`.
- **Anti-Farming XP Integrity**: `xp_events` enforces `UNIQUE(user_id, idempotency_key)` so repeating the same action never mints duplicate XP.
