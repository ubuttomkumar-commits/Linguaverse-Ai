# LINGUAVERSE AI — Existing Project Audit (Phase 1 Baseline)

**Audit Date:** 2026-11-25  
**Target Environment Inspected:** Workspace `/app/applet` (Existing LINGUAVERSE AI full-stack React/TypeScript/Vite + Express Dev Server + Cloudflare Workers/Hono/D1/R2/KV repository)

---

## 1. Connected Resources & Permissions Inspection

| Resource | Status in Container | Observed Evidence |
| :--- | :--- | :--- |
| **Git / GitHub Repository** | **BLOCKED (Not Mounted)** | `git rev-parse --is-inside-work-tree` returned `fatal: not a git repository (or any of the parent directories): .git`. `gh` CLI is not installed, and no `GITHUB_*` / `GH_*` credentials exist in environment variables. Remote branch inspection, commits, and pushes cannot run from this container. |
| **Cloudflare Environment** | **BLOCKED (No CLI / Creds)** | `which wrangler` returned not found. Zero `CLOUDFLARE_*` / `CF_*` environment variables exist. `wrangler.toml` contains placeholder D1 (`00000000-0000-0000-0000-000000000000`) and KV IDs (`0000...0001`–`0006`). Live Cloudflare account inspection, D1 remote migration execution, and Worker/Pages deployment cannot execute from this container. |
| **Gemini AI Provider** | **CONFIGURED (Server-Side)** | Server-side Gemini endpoints (`/api/speaking/health`, `/api/transfer/health`, `/api/v1/replay/health`, etc.) are wired via `@google/genai` (Express) and native `fetch` REST (Cloudflare Worker) using `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-3.5-transcribe`, and `gemini-3.8-flash-lite-tts`. |
| **Transactional Email (Resend / Brevo)** | **UNCONFIGURED LOCALLY** | Neither `RESEND_API_KEY` nor `EMAIL_PROVIDER_API_KEY` is set in this container; honest local-dev OTP preview mode is active while production Worker code supports live Resend/Brevo delivery. |
| **Payment Gateways (Stripe / SSLCommerz / Paddle)** | **UNCONFIGURED (Pending Merchant Setup)** | No payment gateway secret or merchant account is connected; subscription checkout intents honestly record `pending_provider` with `$0` fabricated revenue. |
| **Headless Browser & Test Runtime** | **AVAILABLE** | Node.js, `bun`, `npx tsx --test`, `vite build`, `tsc --noEmit`, and `playwright-cli` (headless Chromium) are installed and operational. |

---

## 2. Authoritative PRD Comparison & Discrepancy Disclosure

1. **Supplied PRD v6.1 Truncation**:
   - The authoritative PRD text supplied in the prompt (`LINGUAVERSE AI MASTER PRODUCT REQUIREMENTS DOCUMENT (PRD) Version: 6.1 — CONSOLIDATED MASTER EDITION`, saved at `/public/assets/aistudio/Paste_November_26__2026_-_1_48AM_85ea364a`) ends mid-sentence at **Section 2.4 (`- Performance ]`)**.
   - Sections 3+ of PRD v6.1 were not present in the paste.
2. **Repository & Previous PRD Cross-Reference**:
   - No `docs/PRD.md` exists in the repository; active documentation consists of `STATE.md`, `README.md`, and `DEPLOYMENT.md`.
   - The workspace also retains the complete **PRD v5.0** specification (`/public/assets/aistudio/Paste_November_25__2026_-_11_15PM_068561ef`, Sections 0–18.6).
   - **Audit Governance Rule Applied**: Sections 0–2.4 are audited directly against **PRD v6.1**, while Sections 3–18 and Execution Directives 4A–4F, 5–9 are audited against **both** the Master Execution Directive in this prompt and the complete PRD v5.0 baseline without silently omitting any requirement.

---

## 3. Existing Application Architecture Inventory

- **Frontend (`src/`)**: React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + React Router v7 + Three.js (`TransferLabCanvas3D`, `CommunicationDnaCanvas3D`, `ThreeLanguageGlobe`, `ThreeLanguagePortal`) + Motion + Lucide icons.
  - **Public Routes**: `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/success`.
  - **Authenticated Learner Routes**: `/onboarding`, `/diagnostic`, `/app`, `/app/learn`, `/app/learn/course/:courseId`, `/app/learn/:lessonId`, `/app/speak`, `/app/improve`, `/app/progress`, `/app/transfer-lab`, `/app/replay`, `/app/vocabulary`, `/app/community`, `/app/achievements`, `/app/subscription`, `/app/settings`.
  - **Protected Admin Routes**: `/admin`, `/app/admin` (9 tabs: Overview, CMS, Users, Curriculum, AI Ops, Reported Mistakes, Moderation & Appeals, Subscriptions & Support, Audit Log).
- **Local Dev Backend (`server.ts`, `server/`)**: Express + Vite middleware on port 3000 with JSON persistence (`.data/auth-store.json`, `.data/cms-store.json`, `.data/p3-store.json`), scrypt password hashing, HttpOnly cookies, constant-time CSRF double-submit + Origin validation, per-user rate limiting, and server-side Gemini services (`geminiAcademyAssist`, `geminiMistakeCoach`, `geminiDnaCoach`, `geminiTransferLab`, `geminiReplayCoach`).
- **Cloudflare Production Backend (`worker/`, `schema.sql`, `migrations/`, `wrangler.toml`)**: Hono `/api/v1/*` Worker with D1, R2 (`AUDIO_BUCKET`), and KV (`LINGUAVERSE_KV`, `SESSION_KV`, `RATE_LIMIT_KV`).
  - Sequential additive migrations: `0001_initial_schema.sql`, `0002_parts06_12_parity.sql` (+ `ROLLBACK_0002`), `0003_p3_community_vocab_billing.sql` (+ `ROLLBACK_0003`), matching canonical `schema.sql` 100%.
- **CI/CD**: `.github/workflows/ci-cd.yml` running typecheck, unit/Worker tests, production build, `dist/` secret scan, and gated Cloudflare D1 + Worker + Pages deployment.
- **Baseline Automated Verification (Pre-Changes)**:
  - `npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts`: **155/155 PASS**
  - `npm run lint` (`tsc --noEmit`): **0 errors**
  - `npm run build` (`vite build`): **PASS**
  - `bun audit`: **0 vulnerabilities** (272 packages)

---

## 4. Real Gaps Identified in Phase 1 Audit (Actionable in This Workspace)

1. **PWA Compliance Missing (`PRD v6.1 Header: Responsive Web Application / PWA`)**:
   - No `vite-plugin-pwa`, no Web App Manifest, no PNG icons (`192x192`, `512x512`, `maskable`, `180x180 apple-touch-icon`), no in-app `PWAInstallButton`, and no `OfflineIndicator`.
2. **Stale Dashboard Module Cards & Missing Interactive Communication Improvement Loop (`Prompt §5`, `PRD §1.5`)**:
   - `DashboardModulePreviews.tsx` still displayed obsolete "Vocabulary flashcard deck not built yet" and "Community · Planned Module" cards even though `/app/vocabulary` and `/app/community` are live.
   - No interactive 8-step **Communication Improvement Loop** (`DETECT → EXPLAIN → PERSONALIZE → PRACTICE → TRANSFER → RETEST → UPDATE → REPEAT`) visualization existed inside the authenticated learner Command Center (`/app`).
3. **Reading, Listening & Writing Intelligence Academy Courses Missing (`Prompt §4A`, `PRD §8.2`)**:
   - Existing Academy curriculum (`src/domain/curriculumData.ts`) had 3 courses covering Grammar, Vocabulary, Speaking, and Practical Communication, leaving Reading, Listening, and Writing with `0` courses.
4. **Admin System Configuration Endpoints & UI Missing (`Prompt §4E`, `PRD §16`)**:
   - Although `system_settings` already existed in `schema.sql` (`0001_initial_schema.sql`), neither Express nor Cloudflare Worker exposed `GET/PUT /api/v1/admin/system-settings`, and `AdminControlCenterPage.tsx` lacked a System Configuration tab.
5. **Payment Webhook Verification Endpoint Missing (`Prompt §4F & §7`, `PRD §17.3`)**:
   - Subscription checkout intents and invoices existed, but there was no cryptographically verified HMAC-SHA256 webhook handler (`POST /api/v1/billing/webhooks/:provider`) with replay/idempotency protection, payment failure handling, cancellation, and refund lifecycle updates.
6. **Audit Documentation Suite Missing (`Prompt §3`)**:
   - `audit/PRD-COMPLIANCE-MATRIX.md`, `audit/EXISTING-PROJECT-AUDIT.md`, `audit/IMPLEMENTATION-PLAN.md`, and `audit/TEST-EVIDENCE.md` did not yet exist.
