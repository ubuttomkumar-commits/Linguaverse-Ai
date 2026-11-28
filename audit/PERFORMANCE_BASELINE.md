# LINGUAVERSE AI — Performance Baseline Report (Pre-Optimization)

**Captured:** 2026-11-27  
**Baseline Commit:** `53eff1c` (HEAD on local `main`)  
**Scope:** Existing Learner PWA (`dist/`), Separate Admin App (`dist-admin/`), Cloudflare Worker API (`worker/index.ts`), Express Parity Server (`server.ts`), and D1 SQLite Schema (`migrations/0001`–`0005`, 63 tables).

---

## 1. Pre-Optimization Build & Bundle Footprint

| Artifact | Pre-Change Baseline | Notes |
| --- | --- | --- |
| Learner PWA Entry (`dist/assets/index-*.js`) | ~379 KiB raw / ~113 KiB gzip (from commit `a15e034`) | 24 lazy routes split; no route-chunk prefetching |
| Separate Admin Entry (`dist-admin/`) | Independent Vite build | Zero learner curriculum bloat |
| Cloudflare Worker Bundle (`worker/index.ts`) | `1004.74 KiB` raw / `201.53 KiB` gzip (`wrangler deploy --dry-run`) | Zero warnings; no Smart Placement configured |
| Database Schema | `5` migrations (`0001`–`0005`), `63` tables, `100%` parity | Missing composite indexes on hot learner hydration & community queries |
| Automated Tests | `194 / 194` PASS (13 test suites) | 0 regressions |

---

## 2. Measured Code-Level Bottlenecks (Baseline Architecture Audit)

### 2.1 Backend & Database Waterfalls
1. **`worker/index.ts` — `buildHydratedAuthPayload()` (Lines 417–456)**:
   - Executed **6 sequential `await env.DB.prepare('SELECT * ...')` queries** (`learner_profiles`, `learner_mistakes`, `lesson_attempts`, `speaking_sessions`, `transfer_attempts`, `user_xp_events`) on every `/api/v1/auth/me`, `/api/v1/auth/login`, and `/api/v1/auth/register`.
   - Each query used `SELECT *`, over-fetching unused columns, and paid 6 serial D1 round-trips instead of 1 parallel round-trip (`Promise.all`).
2. **`worker/index.ts` — `GET /api/v1/admin/users` (Lines 1588–1625)**:
   - Always scanned up to 200 users with 3 correlated subqueries (`lesson_attempts`, `speaking_sessions`, `learner_mistakes`) and filtered `q` in JavaScript instead of pushing search predicates and pagination (`limit`, `beforeCreatedAt`) down to SQLite/D1.
3. **`worker/routes/p3CommunityVocabBillingRoutes.ts` — `GET /api/v1/community/posts` (Lines 302–376)**:
   - Fetched `SELECT *` from `community_posts` (up to 100) AND unconditionally fetched up to 400 `community_comments` across all posts without scoping comments to the returned post IDs or supporting cursor pagination (`before`, `limit`).
4. **Missing Composite Indexes (Post-Migration 0005)**:
   - `learner_mistakes(user_id, last_seen_at DESC)` and `learner_mistakes(user_id, status)` were not indexed for fast hydration and active mistake counts.
   - `lesson_attempts(user_id, completed_at ASC)` lacked a covering composite index.
   - `speaking_sessions(user_id, updated_at DESC)` and `transfer_attempts(user_id, completed_at DESC)` and `user_xp_events(user_id, verified_at DESC)` lacked user-scoped ordering indexes.
   - `community_posts(status, created_at DESC)` and `community_comments(post_id, status, created_at ASC)` lacked composite feed indexes.
   - `users(email_verified)`, `users(account_status)` lacked status filter indexes for `/api/v1/admin/overview`.

### 2.2 Frontend Navigation & Perceived Speed Waterfalls
1. **Redundant Uncached Network Calls on Every Workspace Navigation (`src/components/layout/LearnerShell.tsx:117–142`)**:
   - Because each workspace route renders `<LearnerShell>`, navigating between `/app`, `/app/learn`, `/app/speak`, `/app/improve`, `/app/progress`, etc. remounted `LearnerShell` and fired **2 redundant uncached HTTP requests on every single navigation** (`GET /api/v1/system/status` and `GET /api/v1/notifications`).
2. **No Request Deduplication, TTL Cache, or Request Timeouts (`src/services/prd61Api.ts`)**:
   - `prd61FetchJson` had no `AbortController` timeout and no client-side SWR/in-flight deduplication layer.
3. **Zero Route Chunk Prefetching & Full-Screen Blocking Spinner (`src/App.tsx`)**:
   - All 24 lazy routes showed a full-screen centered spinner on first visit (`<LoadingScreen />`), with zero hover/focus/touch prefetching on sidebar or mobile bottom-bar links.
4. **No Keyboard Quick-Switcher & No Optimistic Rollback**:
   - Workspace search had no `Cmd/Ctrl+K` shortcut or keyboard result navigation (`ArrowDown`/`ArrowUp`/`Enter`).
   - Notification read mutations did not perform rollback if the API call failed.
5. **No Real-Time Server Push Channel**:
   - Notifications and maintenance banners were only fetched once on component mount; admin broadcasts did not reach active learner tabs in real time.

### 2.3 CSS, Mobile Touch & Cloudflare Edge Configuration
1. **Mobile Tap Latency & Low-End GPU Pressure (`src/index.css`)**:
   - Interactive controls lacked explicit `touch-action: manipulation`.
   - Heavy `backdrop-filter: blur(18px)` applied uniformly even on small low-end mobile viewports (`<= 640px`).
   - Mobile bottom bar lacked safe-area bottom inset padding (`env(safe-area-inset-bottom)`).
2. **Cloudflare Workers Smart Placement (`wrangler.toml`)**:
   - Neither `[env.staging]` nor `[env.production]` enabled `[placement] mode = "smart"` to co-locate D1-intensive API execution closer to the APAC D1 database when beneficial.

---

## 3. Environment Measurement Boundaries (Honest Disclosure)
- Local runtime benchmarks (`EXPLAIN QUERY PLAN`, local concurrent HTTP load tests, real headless Chromium Core Web Vitals `FCP`/`LCP`/`CLS`/`TTFB`, and 11-viewport responsive verification) are measured directly in this container.
- Multi-region global WAN latency (US/EU/APAC/South Asia edge probes) and live Cloudflare Staging/Production redeployment require an active `CLOUDFLARE_API_TOKEN` and external geographic probes, which are not available inside this single-region container and are explicitly tracked as externally blocked rather than simulated or fabricated.
