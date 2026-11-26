# Changelog — LINGUAVERSE AI

All notable changes verified in the workspace are documented here. Entries distinguish clearly between **Locally Verified** changes and **Blocked** external release actions (GitHub push / live Cloudflare deployment).

## [Unreleased — Full PRD v6.1 A–Z Master Completion] - 2026-11-26

### Added (Full PRD v6.1 Modules, Admin Control Center & Express/Worker Parity)
- **Modular AI & 12-Provider Registry + Admin Control Center**: Added `src/domain/aiProviderRegistry.ts`, `src/components/admin/AdminAiProvidersTab.tsx`, `src/components/admin/AdminSystemHealthTab.tsx`, interactive Feature Flags & Maintenance Mode toggles in `AdminSystemConfigTab.tsx`, confirmation-gated user deletion + session revocation on suspend in `AdminUserManagementTab.tsx`, and full Express + Worker route parity (`/api/v1/system/status`, `/api/v1/admin/feature-flags`, `/api/v1/admin/ai-providers`, `/api/v1/admin/ai-providers/:id/health-check`, `/api/v1/admin/ai-providers/:id/rotate-key`, `/api/v1/admin/system-health`, `/api/v1/admin/users/:id` `PATCH`/`DELETE`, `/api/v1/admin/notifications/broadcast`). Zero raw secrets are ever exposed in UI, API responses, or logs.
- **IELTS & English Examination Preparation (`/app/ielts`)**: Added `src/domain/ieltsExamEngine.ts`, `src/pages/learner/IeltsPrepPage.tsx`, and Express/Worker endpoints (`/api/v1/examinations/catalog`, `/attempts`, `/evaluate`) covering Speaking Parts 1–3, Writing Task 1/2 & General Training Letter, Reading, and Listening with mandatory Exam Truth Policy disclaimers.
- **Writing Intelligence, Japanese-Inspired Shadowing & Human Bridge Labs (`/app/writing`)**: Added `src/domain/advancedLearningLabsEngine.ts`, `src/pages/learner/WritingAndLabsPage.tsx`, and Express/Worker endpoints (`/api/v1/writing/catalog`, `/entries`, `/evaluate`, `/entries/:id/rewrite`, `/api/v1/human-bridge/logs`) preserving verbatim original diary text alongside rewrites and strictly tagging offline practice as `User-Reported Offline Activity`.
- **Learning Plateau Recovery, Independent Communication Readiness & Server-Persisted Notifications**: Added PRD §33 & §34 analytical cards to `src/pages/learner/ProgressPage.tsx`, PRD §35 notification schedule & quiet hours management in `src/pages/learner/SettingsPage.tsx` (`src/domain/notificationsEngine.ts`), and live Maintenance Mode + server notification sync in `src/components/layout/LearnerShell.tsx`.
- **Additive D1 Migration `0004` + Rollback + CI/CD Parity**: Added `migrations/0004_prd61_examinations_labs_providers.sql`, `migrations/ROLLBACK_0004_prd61_examinations_labs_providers.sql`, mirrored Section 16 in `schema.sql`, updated `.github/workflows/ci-cd.yml`, and verified full `0001 -> 0002 -> 0003 -> 0004 -> ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002` parity against `schema.sql` in real SQLite (`worker/workerParity.test.ts`).
- **Security Headers & Observability**: Added `X-Request-Id`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Permissions-Policy` across both Express (`server.ts`) and Cloudflare Worker (`worker/index.ts`).
- **Documentation & Recovery Audit**: Created `docs/API.md`, `audit/RESUME-RECOVERY-REPORT.md`, `audit/REMAINING-TASKS.md`, and updated `audit/PRD-COMPLIANCE-MATRIX.md`, `audit/TEST-EVIDENCE.md`, `DEPLOYMENT.md`, `README.md`, and `STATE.md`.

### Verified
- `tsc --noEmit`: 0 errors.
- `npm run build`: clean production bundle (`dist/`).
- Automated tests: **173 / 173 passing** across 11 suites (`src/domain/*.test.ts`, `src/services/storage/*.test.ts`, `worker/*.test.ts`).
- `bun audit`: **0 vulnerabilities** across 569 packages.
- Live Express HTTP security/RBAC/CSRF PoCs: **24 / 24 passing**.

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
