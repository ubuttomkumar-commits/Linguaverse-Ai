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
- **Cloudflare Full-Stack Blueprint**:
  - `wrangler.toml` (Pages + Workers + D1 + R2 + KV)
  - `schema.sql` (complete normalized D1 migration schema)
  - `src/services/apiClient.ts` (zero-rewrite local vs. `/api/v1/*` Cloudflare Worker abstraction)

---

## Security & Privacy Verification Checklist
- [x] API keys (`GEMINI_API_KEY`) strictly server-side (`server.ts` / Cloudflare Workers Secrets); never exposed to browser bundle.
- [x] Role-based access control (`hasAdminPermission`) blocks `learner` role from `/admin` controls and restricts `content_manager` vs. `ai_ops` grants.
- [x] Microphone recording storage honors `privacyConsent.storeMicRecordings` before writing IndexedDB/R2 blobs.
- [x] AI telemetry honors `privacyConsent.logAiEvaluations` before logging usage events.
- [x] Account deletion verifies full IndexedDB audio blob purge (`clearAllAudioBlobs()`) alongside repository erasure.
- [x] Idempotent XP awards enforced via unique `idempotencyKey` in both local ledger and D1 `UNIQUE(user_id, idempotency_key)`.
