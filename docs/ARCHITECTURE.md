# LINGUAVERSE AI — System Architecture

## 1. High-Level Topology (3-Application Architecture)

LINGUAVERSE AI is structured as three cleanly decoupled runtime surfaces sharing pure TypeScript domain engines (`src/domain/*`):

1. **Learner Web Application (`dist/` — Cloudflare Pages: `linguaverse-web`)**
   - Entry point: `index.html` -> `src/main.tsx` -> `src/App.tsx`
   - Build command: `npm run build` (`vite.config.ts`, bundling static `public/manifest.webmanifest` and `public/sw.js` into `dist/`).
   - Serves public landing (`/`), authentication (`/login`, `/register`, `/verify-email`, `/reset-password`), onboarding (`/onboarding`), 5-skill diagnostic (`/diagnostic`), and all authenticated learner workspaces (`/app`, `/app/learn`, `/app/speak`, `/app/improve`, `/app/progress`, `/app/transfer-lab`, `/app/replay`, `/app/vocabulary`, `/app/community`, `/app/achievements`, `/app/subscription`, `/app/ielts`, `/app/writing`, `/app/settings`).
2. **Separate Admin Application (`dist-admin/` — Cloudflare Pages: `linguaverse-admin`)**
   - Entry point: `admin.html` (`noindex, nofollow`) -> `src/admin-main.tsx` -> `src/AdminApp.tsx`
   - Build command: `npm run build:admin` (`vite.admin.config.ts`, emitting both `dist-admin/index.html` and `dist-admin/admin.html`).
   - Completely detached from `<LearnerShell>`: renders its own dedicated `AdminLoginPage` (supporting One-Time Initial Super Admin Provisioning and server-verified Admin Sign-In, with zero public admin registration) and standalone `AdminControlCenterPage` wired exclusively to server-verified `/api/v1/admin/*` endpoints.
   - Local development URL: `http://localhost:3000/admin.html` (and `/admin-portal` static mount in Express production mode).
3. **Edge / Full-Stack Backend API (Cloudflare Worker `worker/index.ts` + Local Express Parity `server.ts`)**
   - **Production Edge Runtime (`worker/index.ts`)**: Hono REST API deployed on Cloudflare Workers backed by:
     - **Cloudflare D1 (`DB`)**: Relational SQLite database managed via additive sequential migrations `0001`–`0004`.
     - **Cloudflare R2 (`AUDIO_BUCKET`)**: Private owner-scoped learner voice recording storage (enforcing server-side D1 consent and MIME/size caps).
     - **Cloudflare KV (`RATE_LIMIT_KV`, `SESSION_CACHE_KV`, `APP_CACHE_KV`)**: Edge sliding-window rate limiting and ephemeral caching.
   - **Local Development & Preview Parity Runtime (`server.ts`)**: Express + Vite middleware serving the same `/api/v1/*` and `/api/*` contracts, backed by `.data/*.json` stores for rapid local verification without requiring live Cloudflare credentials.

---

## 2. Shared Pure Domain Layer (`src/domain/`)

All business rules, scoring guardrails, scheduling algorithms, and security policies are implemented as pure, side-effect-free TypeScript modules tested directly with Node's native test runner (`node:test`):

- **Auth & Security**: `authSecurityEngine.ts`, `otpVerification.ts`, `securityPolicy.ts`, `adminBootstrapEngine.ts`, `paymentWebhookEngine.ts`
- **Core Learning & Intelligence**: `onboardingCatalog.ts`, `initialAssessmentEngine.ts`, `dashboardIntelligence.ts`, `academyEngine.ts`, `curriculumData.ts`
- **Speaking, Transfer & Replay**: `speakingScenarios.ts`, `speakingEvaluation.ts`, `speakingStudioEngine.ts`, `conversationContextEngine.ts`, `transferLabUniverseEngine.ts`, `communicationReplayEngine.ts`
- **Memory, DNA & Advanced Labs**: `mistakeAnalyticsEngine.ts`, `communicationDnaEngine.ts`, `vocabularyDeckEngine.ts`, `ieltsExamEngine.ts`, `advancedLearningLabsEngine.ts`
- **Community, Billing & Governance**: `communityModerationEngine.ts`, `subscriptionEntitlementsEngine.ts`, `gamificationEngine.ts`, `adminGovernanceEngine.ts`, `aiProviderRegistry.ts`, `cmsEngine.ts`

---

## 3. Data & Persistence Abstraction

- `src/services/apiBase.ts`: Resolves `VITE_API_BASE_URL` cleanly (`same-origin` in local Express dev, `include` cross-origin credentials when targeting a deployed Cloudflare Worker) and attaches ephemeral in-memory Bearer tokens (`src/services/sessionTokenMemory.ts`).
- `src/services/storage/`: Repository pattern (`LocalPersistenceRepository` for browser-local preview when `VITE_API_BASE_URL` is unset vs. `D1ApiPersistenceRepository` targeting Cloudflare Worker `/api/v1/*`).
- Separate Admin App (`src/services/adminPortalApi.ts`): Always communicates directly with server-side `/api/v1/admin/auth/*` and `/api/v1/admin/*` endpoints — never trusts client-side role state.

---

## 4. AI Orchestration & Honesty Boundaries

- **Server-Side Only**: All Gemini calls execute exclusively on the server (`server/gemini*.ts` and `worker/services/gemini.ts`). API keys never enter `dist/` or `dist-admin/`.
- **Model Routing & Failover**: Default primary `gemini-4-hydrogen` with automatic fallback to `gemini-3.1-flash-lite`; audio transcription via `gemini-3.5-transcribe`; unary WAV speech synthesis via `gemini-3.8-flash-lite-tts` — all configurable via the Admin AI & API Providers Control Center.
- **Anti-Fabrication Invariants**:
  - Single-attempt Academy lesson mastery strictly capped at `<= 45%`.
  - AI mistake syncing filtered at `>= 0.70` confidence.
  - Acoustic phoneme pronunciation scores are never fabricated from text transcripts.
  - Historical Communication Replay sessions are strictly read-only; opening or practicing never mutates transcripts or mints duplicate XP.
