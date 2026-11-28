# Changelog — LINGUAVERSE AI

All notable changes verified in the workspace and live deployments are documented here.

## [Live Production & Staging Release — SW Registration & Prod Minification Fix] - 2026-11-28

### Fixed During Live Staging Verification
- **Deterministic Production Builds (`vite.config.ts`, `vite.admin.config.ts`, `package.json`)**: Enforced `process.env.NODE_ENV = 'production'` when `command === 'build'` and added `--mode production` to `build` / `build:admin` scripts so container `NODE_ENV=development` cannot accidentally produce React dev builds or strip Service Worker registration. Cut `vendor-react` by `45%` (`470.39 kB` -> `257.68 kB`, `81.89 kB` gzip) and Learner entry `index.js` from `369.65 kB` -> `307.30 kB` (`80.91 kB` gzip).
- **Immediate Service Worker Registration (`src/utils/pwaRuntime.ts`)**: Checked `document.readyState === 'complete'` before attaching a `load` listener so fast ES module loads always register `/sw.js` (`linguaverse-shell-v4`) and upgrade returning visitors.

### Deployed & Verified Live
- **GitHub `main`**: Pushed `9d4fc8dd8366d43892d11af54859cf639d2e191b` (`9d4fc8d`); GitHub Actions CI run `#46124166122` passed (`completed / success`).
- **Cloudflare Staging**: Applied D1 migrations `0005`–`0006` on `linguaverse-db-staging`; deployed Worker `linguaverse-ai-api-staging` (`4e404245-e170-4d5b-89ce-c4afc061d6ad`), Learner Pages `linguaverse-web` (`9d3b3bcf` -> `https://staging.linguaverse-web-1s7.pages.dev`), and Admin Pages `linguaverse-admin` (`50659b66` -> `https://staging.linguaverse-admin.pages.dev`).
- **Cloudflare Production**: Applied D1 migrations `0001`–`0006` + reference seed on `linguaverse-db`; deployed Worker `linguaverse-ai-api-prod` (`d5d22bdd-01ee-466e-9191-c96929af7a60`, `CORS_ALLOWED_ORIGIN` + `JWT_SIGNING_SECRET`), Learner Pages `linguaverse-web` (`6c24a980` -> `https://linguaverse-web-1s7.pages.dev`), and Admin Pages `linguaverse-admin` (`15c9740b` -> `https://linguaverse-admin.pages.dev`).
- **Live Headless Chromium Verification**: Both Staging and Production passed homepage render, `5×` reloads non-blank, simulated `{"config":null}` CMS resilience, `/login` & `/register`, `EN ⇄ বাংলা` switch, active `/sw.js` (`linguaverse-shell-v4`, `controlled: true`), `HTTP 200` asset MIME types, Admin Portal `#admin-root` render, and `0` uncaught `pageErrors`.

---

## [Critical Production Blank-Screen Recovery, SW v4 & Boot Watchdog Hardening] - 2026-11-27

### Root Cause Reproduced on Live Staging (`https://staging.linguaverse-web-1s7.pages.dev`)
- Confirmed live in headless Chromium: first visit renders the landing page from synchronous default CMS state, then collapses into a blank dark navy (`#05091F`) screen when stale deployed Staging Worker (`linguaverse-ai-api-staging`) responds `{"config":null}` to `GET /api/v1/cms/public` and stale deployed bundle (`index-BNuKe6hs.js`, pre-ErrorBoundary) throws `TypeError: Cannot read properties of null (reading 'sections')` (`~11.6s` cold, `~317ms` on reload).

### Added & Hardened
- **Pure Boot/Chunk Recovery Engine (`src/domain/bootRecovery.ts`, `src/domain/bootRecovery.test.ts`)**: Added pure chunk/CSS/module-load failure detector and 30s anti-loop auto-reload guard (`2` new unit tests).
- **Service Worker v4 Rolling-Deploy Protection (`public/sw.js`, `src/utils/pwaRuntime.ts`, `src/domain/pwaCompliance.test.ts`)**: Upgraded caches to `linguaverse-shell-v4` / `linguaverse-fonts-v4`, prioritized `request.mode === 'navigate'` (`cache: 'no-cache'` online) ahead of `PRECACHE_URLS`, rejected Cloudflare Pages HTML fallback served for removed hashed `/assets/*` chunks (`503` + `X-LV-Chunk-Mismatch: 1` + stale `/` purge), added `PURGE_ALL_CACHES`, `updateViaCache: 'none'`, and 5-minute tab-visibility update checks.
- **Zero-JS HTML Boot Watchdogs (`index.html`, `admin.html`, `src/main.tsx`, `src/admin-main.tsx`)**: Added pure-DOM inline boot watchdogs recovering from top-level module `<script>` load failures or 12s stalls before React mounts (`markAppBootMounted()` resets reload guards after 5s of stable mount).
- **Isolated Feature & Section Error Boundaries (`src/components/common/RootErrorBoundary.tsx`, `src/components/landing/HeroCommunicationCore.tsx`, `src/pages/LandingPage.tsx`)**: Added `SafeFeatureBoundary` isolating lazy `<ThreeLanguageGlobe />` (seamless fallback to `GlobeStaticFallback`) and optional non-hero landing sections, plus global `unhandledrejection` chunk-error recovery.
- **Public CMS Timeout, Explicit Base Paths & CI Sync (`src/services/cmsApi.ts`, `vite.config.ts`, `vite.admin.config.ts`, `.github/workflows/ci-cd.yml`)**: Added 10s `AbortController` timeout to `fetchPublicCmsConfig()`, explicit `base: '/'` in both Vite configs, and synced CI migration labels to `0001 -> 0006`.

### Verified
- `npm run lint`: **0 errors** · `npm test`: **206 / 206 PASS** (13 suites) · `npm run verify:db`: **PASS** (`6` migrations, `63` tables, `100%` parity)
- `npm run build:all`: **PASS** (`dist/` + `dist-admin/`) · `bun audit`: **0 vulnerabilities (273 packages)** · Bundle secret scan: **clean**
- `npx wrangler deploy --env staging|production --dry-run`: **PASS** (`1011.84 KiB` / `203.25 KiB` gzip, `0` warnings)
- `node scripts/smoke-test-deployment.mjs`: **6 / 6 PASS**
- Headless Chromium Scenarios **A–M** on built `dist/`: **13 / 13 PASS** (5× reloads non-blank, simulated `{"config":null}` + `500` API non-blank, slow network non-blocking, blocked entry JS recovery UI verified, `EN ⇄ বাংলা` verified, mobile `390×844` `0px` overflow + mobile menu verified, `200 OK` valid MIME types, `0` uncaught page errors).

---

## [Unreleased — Global Ultra Performance, Realtime SSE & Multi-Device Optimization] - 2026-11-27

### Added & Optimized
- **Client SWR/TTL Query Cache, Request Deduplication & Optimistic Rollback (`src/services/queryCache.ts`, `src/domain/queryCache.test.ts`, `src/services/prd61Api.ts`)**:
  - Added pure `ClientQueryCache` (TTL, stale-while-revalidate, in-flight deduplication, prefix invalidation), `fetchWithTimeout` (12s `AbortController` guard on all PRD61 API calls), and `runOptimisticMutation` with automatic rollback on server error.
  - Applied deduplicated TTL/SWR caching to `fetchPublicSystemStatus` (60s TTL / 120s SWR) and `fetchLearnerNotifications` (30s TTL / 60s SWR), cleared cleanly on logout.
- **Discord-Inspired Instant Navigation & Mobile Ergonomics (`src/utils/routePrefetch.ts`, `src/components/common/WorkspaceSkeleton.tsx`, `src/App.tsx`, `src/components/layout/LearnerShell.tsx`, `src/index.css`)**:
  - Implemented inversion-of-control route chunk prefetcher registered in `App.tsx` (keeping `dist-admin/` 100% isolated from Learner chunks and Three.js) triggered on hover, keyboard focus, and touch across sidebar, drawer, search, and mobile bottom nav links.
  - Added zero-CLS `<WorkspaceRouteSkeleton />` for lazy `<Suspense>` transitions, `Cmd/Ctrl+K` quick-search focus with `ArrowDown`/`ArrowUp`/`Enter` keyboard navigation, `localStorage`-persisted sidebar collapse state, optimistic notification read/read-all updates with rollback, `pb-safe` safe-area bottom nav, `44px` (`h-11 w-11`) mobile menu touch target, `touch-action: manipulation`, `.lv-defer-section` (`content-visibility: auto`), and reduced mobile `backdrop-filter` blur (`8px` below `640px`).
- **Authenticated Realtime SSE Architecture (`src/domain/realtimeSyncEngine.ts`, `src/domain/realtimeSyncEngine.test.ts`, `src/hooks/useRealtimeEvents.ts`, `server/prd61Routes.ts`, `worker/routes/prd61Routes.ts`)**:
  - Added pure `realtimeSyncEngine` (exponential backoff + jitter, bounded FIFO deduplicator, monotonic sequence ordering, heartbeat watchdog) and authenticated streaming-`fetch` `useRealtimeEvents` hook (works across Cloudflare Pages → Workers origins with HttpOnly cookies + Bearer tokens, pauses when offline/tab hidden, stops on `401`/`403`, cleans up on logout/unmount).
  - Implemented authenticated `GET /api/v1/realtime/events` (`401` unauth, `200 text/event-stream`, strict `no-store, private`) across Express (with live `EventEmitter` pub-sub for admin broadcasts & maintenance mode changes + 25s heartbeats) and Cloudflare Worker (stateless snapshot/event stream), plus documented Durable Objects upgrade path in `docs/ARCHITECTURE.md`.
- **D1 Query Parallelization, SQL Pushdown, Cursor Pagination & Migration `0006` (`worker/index.ts`, `worker/routes/p3CommunityVocabBillingRoutes.ts`, `migrations/0006_global_query_indexes.sql`, `db/rollbacks/ROLLBACK_0006_global_query_indexes.sql`, `schema.sql`, `scripts/verify-d1-migrations.mjs`)**:
  - Parallelized `buildHydratedAuthPayload()` (`6` sequential D1 queries → `1` parallel `Promise.all` batch with explicit column projections, zero `SELECT *`).
  - Added parameterized SQL search pushdown (`q`) + cursor pagination (`limit`, `beforeCreatedAt`) to `GET /api/v1/admin/users` and cursor pagination (`before`, `limit`) + post-scoped `IN (...)` comment queries to `GET /api/v1/community/posts`.
  - Added 10 strictly additive composite indexes in `migrations/0006_global_query_indexes.sql` + non-destructive rollback, verified via real SQLite `EXPLAIN QUERY PLAN` assertions.
- **Cloudflare Smart Placement (`wrangler.toml`)**:
  - Enabled `[env.staging.placement] mode = "smart"` and `[env.production.placement] mode = "smart"` to route Worker execution closer to D1.

### Verified
- `npm run lint` (`tsc --noEmit`): **0 errors**
- `npm run verify:db`: **PASS** (`6` forward migrations `0001`–`0006`, `63` tables, `100%` parity, rollback verified)
- `npm test`: **204 / 204 PASS** (13 suites, including `queryCache.test.ts`, `realtimeSyncEngine.test.ts`, and `workerParity.test.ts` `EXPLAIN QUERY PLAN` + SSE + cursor pagination tests)
- `npm run build:all`: **PASS** (`dist/assets/index-*.js` `366.88 kB` / `86.45 kB` gzip; `dist-admin/assets/admin-*.js` `96.35 kB` / `26.17 kB` gzip, `0` Three.js leakage, `0` warnings)
- `npx wrangler deploy --env staging|production --dry-run`: **PASS** (`1011.84 KiB` / `203.25 KiB` gzip, Smart Placement accepted, `0` warnings)
- `node scripts/smoke-test-deployment.mjs`: **6 / 6 PASS**
- Local concurrent load benchmark (400 reqs @ 20 concurrency): `/api/v1/curriculum/overlay` **1,498.4 RPS** (`p95 11.72ms`), `/api/v1/system/status` **1,222.4 RPS** (`p95 15.36ms`), `/api/v1/cms/public` **1,064.2 RPS** (`p95 17.15ms`), `0` errors, post-load `/api/health` recovery `1.14ms`.
- Headless Chromium (`playwright-cli`): **`0px` horizontal overflow** across all **12 viewports** (`320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440, 1920` + mobile landscape `844×390`) on Learner PWA and 4 viewports on Separate Admin App; mobile CWV `TTFB 68.8ms`, `FCP/LCP 148ms`, `CLS 0.044`; interactive click-to-paint latency `50.8ms`; live authenticated SSE `200 text/event-stream` with `connected` frame verified.

---

## [Unreleased — Full Project Autopsy, Security Hardening & Parity Repair] - 2026-11-27

### Security & Parity Fixes Discovered During Complete 298-File Audit
- **Administrator RBAC Privilege Escalation & Super Admin Protection (`worker/index.ts`, `server/authStore.ts`, `server/prd61Routes.ts`)**:
  - Blocked regular `admin` accounts from promoting themselves or other users to `super_admin` or modifying, suspending, or deleting an existing `super_admin` (`403 SUPER_ADMIN_REQUIRED`).
  - Added strict allowlist validation for `role` and `accountStatus` (`400` instead of unhandled SQLite `CHECK` `500`), blocked self-demotion and self-suspension (`400`), and enforced immediate active-session revocation when an admin is demoted back to `learner`.
- **Per-Account Brute-Force Lockout & Admin Auth Rate Limiting (`worker/index.ts`, `worker/routes/parts06To12Routes.ts`, `worker/routes/prd61Routes.ts`, `server/authStore.ts`, `server/prd61Routes.ts`, `server.ts`)**:
  - Added IP rate limiting to Worker `POST /api/v1/admin/auth/bootstrap` (`5/min`) and `POST /api/v1/admin/auth/login` (`10/min`).
  - Added hashed per-account failed-login lockout (`5` consecutive failed attempts -> `15 min` temporary lockout returning `429 ACCOUNT_LOCKED` + `Retry-After`, cleared on successful login) across both Worker (`RATE_LIMIT_KV`) and Express (`.data/auth-store.json`) for learner and admin sign-in endpoints.
- **Protocol-Relative Open Redirect Guard (`src/domain/cmsEngine.ts`)**: Hardened `sanitizeUrl()` to reject `//...` protocol-relative URLs while preserving safe `/...` internal routes and `#...` hash anchors.
- **Express System Health Migration Parity (`server/prd61Routes.ts`)**: Synced `GET /api/v1/admin/system-health` `migrationsReady` to include `0005_performance_indexes.sql` matching Worker parity.

### Verified
- `npm run lint`: **0 errors**
- `npm run verify:db`: **PASS** (`5` forward-only migrations, `63` tables, `100%` parity)
- `npm test`: **194 / 194 PASS** (13 suites, including new RBAC privilege-escalation, brute-force lockout/rate-limit, and `sanitizeUrl` regression tests)
- `npm run build:all`: **PASS** (`dist/` + `dist-admin/`)
- `npx wrangler deploy --env staging --dry-run`: **PASS** (`1004.74 KiB` / `201.53 KiB` gzip, `0` warnings)
- `node scripts/smoke-test-deployment.mjs`: **6 / 6 PASS**
- Headless Chromium (`playwright-cli`): Verified Learner `/` (`1440×900` & `390×844`), `/login`, and Separate Admin `/admin.html` (`0px` overflow, `0` application errors).

---

## [Unreleased — Blank-Screen Root Cause Fix, Root ErrorBoundary & Mobile Bundle Diet] - 2026-11-27

### Root Cause Diagnosed on Live Staging (`https://staging.linguaverse-web-1s7.pages.dev`)
- Live mobile Chromium (`390×844`) reproduced the blank `#05091F` screen on `https://staging.linguaverse-web-1s7.pages.dev/` and `/login`:
  1. Live Staging Worker (`linguaverse-ai-api-staging`) is still serving the pre-fix build returning `{"config":null}` from `GET /api/v1/cms/public` on fresh D1, and Staging Pages (`linguaverse-web`) is still serving the pre-fix monolithic bundle (`index-BNuKe6hs.js`) that called `setConfig(null)` → uncaught `TypeError: Cannot read properties of null (reading 'sections')` on `/` and `Cannot destructure property 'seo' of 'e' as it is null` on `/login`.
  2. Absence of a top-level React ErrorBoundary in `src/main.tsx` and `src/admin-main.tsx` caused React to unmount the entire root (`rootChildCount: 0`), leaving a solid dark `#05091F` screen.
  3. Empty `#root` / `#admin-root` shells in `index.html` / `admin.html` displayed a blank dark screen while JS downloaded on slow mobile connections.

### Fixed & Hardened
- **Root Error Boundary & Stale Chunk Recovery (`src/components/common/RootErrorBoundary.tsx`, `src/main.tsx`, `src/admin-main.tsx`, `src/components/common/WorkspaceErrorBoundary.tsx`)**: Added top-level `RootErrorBoundary` wrapping both Learner PWA and Separate Admin App with automatic one-shot stale-chunk cache recovery (`vite:preloadError`), clean Retry / Reload Fresh App controls, and zero exposure of internal stack traces or raw error strings to public users.
- **Instant Zero-JS First-Paint Loading Shells (`index.html`, `admin.html`)**: Added lightweight inline branded boot splashes inside `#root` and `#admin-root` (desktop production `FCP: 76 ms`, `LCP: 920 ms`, `CLS: 0`).
- **Lazy Offline Repository Split (`src/services/storage/index.ts`)**: Converted static `LocalPersistenceRepository` import into a lazy dynamic-import proxy used only when `VITE_API_BASE_URL` is unset. `AuthContext` collapsed from **453.13 kB (117.12 kB gzip)** → **59.96 kB (17.86 kB gzip)** (`-86.8%`), reducing Staging/Production mobile Learner initial JS from **979.18 kB gzip → 317.94 kB gzip (-67.5%)** (`localRepoLoaded: false`, `threeJsLoadedOnMobile: false`).
- **Network Timeout & Offline Resilience (`src/services/storage/d1ApiRepository.ts`, `src/services/adminPortalApi.ts`, `src/AdminApp.tsx`)**: Added 10s `AbortController` timeouts to prevent auth hydration stalls on flaky mobile networks, plus an explicit Retry Connection banner in `SeparateAdminShell`.
- **Service Worker v3 Cache Purge & Asset Guard (`public/sw.js`)**: Bumped cache keys `v2 → v3` to purge broken cached Staging assets on existing mobile browsers, switched content-hashed `/assets/*` to Cache-First with a strict non-`text/html` MIME guard.

---

## [Unreleased — High-Performance Optimization & Admin Login Verification] - 2026-11-27

### Performance Optimizations (Locally Built & Verified; Ready for Staging Redeploy)
- **Route & Portal Code-Splitting (`src/App.tsx`, `src/AdminApp.tsx`, `src/pages/admin/AuthenticatedAdminPortal.tsx`, `vite.config.ts`, `vite.admin.config.ts`)**:
  - Converted all 24 non-landing Learner routes to `React.lazy` + `<Suspense>` and configured Vite 8 Rolldown vendor splitting (`vendor-react`, `vendor-three`, `vendor-motion`, `vendor-icons`). Learner entry chunk dropped from **4,248.65 kB (979.18 kB gzip)** to **359.44 kB (85.15 kB gzip)** across 46 lazy chunks; total desktop initial JS transfer dropped **-43.8%** (`983 KB -> 552.8 KB`) and mobile (`390×844`) dropped **-58.8%** (`~405 KB`, `threeJsLoadedOnMobile: false`).
  - Extracted authenticated Admin shell (`CmsProvider`, `AuthProvider`, `AdminControlCenterPage`) into lazy `AuthenticatedAdminPortal`. Admin Login JS dropped from **1,282.95 kB (328.77 kB gzip)** to **569.35 kB (172.92 kB gzip)** (`167.9 KB` wire transfer in Chromium, **-48.5%**), production FCP **220 ms** (`-73.6%`), and Admin Login API calls dropped from **6 -> 1** (`GET /api/v1/admin/auth/status` only, `0` `401`s).
- **Mobile & Font Loading Optimization (`src/components/landing/HeroCommunicationCore.tsx`, `index.html`, `admin.html`)**:
  - Idle-deferred `ThreeLanguageGlobe` (`vendor-three` 599.79 kB / 147.74 kB gzip) on desktop and kept the crisp static SVG fallback on narrow `<768px` mobile / `Save-Data` connections.
  - Made Google Fonts non-render-blocking (`media="print" onload="this.media='all'"` + `<noscript>` fallback + `dns-prefetch`) and trimmed unused font families from `admin.html`.
- **Cloudflare Worker KV Edge Caching, Single-Query D1 Consolidation & Private Cache Security (`worker/index.ts`, `worker/routes/prd61Routes.ts`, `worker/routes/p3CommunityVocabBillingRoutes.ts`)**:
  - Added global `Server-Timing: app;dur=<ms>` and enforced strict `Cache-Control: no-store, no-cache, must-revalidate, private` + `Pragma: no-cache` on all `/api/v1/admin/*`, `/api/v1/auth/*`, and `Authorization`-bearing responses.
  - Added 60s `LINGUAVERSE_KV` read-through caching (`X-Cache: HIT|MISS`, `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=300`) to `GET /api/v1/cms/public`, `GET /api/v1/system/status`, and `GET /api/v1/curriculum/overlay` (reducing warm hits to **0 D1 queries**) with instant KV invalidation on Admin publish/reset/media/curriculum/feature-flag/settings mutations.
  - Consolidated D1 queries: `GET /api/v1/admin/overview` (`9 -> 1` SQL data query), `GET /api/v1/admin/system-health` (`7 -> 2` SQL data queries), `GET /api/v1/system/status` (`2 -> 1` SQL data query on cache miss).
- **Client Request Deduplication & Cloudflare Pages `_headers` (`public/_headers`, `vite.admin.config.ts`, `src/services/cmsApi.ts`, `src/services/adminPortalApi.ts`)**:
  - Added `public/_headers` (Learner PWA) and auto-emitted `dist-admin/_headers` (Separate Admin App): 1-year `immutable` caching for hashed `/assets/*`, `max-age=0, must-revalidate` for `/sw.js` & Learner HTML, and strict `no-store, private` + `X-Robots-Tag: noindex, nofollow` on Admin HTML.
  - Deduplicated in-flight `fetchAdminAuthStatus()` and `fetchPublicCmsConfig()` (with 60s `sessionStorage` cache invalidated on CMS publish).
- **Additive D1 Performance Indexes (`migrations/0005_performance_indexes.sql`, `db/rollbacks/ROLLBACK_0005_performance_indexes.sql`, `schema.sql`, `scripts/verify-d1-migrations.mjs`)**:
  - Added 7 non-destructive `CREATE INDEX IF NOT EXISTS` covering user listing, session cleanup, published curriculum overlay, audit filtering, analytics, and audio retention queries.
- **Verified**: `npm run lint` (0 errors), `npm run verify:db` (5 migrations, 63 tables, 100% parity), `npm test` (**192 / 192 PASS**, including Test #156 Worker KV caching + private `no-store` invariant), `npm run build:all`, Wrangler staging dry-run (`998.18 KiB` / `200.25 KiB` gzip, 0 warnings), and headless Chromium desktop + mobile captures (`0px` overflow).

---

## [Unreleased — Cloudflare Staging Deployment, Fresh-D1 CMS Fix & Chromium Verification] - 2026-11-27

### Deployed (Cloudflare Staging Environment — Account `fa6ffb91f755b6a7066cd0cf4ce70556`)
- **Staging Worker API**: `https://linguaverse-ai-api-staging.uttombarmon45.workers.dev` (`GET /api/health` -> `200 ok`, D1 `linguaverse-db-staging` `19181902-a6d5-4d95-9d5f-a7e71016ecc9` with 63 tables + `0001`–`0004` + reference seed, separated staging KV namespaces, strict staging CORS allowlist verified allowing Learner + Admin staging origins and blocking untrusted origins).
- **Staging Learner PWA (Cloudflare Pages `linguaverse-web`)**: `https://staging.linguaverse-web-1s7.pages.dev`
- **Staging Separate Admin App (Cloudflare Pages `linguaverse-admin`)**: `https://staging.linguaverse-admin.pages.dev` (verified live in headless Chromium desktop `1440×900` & mobile `390×844`, `robots: noindex, nofollow`, `0px` horizontal overflow, live `GET /api/v1/admin/auth/status => 200`, invalid bootstrap secret rejected `403`, unauthenticated `/api/v1/admin/overview` rejected `401`).

### Fixed (Caught During Live Staging Chromium E2E)
- **Fresh Empty-D1 CMS Hydration Crash (`worker/index.ts`, `src/context/CmsContext.tsx`, `src/services/cmsApi.ts`)**: Live Chromium testing against Staging caught `GET /api/v1/cms/public` returning `{"config":null}` on a fresh D1 database with 0 rows in `cms_documents`, causing `TypeError: Cannot read properties of null (reading 'sections')` on `/register`. Fixed Worker routes (`GET /api/v1/cms/public`, `GET /api/v1/admin/cms`, `PUT /api/v1/admin/cms/draft`, `POST /api/v1/admin/cms/publish`, `POST /api/v1/admin/media`) to hydrate via `createDefaultCmsConfig()` + `sanitizeCmsConfigPatch()`, added `audit_logs` query parity, hardened `CmsContext.tsx` & `cmsApi.ts` defensively, added `worker/workerParity.test.ts` regression test #191, and strengthened `scripts/smoke-test-deployment.mjs` (both `--flag=val` and `--flag val` parsing + non-null `config.sections` check).
- **CI Pages Project Name (`.github/workflows/ci-cd.yml`)**: Updated Learner Pages deploy step to `--project-name=linguaverse-web` matching the provisioned Cloudflare Pages project.

### Verified (Post-Fix)
- `npm run lint` (`tsc --noEmit`): **0 errors**.
- `npm run verify:db`: **PASS** (`4` forward-only migrations, `63` tables, `100%` parity).
- `npm test`: **191 / 191 PASS** (13 suites, including new fresh-D1 CMS regression test).
- `npm run build:all`: **PASS** (`dist/` + `dist-admin/`).
- `npx wrangler deploy --env staging --dry-run`: **PASS** (`994.21 KiB` / `199.15 KiB` gzip, 0 warnings).
- `node scripts/smoke-test-deployment.mjs`: **6 / 6 PASS** (`CMS sections=8 + Overlay`, `manifest=LinguaVerse`, `noindex verified`).
- Headless Chromium (`playwright-cli`): Verified fixed Learner PWA `/` and `/register` (`1440×900` & `390×844`, `0px` overflow, manifest + SW active, 0 React crashes) and live Staging Separate Admin App (`https://staging.linguaverse-admin.pages.dev/`, `1440×900` & `390×844`, `0px` overflow, `noindex`).

### Pending Redeploy & Owner Actions
- **Staging Redeploy & GitHub Push of Fresh-D1 CMS Fix**: Local fixes are verified and ready to redeploy to Staging Worker/Pages and push to `origin/main` once fresh `CLOUDFLARE_API_TOKEN` and GitHub PAT are supplied.
- **Cloudflare R2 Activation (`code: 10042`)**: Enable R2 in Cloudflare Dashboard before uncommenting R2 bindings in `wrangler.toml`.
- **Optional Staging AI/Email Secrets**: Configure `GEMINI_API_KEY` and `RESEND_API_KEY` on `linguaverse-ai-api-staging` when ready for live AI and email delivery.
- **Production Deployment**: Intentionally not deployed (STAGING-only checkpoint).

---

## [Unreleased — Full PRD v6.1 Master Completion, Repo Recovery & Wrangler v4 Pre-Deploy Validation] - 2026-11-27

### Added & Fixed (Repository Recovery, Wrangler v4 Audit & Cloudflare Production Readiness)
- **Repository Recovery & Remote History Preservation (`ubuttomkumar-commits/Linguaverse-Ai`)**: Recovered real Git history (`origin/main` at `53461b1`), preserved remote security & dependency fixes (`resolveClientIp` with `TRUST_PROXY`, `shouldExposeDevPreviewOtp`, `esbuild ^0.28.0`, and remote docs `DEPLOYMENT_REPORT.md`, `IMPLEMENTATION_STATUS.md`, `KNOWN_LIMITATIONS.md`, `TESTING_REPORT.md`), and synchronized `package-lock.json`.
- **Wrangler v4.168.0 Configuration Hardening (`wrangler.toml`, `.github/workflows/ci-cd.yml`)**: Removed conflicting `pages_build_output_dir` from Worker config, declared explicit separated D1/R2/KV bindings, vars, and Cron triggers for `[env.staging]` and `[env.production]`, and updated CI deployment commands to target `--env production`. Verified `0` warnings via `npx wrangler deploy --dry-run --env staging|production`.
- **Forward-Only D1 Migration Package (`migrations/`, `db/rollbacks/`, `db/seeds/`)**: Moved `ROLLBACK_0002..0004` into `db/rollbacks/` and `seed_reference_data.sql` into `db/seeds/` so `wrangler d1 migrations apply` executes strictly `0001`–`0004` (verified via `wrangler d1 migrations list --local --env production`), and expanded `scripts/verify-d1-migrations.mjs` to test existing `0001 -> 0004` schema upgrades with populated user/session/mistake data.
- **Cloudflare Worker R2 CMS Media & Cron Scheduled Maintenance**: Added `MEDIA_BUCKET` R2 binding (`worker/types.ts`, `wrangler.toml`), RBAC-protected Worker routes (`POST /api/v1/admin/media` with PNG/JPEG/WebP magic-byte check blocking SVG/HTML XSS, `GET /api/v1/media/:filename` with sandboxed CSP, `DELETE /api/v1/admin/media/:mediaId`), and `[triggers] crons` (`0 3 * * *`, `0 */6 * * *`) invoking `runWorkerScheduledMaintenance()`.
- **Database Verification, Deployment Smoke Suite & Secret Hygiene**: Added `db/seeds/seed_reference_data.sql`, `scripts/verify-d1-migrations.mjs` (`npm run verify:db`), `scripts/smoke-test-deployment.mjs` (`npm run verify:smoke`), `npm test` in `package.json`, `.dev.vars.example`, hardened `.gitignore`, and `npm run verify:db` in `.github/workflows/ci-cd.yml`.
- **Phase 13 Production & Deployment Documentation Suite**: Added `docs/CLOUDFLARE_DEPLOYMENT.md` (10-step runbook), `docs/DATABASE_DEPLOYMENT.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/PRODUCTION_READINESS.md`, `docs/ROLLBACK.md`, and `docs/SECURITY_AUDIT.md`.

### Added (Full PRD v6.1 Modules, Admin Control Center & Express/Worker Parity)
- **Modular AI & 12-Provider Registry + Admin Control Center**: Added `src/domain/aiProviderRegistry.ts`, `src/components/admin/AdminAiProvidersTab.tsx`, `src/components/admin/AdminSystemHealthTab.tsx`, interactive Feature Flags & Maintenance Mode toggles in `AdminSystemConfigTab.tsx`, confirmation-gated user deletion + session revocation on suspend in `AdminUserManagementTab.tsx`, and full Express + Worker route parity (`/api/v1/system/status`, `/api/v1/admin/feature-flags`, `/api/v1/admin/ai-providers`, `/api/v1/admin/ai-providers/:id/health-check`, `/api/v1/admin/ai-providers/:id/rotate-key`, `/api/v1/admin/system-health`, `/api/v1/admin/users/:id` `PATCH`/`DELETE`, `/api/v1/admin/notifications/broadcast`). Zero raw secrets are ever exposed in UI, API responses, or logs.
- **IELTS & English Examination Preparation (`/app/ielts`)**: Added `src/domain/ieltsExamEngine.ts`, `src/pages/learner/IeltsPrepPage.tsx`, and Express/Worker endpoints (`/api/v1/examinations/catalog`, `/attempts`, `/evaluate`) covering Speaking Parts 1–3, Writing Task 1/2 & General Training Letter, Reading, and Listening with mandatory Exam Truth Policy disclaimers.
- **Writing Intelligence, Japanese-Inspired Shadowing & Human Bridge Labs (`/app/writing`)**: Added `src/domain/advancedLearningLabsEngine.ts`, `src/pages/learner/WritingAndLabsPage.tsx`, and Express/Worker endpoints (`/api/v1/writing/catalog`, `/entries`, `/evaluate`, `/entries/:id/rewrite`, `/api/v1/human-bridge/logs`) preserving verbatim original diary text alongside rewrites and strictly tagging offline practice as `User-Reported Offline Activity`.
- **Learning Plateau Recovery, Independent Communication Readiness & Server-Persisted Notifications**: Added PRD §33 & §34 analytical cards to `src/pages/learner/ProgressPage.tsx`, PRD §35 notification schedule & quiet hours management in `src/pages/learner/SettingsPage.tsx` (`src/domain/notificationsEngine.ts`), and live Maintenance Mode + server notification sync in `src/components/layout/LearnerShell.tsx`.
- **Additive D1 Migration `0004` + Rollback + CI/CD Parity**: Added `migrations/0004_prd61_examinations_labs_providers.sql`, `db/rollbacks/ROLLBACK_0004_prd61_examinations_labs_providers.sql`, mirrored Section 16 in `schema.sql`, updated `.github/workflows/ci-cd.yml`, and verified full `0001 -> 0002 -> 0003 -> 0004 -> ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002` parity against `schema.sql` in real SQLite (`worker/workerParity.test.ts`).
- **Security Headers & Observability**: Added `X-Request-Id`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy` across both Express (`server.ts`) and Cloudflare Worker (`worker/index.ts`).
- **Separate Admin Application (`admin.html`, `dist-admin/`)**: Added standalone Admin SPA (`vite.admin.config.ts`, `src/admin-main.tsx`, `src/AdminApp.tsx` with `CmsProvider(skipDocumentSeo)`, `src/pages/admin/AdminLoginPage.tsx`, `src/services/adminPortalApi.ts`), pure bootstrap/policy engine (`src/domain/adminBootstrapEngine.ts` + `.test.ts`), Express + Cloudflare Worker D1 parity for `/api/v1/admin/auth/*` (one-time Super Admin provisioning with production `503` fail-closed secret guard, permanent `409` lock, strict `403` learner rejection, and session revocation), `build:admin` / `build:all` scripts, `/admin-portal` production Express mount, and `linguaverse-admin` Cloudflare Pages deploy job in `.github/workflows/ci-cd.yml`.
- **Zero-Dependency Native PWA & Fast Cold-Boot Startup**: Replaced heavy `vite-plugin-pwa` (~300 transitive packages) with native `public/manifest.webmanifest`, `public/sw.js` (bypassing `/api/` and `/admin`), and `src/main.tsx` production registration, eliminating cold-boot dev server timeouts and cutting total packages from 569 to 273.
- **Express <-> Worker Admin Curriculum, Reported Mistakes & Overview Parity (Independent Re-Audit Closure)**: Added `GET /api/v1/curriculum/overlay` (Express + Worker D1), `GET /api/v1/admin/overview`, `POST /api/v1/admin/curriculum/courses|modules|lessons`, `POST /api/v1/mistakes/report-false-correction`, and `GET/POST /api/v1/admin/flagged-mistakes*` on Express (`server/prd61Store.ts`, `server/prd61Routes.ts`), wired Separate Admin App `Curriculum Builder` & `Reported Mistakes` (`AdminControlCenterPage.tsx`, `adminPortalApi.ts`) to persist directly to the server with live audit logging, synced server overlay into Learner `AcademyPage.tsx`, and normalized `fetchAdminAuditLogs` (`src/services/cmsApi.ts`) for both Express object and Cloudflare Worker array payloads.
- **Hardened PWA Service Worker v2 & Logout Cache Purge**: Upgraded `public/sw.js` (`linguaverse-shell-v2`) to bypass `Authorization` requests, non-GET mutations, `/api/*`, and `/admin*`, reject caching any response containing `Set-Cookie`, `Cache-Control: no-store`, or `private`, restrict navigation caching strictly to the root shell `/`, and purge runtime caches on logout (`src/utils/pwaRuntime.ts` wired into `AuthContext.tsx` and `AdminApp.tsx`). Added `src/domain/pwaCompliance.test.ts` validating manifest contract, PNG magic bytes & exact icon dimensions, HTML separation, and SW isolation guards.
- **Cloudflare Worker Full Route Parity, Flagged-Mistakes Bug Fix & Learner Sync**: Added missing Worker routes called by frontend (`DELETE /api/v1/community/posts/:postId`, `POST /api/v1/subscriptions/:subscriptionId/cancel`, `POST /api/v1/subscriptions/invoices/:invoiceId/refund-request`, `PATCH /api/v1/admin/support/:ticketId`, `GET /api/health`, `POST /api/landing/analyze` with XML prompt-injection isolation, `GET /api/v1/auth/csrf`, `POST /api/v1/mistakes/report-false-correction`, `GET /api/v1/admin/analytics`, and `POST /api/v1/admin/cms/reset`), fixed `GET /api/v1/admin/flagged-mistakes` in `worker/index.ts` returning raw snake_case SQLite rows instead of camelCase `MistakeMemoryItem` objects, wired `AuthContext.tsx` learner `"Report False Correction"` to sync live to `/api/v1/mistakes/report-false-correction`, and removed stale `vite-plugin-pwa/client` from `tsconfig.json` while excluding `dist-admin`.
- **Full Technical Documentation Suite**: Created `docs/PRD_IMPLEMENTATION_TRACKER.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/TESTING.md`, and `docs/API.md`, and synchronized `audit/*`, `README.md`, `CHANGELOG.md`, and `STATE.md`.

### Verified
- `npm run lint` (`tsc --noEmit`): **0 errors**.
- `npm run verify:db`: **PASS** (`forwardMigrationsOnly: true`, `4` migrations, `63` tables, `100%` `schema.sql` parity, `PRAGMA integrity_check=ok`, `0` FK violations, idempotent seed, non-destructive existing-schema upgrade & rollback).
- `npm test`: **190 / 190 PASS** across 13 suites / 36 test files (`src/domain/*.test.ts`, `src/services/storage/localRepository.test.ts`, `worker/workerParity.test.ts`, `worker/workerSecurity.test.ts`).
- `npm run verify:smoke`: **6 / 6 PASS** against `http://localhost:3000`.
- `npx wrangler deploy --dry-run --env staging|production` (Wrangler `4.168.0`): **0 warnings**, separated staging/prod bindings verified (`945.21 KiB` / `189.95 KiB` gzip).
- `npm run build:all`: clean dual production bundles (`dist/` + native PWA AND `dist-admin/`), `0` leaked secrets across both bundles.
- `bun audit`: **0 vulnerabilities** across 273 packages.

---

## [Unreleased — Production Release Readiness] - 2026-11-25

### Security & Dependencies
- Remediated the 2 moderate build-time transitive advisories (`GHSA-3g3m-2fjr-6pw4` in `glob@11.1.0` and `GHSA-g3hv-75wg-m249` in `minimatch@10.2.6` via `vite-plugin-pwa > workbox-build`) by pinning `"overrides": { "glob": "^14.0.6" }` in `package.json`. Re-verified `bun audit`: **0 vulnerabilities across 569 packages**.
- Expanded `.github/workflows/ci-cd.yml` secret scan regex (`whsec_`, `GEMINI_API_KEY=`) and added safe lockfile fallback (`npm ci` when `package-lock.json` exists, otherwise `npm install`).

### Added (PRD v6.1 Gap Closure & PWA)
- **Signed Payment Webhooks (`POST /api/v1/billing/webhooks/:provider`)**: Added WebCrypto HMAC-SHA256 verification, 5-minute replay window, constant-time signature comparison, fail-closed `503` when provider secret is unset, and idempotent `eventId` deduplication across Express (`server/p3Store.ts`, `server/p3Routes.ts`) and Cloudflare Worker (`worker/routes/p3CommunityVocabBillingRoutes.ts`), plus unit tests (`src/domain/paymentWebhookEngine.test.ts`) and Worker/D1 parity tests (`worker/workerParity.test.ts`).
- **Admin System Configuration (`GET/PUT /api/v1/admin/system-settings`)**: Added server-verified `admin`/`super_admin` RBAC endpoints reusing D1 `system_settings` (`0001_initial_schema.sql`), non-secret validation (rejects secret keys and DM-enabling patches), audit logging, and `src/components/admin/AdminSystemConfigTab.tsx`.
- **Academy Reading, Listening & Writing Intelligence**: Expanded `src/domain/curriculumData.ts` to 5 courses / 9 lessons (`course_reading_listening`, `course_writing_workplace`) with honest non-acoustic `pronunciation` linkage to `/app/speak`.
- **Interactive 8-Step Communication Improvement Loop**: Added `buildCommunicationLoopStages` (`src/domain/dashboardIntelligence.ts`) and `src/components/dashboard/CommunicationLoopWidget.tsx` on `/app`, and replaced stale module placeholders in `DashboardModulePreviews.tsx` with live workspace links.
- **PWA Support**: Configured `vite-plugin-pwa` in `vite.config.ts`, generated `public/icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, and `apple-touch-icon.png`, added mobile/iOS meta tags in `index.html`, and added `usePWAInstall.ts`, `PWAInstallButton.tsx`, and `OfflineIndicator.tsx`.
- **Audit & Release Governance**: Created `audit/EXISTING-PROJECT-AUDIT.md`, `audit/IMPLEMENTATION-PLAN.md`, `audit/PRD-COMPLIANCE-MATRIX.md`, `audit/TEST-EVIDENCE.md`, updated `DEPLOYMENT.md` (pre-migration D1 backup + webhook secrets), and updated `STATE.md`.

### Earlier Completed Milestones (Preserved)
- **P3 (2026-11-25)**: Vocabulary SM-2 SRS Deck (`/app/vocabulary`), Moderated Learner Community (`/app/community`, DMs disabled), Gamification & Server-Verified Leaderboard (`/app/achievements`), Subscription & Support (`/app/subscription`), Admin Moderation & Subscriptions tabs, additive D1 migration `0003` + rollback, `.github/workflows/ci-cd.yml`.
- **P2 (2026-11-25)**: Cloudflare Worker/D1/R2/KV full parity for Parts 06–12 + learner persistence, sequential D1 migrations `0001` & `0002` + `ROLLBACK_0002`, canonical `schema.sql`, Gemini failover/transcribe/WAV-TTS.
- **P1 (2026-11-25)**: Critical security hardening S2–S11 (server-verified admin auth, SVG XSS prevention & magic-byte validation, `mirror-local` lockdown, unauthenticated OTP relay removal, fail-closed Worker JWT secret, strict CORS allowlist, constant-time CSRF & origin validation, ephemeral in-memory session token replacing `localStorage` JWT, R2 consent/MIME/size enforcement, rate limiting).

### Blocked External Release Actions
- GitHub commit/push to `ubuttomkumar-commits/Linguaverse-Ai` (no `.git` repo, `gh` CLI, or GitHub credentials in container).
- Live Cloudflare D1/KV/R2 provisioning, remote migrations, Worker/Pages deployment, and live production URL verification (no `wrangler` CLI or Cloudflare credentials in container).
