# LINGUAVERSE AI — Platform Architecture & Phase State

**Status:** Phases 1–6 Complete & Verified  
**Target Audience:** Bangla-speaking English learners (Pre-A1 to B2) with full `EN` + `বাংলা` UI & bilingual grammar coaching  
**Core Invariant:** Zero fake metrics, zero synthetic streaks/XP, zero stubs. Every metric, score, and log entry is derived strictly from real user actions.

---

## Completed Phases

### Phase 1 — Foundation, Design System, Auth & Baseline Diagnostic
- Deep navy (`#0A0F1C`) + slate charcoal (`#111827`) + electric blue (`#3B82F6`) + violet (`#8B5CF6`) + amber (`#F59E0B`) design system with `Inter` & `Hind Siliguri`.
- Full bilingual (`EN` / `বাংলা`) interface toggle persisted across routes.
- Landing page (`/`), Auth (`/login`, `/register`), 6-step Onboarding (`/onboarding`), and 5-question Evidence-Based Diagnostic (`/diagnostic`) seeding Mistake Memory only from real errors.

### Phase 2 — The Academy & Spaced Repetition Engine (`/app/learn`, `/app/learn/:lessonId`)
- 3 structured Bangla-aware courses (`Pre-A1 – A2`, `A2 – B1`, `B1 – B2`) with 7-stage interactive lessons:
  1. Learning Objective & Prerequisites
  2. Bilingual Concept Rule + Bangla L1 Interference Contrast Table
  3. Real-World Examples with Web Speech API TTS (`0.75x`, `1.0x`)
  4. Guided Practice (fill-in-the-blank, sentence reorder, error spotting)
  5. Independent Practice (sentence construction with Bangla cue & regex trap feedback)
  6. Graded Lesson Assessment
  7. Honest Spaced Repetition Mastery (single-attempt mastery strictly capped at `<= 45%`; requires multi-attempt spaced retention for `Verified Mastery`).

### Phase 3 — AI Speaking Studio & Communication Replay (`/app/speak`)
- 7 conversation modes + 5-level Pressure Ladder + real `MediaRecorder` + Web Speech Recognition + text fallback.
- IndexedDB audio blob persistence for learner self-review playback (respecting learner privacy consent).
- Live Gemini evaluation proxy (`/api/speaking/evaluate`) returning structured JSON feedback (`ai_reply`, `ai_reply_bn_hint`, `corrected_transcript`, `correct_elements`, `mistakes`, `natural_alternative`, honest non-fabricated `pronunciation_note`) and real server-measured latency/token telemetry.

### Phase 4 — Communication DNA, Mistake Memory & Intelligence Dashboard (`/app/improve`, `/app/progress`)
- Mistake Memory Engine filtering by category & status (`Active`, `Practicing`, `Resolved`) with recurrence counters, targeted `"Fix This Mistake"` micro-drills, and `"Report False Correction"` learner flagging.
- 5 independent Communication DNA dimensions (`Grammar Accuracy`, `Vocabulary Range`, `Sentence Complexity`, `Speaking Task Completion`, `Listening/Reading Comprehension`), strictly gated behind `sampleSize >= 3` before computing a score.
- Personal Intelligence Dashboard showing honest trends, weekly review forecast, and weakest-category recommendations.

### Phase 5 — Transfer Lab, 5-Level Pressure Ladder & Verified Gamification (`/app/transfer-lab`)
- Dynamically bridges recent Academy lessons and Mistake Memory patterns into 5 real-world transfer scenarios with 4-rubric Gemini grading (`/api/transfer/evaluate`: Task Completion, Target Grammar Application, Contextual Appropriateness, Response Relevance).
- Progressive 5-level Pressure Ladder (`Controlled` -> `Guided` -> `Open-Ended` -> `Unexpected Twist` -> `Timed High-Stakes`) across both Speaking Studio and Transfer Lab.
- Auditable, idempotent XP Ledger (`UNIQUE(user_id, idempotency_key)`) preventing XP farming while rewarding verified lesson completions, spaced mastery milestones, speaking sessions, resolved mistakes, and passed transfer scenarios.

### Phase 6 — Admin Control Center, Privacy Governance & Cloudflare Architecture (`/admin`, `/settings`)
- **RBAC Protected Admin Control Center (`/admin`)**:
  - Role matrix (`learner` blocked 403, `content_manager`, `ai_ops`, `admin`) with backend-ready JWT claim guard design.
  - **Curriculum Builder**: Create, edit, version, and publish courses, modules, and full playable 7-stage bilingual lessons directly into live Academy storage.
  - **AI Operations & Cost Monitor**: Tracks strictly real API call counts, error rate, avg/P95 latency, estimated tokens, cost USD, active prompt versions (`speaking-eval-v3.2`, `transfer-rubric-v5.1`), and error logs.
  - **Reported Mistakes Queue**: Human review & triage (`Confirm False Positive` / `Restore as Accurate`) of learner-flagged AI mistakes.
  - **Immutable Audit Log Viewer**: Append-only ledger with timestamps, actor role, action, bilingual summary, and correlation IDs.
- **Privacy & Data Sovereignty (`/settings` / `/app/settings`)**:
  - Live consent switches for **Microphone Recording Storage** and **AI Evaluation Telemetry Logging** (enforced immediately in Speaking Studio & Transfer Lab).
  - One-click **Export My Learning Data (JSON)** and **Delete Stored Recordings / Delete All Recordings & Account Data** with verified IndexedDB cleanup.
- **Cloudflare Full-Stack Production Architecture (`worker/`)**:
  - `wrangler.toml` (Pages + isolated `worker/index.ts` + D1 + R2 + KV)
  - `schema.sql` (normalized PRD v5.0 D1 SQLite schema covering `users` with `email_verified`/`account_status`, `sessions`, `email_verification_tokens`, `password_reset_tokens`, `vocabulary_reviews`, `speaking_transcripts`, `speaking_assessments`, `audio_assets`, `mistake_reviews`, `skill_measurements`, `transfer_scenarios`, `user_xp_events`, `achievements`, `ai_provider_events`, `ai_usage_ledger`, `prompt_versions`, `reported_mistakes`, `system_settings`, `user_consents`, `audit_logs`)
  - `worker/index.ts` (Hono REST API `/api/v1/*` with PBKDF2 password hashing, HTTP-only secure cookies + Bearer JWT, KV rate limiting, R2 private audio storage, bilingual Resend/Brevo OTP email delivery via native `fetch()`, server-side Gemini proxy, and strict server-side RBAC `/api/v1/admin/*`)
  - `src/services/apiClient.ts` & `src/services/storage/d1ApiRepository.ts` (zero-rewrite local vs. `/api/v1/*` Cloudflare Worker abstraction)

### PRD v5.0 Upgrades — 3D Landing Page, Real Gmail OTP Auth & Full Admin Overview/Users
- **3D + Motion Public Landing Page (`/`)**: Deep Space Navy (`#050914`), interactive 3D Acoustic Core + Canvas frequency waveform, 3-scenario `"Interactive Sample Preview"`, Pain-Point vs. Solution Matrix, live bilingual Sentence Sandbox (`/api/landing/analyze`), 8-Step Loop + 6 Systems Bento Grid, Support Ecosystem + Floating Guide + 30s Mini-Quiz, BDT/USD Pricing, and instant `EN / বাংলা` toggle.
- **Real Gmail 6-Digit OTP Email Verification (`/verify-email`)**: Cryptographically random 6-digit OTP stored as SHA-256 hash (`email_verification_tokens`, 10-minute expiry, max 5 attempts, 60-second resend cooldown), branded bilingual EN+বাংলা HTML emails via Resend/Brevo, and strict route protection blocking `/onboarding`, `/diagnostic`, `/app/*`, and `/admin` until `email_verified = true` (with an honest local-dev preview banner only when no email provider API key is configured).
- **Upgraded Admin Control Center (`/admin`)**: Added **Overview** (real database counts — zero fake charts) and **User Management** (search real registered users, inspect verification/status, suspend/restore accounts, promote RBAC roles across `learner`, `moderator`, `content_manager`, `ai_ops`, `admin`, `super_admin`, all logged to `audit_logs`).

---

## Security & Privacy Verification Checklist
- [x] API keys (`GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_PROVIDER_API_KEY`, `JWT_SIGNING_SECRET`) strictly server-side (`server.ts` / Cloudflare Workers Secrets); never exposed to browser bundle.
- [x] Email verification OTPs hashed via SHA-256 with 10-minute expiry, max 5 attempts, and 60-second resend rate limit; protected routes blocked until `emailVerified === true`.
- [x] Role-based access control (`hasAdminPermission` + Worker `requireAdmin`) blocks `learner` role from `/admin` controls and enforces role-scoped permissions.
- [x] Microphone recording storage honors `privacyConsent.storeMicRecordings` before writing IndexedDB/R2 blobs.
- [x] AI telemetry honors `privacyConsent.logAiEvaluations` before logging usage events.
- [x] Account deletion verifies full IndexedDB/R2 audio purge alongside repository erasure.
- [x] Idempotent XP awards enforced via unique `idempotencyKey` in both local ledger and D1 `UNIQUE(user_id, idempotency_key)`.
