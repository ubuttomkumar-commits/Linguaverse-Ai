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
     - **Cloudflare D1 (`DB`)**: Relational SQLite database managed via additive sequential migrations `0001`–`0006` (`0005_performance_indexes.sql`, `0006_global_query_indexes.sql`).
     - **Cloudflare R2 (`AUDIO_BUCKET`)**: Private owner-scoped learner voice recording storage (enforcing server-side D1 consent and MIME/size caps).
     - **Cloudflare KV (`RATE_LIMIT_KV`, `SESSION_KV`, `LINGUAVERSE_KV`)**: Edge sliding-window rate limiting, per-account failed-login lockouts, and read-through public CMS/status/overlay caching with instant Admin invalidation.
     - **Cloudflare Smart Placement (`[placement] mode = "smart"`)**: Enabled in `wrangler.toml` for both `[env.staging]` and `[env.production]` so Worker execution is routed closer to the D1 primary database, minimizing multi-query database round-trip latency across global regions.
   - **Local Development & Preview Parity Runtime (`server.ts`)**: Express + Vite middleware serving the same `/api/v1/*` and `/api/*` contracts, backed by `.data/*.json` stores for rapid local verification without requiring live Cloudflare credentials.

---

## 2. Shared Pure Domain Layer (`src/domain/`)

All business rules, scoring guardrails, scheduling algorithms, realtime sync invariants, and security policies are implemented as pure, side-effect-free TypeScript modules tested directly with Node's native test runner (`node:test`):

- **Auth & Security**: `authSecurityEngine.ts`, `otpVerification.ts`, `securityPolicy.ts`, `adminBootstrapEngine.ts`, `paymentWebhookEngine.ts`
- **Core Learning & Intelligence**: `onboardingCatalog.ts`, `initialAssessmentEngine.ts`, `dashboardIntelligence.ts`, `academyEngine.ts`, `curriculumData.ts`
- **Speaking, Transfer & Replay**: `speakingScenarios.ts`, `speakingEvaluation.ts`, `speakingStudioEngine.ts`, `conversationContextEngine.ts`, `transferLabUniverseEngine.ts`, `communicationReplayEngine.ts`
- **Memory, DNA & Advanced Labs**: `mistakeAnalyticsEngine.ts`, `communicationDnaEngine.ts`, `vocabularyDeckEngine.ts`, `ieltsExamEngine.ts`, `advancedLearningLabsEngine.ts`
- **Community, Billing & Governance**: `communityModerationEngine.ts`, `subscriptionEntitlementsEngine.ts`, `gamificationEngine.ts`, `adminGovernanceEngine.ts`, `aiProviderRegistry.ts`, `cmsEngine.ts`
- **Realtime & Client Query Resilience**: `realtimeSyncEngine.ts` (exponential backoff with bounded jitter, FIFO event deduplicator, monotonic sequence ordering, heartbeat watchdog), `src/services/queryCache.ts` (TTL/SWR deduplicated client cache, timeout wrapper, optimistic rollback helper)

---

## 3. Data & Persistence Abstraction

- `src/services/apiBase.ts`: Resolves `VITE_API_BASE_URL` cleanly (`same-origin` in local Express dev, `include` cross-origin credentials when targeting a deployed Cloudflare Worker) and attaches ephemeral in-memory Bearer tokens (`src/services/sessionTokenMemory.ts`).
- `src/services/storage/`: Repository pattern (`LocalPersistenceRepository` dynamically lazy-loaded only when `VITE_API_BASE_URL` is unset vs. `D1ApiPersistenceRepository` targeting Cloudflare Worker `/api/v1/*`).
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

---

## 5. Global Performance, Realtime SSE & Durable Objects Upgrade Path

- **Frontend Perceived Speed & Strict Portal Isolation**:
  - Inversion-of-control route chunk prefetcher (`src/utils/routePrefetch.ts`) registers all 24 lazy Learner route loaders inside `src/App.tsx` only, ensuring `dist-admin/` never pulls Learner pages or Three.js chunks (`admin-*.js` stays `26.17 kB` gzip).
  - Hover/focus/touch prefetching, zero-CLS `<WorkspaceRouteSkeleton />`, `Cmd/Ctrl+K` keyboard workspace search, optimistic notification reads with rollback, and `localStorage`-persisted sidebar state inside `LearnerShell.tsx`.
  - Mobile & low-end GPU optimizations in `src/index.css`: `touch-action: manipulation`, safe-area inset bottom bar (`.pb-safe`), `content-visibility: auto` (`.lv-defer-section`), and reduced mobile `backdrop-filter` blur (`8px` below `640px`).
- **Backend Query Parallelization & Indexed D1 Execution**:
  - `buildHydratedAuthPayload()` in `worker/index.ts` executes all 6 learner hydration queries in parallel via `Promise.all` with explicit column projections (replacing 6 sequential round-trips and `SELECT *`).
  - `GET /api/v1/admin/users` pushes search filtering (`q`) and cursor pagination (`limit`, `beforeCreatedAt`) down to parameterized SQL; `GET /api/v1/community/posts` uses cursor pagination (`before`, `limit`) with post-scoped comment queries (`WHERE post_id IN (...)`).
  - Migration `0006_global_query_indexes.sql` adds 10 composite covering indexes verified via SQLite `EXPLAIN QUERY PLAN`.
- **Authenticated Realtime Architecture (Current SSE + Durable Objects Blueprint)**:
  - **Active Transport**: Authenticated streaming-`fetch` SSE (`GET /api/v1/realtime/events`) enforced with `401` unauthenticated rejection and strict `Cache-Control: no-store, no-cache, must-revalidate, private`. Express (`server/prd61Routes.ts`) runs an in-memory `EventEmitter` pub-sub hub with 25s heartbeats and live broadcast/maintenance fan-out; Cloudflare Worker (`worker/routes/prd61Routes.ts`) streams authenticated snapshot + unread notifications + active maintenance events cleanly without holding long-lived Worker isolate timers.
  - **Client Lifecycle (`src/hooks/useRealtimeEvents.ts`)**: Uses `realtimeSyncEngine.ts` for exponential backoff with jitter, bounded event deduplication, sequence ordering, automatic pause when `offline` or tab hidden (`visibilitychange`), immediate stop on `401`/`403`, and `AbortController` teardown on logout/unmount.
  - **Cloudflare Durable Objects Upgrade Path (Future Live Fan-Out)**: Once Durable Objects are enabled on the Cloudflare account, bind a `REALTIME_HUB` Durable Object namespace (`[[durable_objects.bindings]]` + `[[migrations]]` in `wrangler.toml`) keyed by tenant/room (`global:system` and `user:<userId>`) using the Hibernatable WebSockets / SSE API. Because `useRealtimeEvents.ts` and `realtimeSyncEngine.ts` already enforce sequence numbers, deduplication, and `Last-Event-ID` / Bearer auth, upgrading from stateless Worker SSE to Durable Objects fan-out requires zero frontend protocol changes.

