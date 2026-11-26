# LINGUAVERSE AI — Phased Implementation Plan (Master PRD v6.1 Alignment)

**Execution Governance:** Preserve all existing working architecture, routes, data models, and tests. Use strictly additive changes and zero duplicate modules. Never fabricate user activity, analytics, acoustic pronunciation scores, or payment revenue.

---

## Phase 1 — Discovery & Baseline Audit
- Inspect connected Git/GitHub and Cloudflare capabilities honestly (`BLOCKED` in sandboxed container without `.git` or `wrangler`/Cloudflare credentials).
- Reconcile supplied PRD v6.1 (Sections 0–2.4) with Master Execution Directive (§4–14) and workspace PRD v5.0.
- Create `audit/EXISTING-PROJECT-AUDIT.md`, `audit/PRD-COMPLIANCE-MATRIX.md`, `audit/IMPLEMENTATION-PLAN.md`, and `audit/TEST-EVIDENCE.md`.

## Phase 2 — Critical Infrastructure, Security & Signed Webhook Hardening
- Implement pure `src/domain/paymentWebhookEngine.ts` + unit tests (`paymentWebhookEngine.test.ts`): constant-time HMAC-SHA256 verification, timestamp replay guard, strict event allowlist (`payment_succeeded`, `payment_failed`, `subscription_cancelled`, `refund_issued`), and idempotent deduplication.
- Wire `POST /api/v1/billing/webhooks/:provider` in both Express (`server/p3Routes.ts`) and Cloudflare Worker (`worker/routes/p3CommunityVocabBillingRoutes.ts`), failing closed (`503`) whenever provider webhook secrets are unconfigured and rejecting tampered signatures (`401`).
- Declare webhook secret placeholders cleanly in `.env.example` (zero secrets committed).

## Phase 3 — Core Learning Engine (Reading, Listening & Writing Intelligence)
- Extend `src/domain/curriculumData.ts` with 2 structured, Bangla-guided 7-stage Academy courses:
  1. **Reading & Listening Comprehension Intelligence** (`course_reading_listening`, A2–B1) with TTS audio listening passages and structured reading analysis.
  2. **Practical Writing & Workplace Communication** (`course_writing_workplace`, B1–B2) with structured workplace email/update/proposal drafting.
- Update `src/domain/academyEngine.ts` category inference and category overview so Reading, Listening, and Writing resolve honestly to `playable_academy` with verified lesson counts.

## Phase 4 — AI & Communication Systems Verification
- Verify existing Speaking Studio, Mistake Memory Engine, Communication DNA, Transfer Lab (30 scenarios + Pressure Ladder), and Communication Replay remain intact with zero regressions across Express and Worker parity.

## Phase 5 & 7 — Learner Command Center, Interactive Communication Loop & PWA
- Add pure `buildCommunicationLoopStages` to `src/domain/dashboardIntelligence.ts` + deterministic unit tests mapping all 8 stages (`DETECT → EXPLAIN → PERSONALIZE → PRACTICE → TRANSFER → RETEST → UPDATE → REPEAT`) to real learner evidence and live routes.
- Create `src/components/dashboard/CommunicationLoopWidget.tsx` (premium dark glassmorphism + glowing active node trace + reduced-motion support) and mount it on `/app`.
- Update `src/components/dashboard/DashboardModulePreviews.tsx` so Vocabulary Deck and Learner Community link directly to live `/app/vocabulary`, `/app/community`, and `/app/achievements`.
- Implement full PWA compliance: `vite-plugin-pwa`, Web App Manifest, brand `public/icon.svg` + real PNG icons (`192x192`, `512x512`, padded `maskable-512x512`, `180x180 apple-touch-icon`), iOS meta tags in `index.html`, `PWAInstallButton` in `LearnerShell.tsx`, and `OfflineIndicator` in `App.tsx`.

## Phase 6 — Admin Control Center System Configuration
- Implement `GET /api/v1/admin/system-settings` and `PUT /api/v1/admin/system-settings` in both Express (`server/p3Store.ts`, `server/p3Routes.ts`) and Cloudflare Worker (`worker/routes/p3CommunityVocabBillingRoutes.ts`, backed by existing `system_settings` table in D1 — zero new migration needed).
- Enforce `admin` / `super_admin` RBAC, strict non-secret allowlist validation, and immutable audit logging on every change.
- Add `AdminSystemConfigTab.tsx` to `AdminControlCenterPage.tsx`.

## Phase 8 & 9 — Quality Assurance, Dependency Remediation, Security Audit & Local Verification (LOCALLY VERIFIED)
- Remediated both moderate build-time advisories (`glob@11.1.0` & `minimatch@10.2.6` inside `vite-plugin-pwa > workbox-build`) via `"overrides": { "glob": "^14.0.6" }` in `package.json`; verified `bun audit` reports **0 vulnerabilities (569 packages)**.
- Hardened `.github/workflows/ci-cd.yml` (safe lockfile fallback when `package-lock.json` is absent + expanded `dist/` secret scan), updated `DEPLOYMENT.md` (pre-migration `wrangler d1 export` backup + webhook secrets), and added `CHANGELOG.md`.
- Re-verified `160/160` unit & SQLite/Worker parity tests, `tsc --noEmit` (`0` errors), `vite build` + PWA artifacts, `dist/` secret scan (`CLEAN`), live local Express HTTP health/security PoCs, and desktop + mobile Playwright Chromium checks.

## Phase 10 — GitHub Push, Cloudflare Provisioning & Production Verification (BLOCKED IN CONTAINER)
- **GitHub Push (`ubuttomkumar-commits/Linguaverse-Ai`)**: Blocked — workspace has no `.git` repository, no `gh` CLI, and no GitHub credentials.
- **Cloudflare Provisioning & Live Deployment**: Blocked — `wrangler` CLI is not installed and no Cloudflare credentials exist; `wrangler.toml` preserves placeholder resource IDs.
- **Production Verification**: Not yet executed until live Worker & Pages URLs are deployed and tested externally.
