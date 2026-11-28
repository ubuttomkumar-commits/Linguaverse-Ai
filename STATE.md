# LINGUAVERSE AI — Platform Architecture & Phase State

**Status:** Phases 1–6 + Parts 04–12 Complete & Verified  
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

### Part 04 — 10-Step Onboarding & 5-Skill Initial Assessment (`/onboarding`, `/diagnostic`, `/assessment`)
- **Completed Before Resuming**:
  - Extended `src/types/domain.ts`, `src/services/storage/repository.ts`, `src/services/storage/localRepository.ts`, and `src/context/AuthContext.tsx` with backward-compatible Part 04 profile and 5-skill assessment fields.
  - Built pure domain modules `src/domain/onboardingCatalog.ts`, `src/domain/initialAssessmentEngine.ts`, and unit tests `src/domain/onboardingAssessment.test.ts`.
  - Built lightweight 3D/SVG components `src/components/onboarding/OnboardingSceneVisuals.tsx`, `src/components/onboarding/OnboardingShell.tsx`, and `src/components/assessment/SkillRadarChart.tsx`.
- **Completed During Resume Session**:
  - Implemented all 10 onboarding screens in `src/pages/OnboardingPage.tsx` (Welcome, instant EN/বাংলা toggle, searchable 18-language Native selector, honest Target Language roadmap guard, 11 multi-select Learning Goals, 6 Daily Commitment options `5–45+` min, Learning Preferences + Skip optional, 7 Self-Estimated Proficiency options with explicit non-verified disclaimer, explicit-click Microphone Permission with privacy notice & Skip/denied/unsupported states, and Onboarding Summary with direct `Edit` jumps and final persistence).
  - Implemented 5-skill Initial Assessment in `src/pages/DiagnosticPage.tsx` (Intro with 5 skill cards & non-CEFR disclaimer, 11-step focused workspace across 8 written items + 2 browser `speechSynthesis` Listening items + 1 real `MediaRecorder` / optional `SpeechRecognition` + `/api/speaking/evaluate` Speaking prompt, `"Your Communication Profile"` results with animated circular progress rings, 5-axis SVG Radar Chart, Self-Estimate vs. Observed Evidence comparison, Strengths/Opportunities, Personalized Learning Path with Recommended First Lesson deep link, and post-submission collapsible Item-by-Item Review).
  - Fixed auth-to-onboarding redirect race in `src/pages/VerifyEmailPage.tsx` so verified signups transition smoothly through `/auth/success` -> `/onboarding`.
  - Connected `src/pages/learner/LearnerHomePage.tsx` and `src/pages/learner/SettingsPage.tsx` to saved onboarding preferences and 5-skill assessment results; added `/assessment` -> `/diagnostic` alias in `src/App.tsx` and updated `src/services/storage/d1ApiRepository.ts` and `src/i18n/translations.ts`.
- **Missing Backend Capabilities & Known Limitations (Honestly Handled)**:
  - **Server-Side Audio STT / Acoustic Pronunciation Scoring**: No backend Whisper/Cloud STT or phoneme-level acoustic scoring API exists. Speaking assessment records locally via `MediaRecorder` and evaluates transcript clarity via `POST /api/speaking/evaluate` only when browser `SpeechRecognition` AND server `GEMINI_API_KEY` are available; otherwise marks Speaking honestly as `Not assessed yet` / `Service unavailable` without fabricating scores.
  - **Pre-Recorded Listening Audio Assets / Server TTS**: Listening clips use real browser `window.speechSynthesis` with Play/Replay/Slow controls and explicit Skip/Unavailable fallback (`Not assessed yet` when skipped or unsupported).
  - **Cloudflare D1 Persistence**: In local development without `VITE_API_BASE_URL`, onboarding and assessment records persist via `LocalPersistenceRepository` (`localStorage`); D1 persistence requires deploying `worker/index.ts` and configuring `VITE_API_BASE_URL`.
  - **Additional Target Languages**: Only English has an active curriculum and assessment; Spanish, French, German, Japanese, Korean, and Arabic are transparently labeled as upcoming roadmap tracks.

### Part 05 — Learner Main Dashboard ("AI Communication Intelligence Command Center", `/app`)
- **Completed**:
  - Audited and verified all 6 previously modified auth/storage files (`src/pages/AuthPage.tsx`, `src/pages/ResetPasswordPage.tsx`, `src/services/authApi.ts`, `src/services/storage/repository.ts`, `src/services/storage/localRepository.ts`, `src/context/AuthContext.tsx`) — all auth/reset/hydration flows compile cleanly and integrate with existing Part 04 and learner architecture; added missing `hydrationError` / `retryHydration` recovery path in `AuthContext.tsx` and `RequireAuth` in `src/App.tsx`.
  - Created pure decoupled dashboard intelligence module `src/domain/dashboardIntelligence.ts` + deterministic unit tests `src/domain/dashboardIntelligence.test.ts` (7/7 tests passing; 75/75 total suite tests passing) covering strictly real today-only learning metrics, deterministic Next Best Move recommendations, real learner notification derivation, 7-day trend sufficiency (`>= 2` active days), Academy path timeline preview, and instant workspace search.
  - Upgraded responsive application shell `src/components/layout/LearnerShell.tsx` (preserving props compatibility for all existing `/app/*` routes): accessible `"Skip to main content"` link + `<main id="learner-main-content">` landmark, `aria-haspopup` popover triggers, sticky collapsible desktop sidebar (`256px` / `76px`), tablet/mobile slide-over drawer, compact `56px` mobile bottom bar (`Home`, `Learn`, `Speak`, `Improve`, `Progress` — `<= 14%` viewport sticky ratio), live command search across Academy lessons/Transfer Lab scenarios/Mistake Memory, real client-derived Notification Center with `localStorage`-persisted read/unread state, quick Help popover, `EN / বাংলা` toggle, User Account menu, and honest Coming-Soon dialog for unbuilt modules (`Vocabulary`, `Community`, `Subscription`).
  - Built modular Command Center widgets in `src/components/dashboard/` wrapped in reusable bilingual `src/components/common/WorkspaceErrorBoundary.tsx`:
    - `LvIntelligenceCoreHero.tsx`: Signature welcome hero with lightweight custom 3D holographic SVG **LV Intelligence Core**, desktop mouse parallax (`prefers-reduced-motion` static fallback), real contextual status line, and single primary `"Continue Learning"` CTA.
    - `TodayCommandWidget.tsx`: `"Your Learning Today"` with animated SVG daily goal progress ring, real today minutes/lessons/activities/streak, and honest first-day empty state.
    - `CommunicationDnaWidget.tsx`: Personal Intelligence Profile separating Self-Estimated Level vs. Measured Assessment Result, live `SkillRadarChart`, 6-skill breakdown (`Vocabulary`, `Grammar`, `Reading`, `Listening`, `Speaking`, plus `Writing` honestly marked `"Not assessed yet"`), and evidence-backed Strengths/Opportunities.
    - `DashboardModulePreviews.tsx`: Deterministic `"Your Next Best Move"`, Learning Path & Academy timeline, Mistake Memory `"Your Learning Patterns"`, Speaking Studio preview (stylized waveform + live `/api/speaking/health` loading indicator, unconfigured notice, and retryable connection error state; never activates mic), Transfer Lab scenarios preview, Vocabulary & Spaced Repetition honest preview, 7-Day Progress & Analytics preview (`>= 2` active days gate), and compact Verified Achievements + honest Community planned-module row.
  - Rebuilt `src/pages/learner/LearnerHomePage.tsx` composing the full Command Center cleanly across desktop, tablet, and mobile viewports with zero console errors and zero fabricated metrics.
- **Blocked / Unbuilt Backend Integrations (Honestly Reflected in UI)**:
  - **Dedicated Spaced-Repetition Vocabulary Deck Backend**: Spaced repetition runs on Academy lessons and Mistake Memory drills; standalone vocabulary flashcard decks are marked as upcoming without fake review counts.
  - **Community Discussions / Study Groups Backend**: No community backend exists; displayed honestly as a planned module with zero synthetic posts or member counts.
  - **Push / Server Notification Queue**: Notifications are derived honestly from real current learner state with client-persisted read status (`localStorage`).
  - **Subscription / Billing Portal**: Accounts operate on the active free workspace; payment/billing gateway is not yet connected.
  - **Dedicated Writing Assessment Scorer**: Writing is transparently shown as `"Not assessed yet"` inside Communication DNA.

### Part 06 — Academy: Courses, Lessons & Exercises ("The Learning Universe", `/app/learn`, `/app/learn/course/:courseId`, `/app/learn/:lessonId`)
- **Completed & Red-Team Audited**:
  - Pure decoupled Academy domain module `src/domain/academyEngine.ts` + deterministic unit tests `src/domain/academyEngine.test.ts` (9/9 Academy tests passing; 84/84 total repository unit tests passing) covering strictly verified course completion (never counting enrollment, bookmarks, drafts, or failed `< 60%` / `needs_review` assessments as completed), multi-facet course search/filtering/sorting, honest 8-category availability mapping, priority-ordered Continue Learning resolution, sequential Learning Path progression, evidence-based Recommendations (`due_review` -> `mistake_memory` -> `diagnostic` -> `foundation`), verified Recently Completed history, Course Detail curriculum view model, and Previous/Next lesson navigation.
  - User-scoped local Academy state persistence `src/services/academyStateStore.ts` (`enrolledCourseIds`, `bookmarkedLessonIds`, and safe stage `lessonDrafts` including `guidedResponses` & `independentResponses` for lossless Save & Exit resume) stored under `linguaverse_academy_state_v1:<userId>` and purged cleanly on `clearAccount()`.
  - Academy Home (`src/pages/learner/AcademyPage.tsx` + `/academy` alias), Course Detail & Curriculum (`src/pages/learner/CourseDetailPage.tsx`), and 7-stage Interactive Lesson Player (`src/pages/learner/LessonPlayerPage.tsx` & `src/components/academy/LessonMasteryStage.tsx`) with `AcademyUniverseHero` (`prefers-reduced-motion` static fallback), `CourseArtworkCard`, collapsible Course Outline switcher, strict stage gating across Guided -> Independent -> Assessment -> Mastery, answer hiding prior to Stage 6 grading, single-attempt mastery strictly capped at `<= 45%`, and real-time Dashboard / Mistake Memory / Communication DNA synchronization.
  - Server-side Contextual AI Lesson Coach endpoint `POST /api/academy/assist` + `GET /api/academy/assist/health` (`server.ts`, `server/geminiAcademyAssist.ts`, `src/services/academyAssistApi.ts`) hardened with:
    - Mandatory server-side session authentication (`lv_session_token` HttpOnly cookie or Bearer token; returns `401 UNAUTHORIZED` for unauthenticated/revoked sessions).
    - Bounded per-user sliding-window rate limiting (`12 req/min` per authenticated user ID with `Retry-After` on `429`).
    - Strict input allowlist validation (`activeStage`, `explanationLanguage`, non-empty bounded `question`, `lessonId` resolved authoritatively on the server from curriculum metadata so client-tampered lesson rules are ignored).
    - Delimiter-escaped untrusted learner input (`<learner_question>`) with anti-prompt-injection and universal/Assessment-stage anti-cheat system guardrails (`academy-assist-v1.1`, `gemini-4-hydrogen` primary with `gemini-3.1-flash-lite` fallback).
    - Client-side privacy consent enforcement (`privacyConsent.logAiEvaluations`) before recording `academy_assist` telemetry.
- **Verified Architectural Limitations & Remaining Production Requirements (Honest Audit Scope)**:
  - **Local-Only Persistence in Current Environment**: `VITE_API_BASE_URL` is unset in this runtime, so both core learning records (`linguaverse_d1_local_db_v1`) and Academy UI state (`linguaverse_academy_state_v1:<userId>`) persist in browser `localStorage` only (no cross-device cloud sync is active). Only Express auth/CMS stores persist server-side (`.data/auth-store.json`, `.data/cms-store.json`).
  - **Cloudflare Worker Parity Not Yet Implemented for Part 06**: `worker/index.ts` and `schema.sql` do not yet include `/api/academy/assist`, `/api/academy/assist/health`, or server-side course enrollment, lesson bookmark, and mid-lesson draft tables/endpoints.
  - **Standalone Reading, Writing & Acoustic Pronunciation Courses**: No standalone Academy courses exist for these three categories yet; transparently labeled `"0 courses / No courses yet"` without fabricated items.
  - **Additional Learning Languages**: Only `English (Bangla-Guided)` courses are published; no fake multilingual catalog entries are rendered.
  - **Repository Documentation**: No separate `PRD.md` exists in the repository; `STATE.md`, `README.md`, and `DEPLOYMENT.md` are the active docs.

### Part 07 — AI Speaking Studio ("The Linguaverse AI Voice Universe", `/app/speak`)
- **Completed & Verified**:
  - Extended the existing `/app/speak` route (`src/pages/learner/SpeakStudioPage.tsx`), `src/domain/speakingScenarios.ts`, `src/domain/speakingEvaluation.ts`, `src/services/speakingApi.ts`, `src/utils/audioBlobStore.ts`, `src/services/storage/localRepository.ts`, and `server.ts` without creating duplicate routes, voice services, or AI endpoints.
  - Added pure decoupled Speaking Studio domain engine `src/domain/speakingStudioEngine.ts` + deterministic unit tests `src/domain/speakingStudioEngine.test.ts` (6/6 new tests passing; 90/90 total suite tests passing) covering strictly real Speaking Overview metrics, `>= 2` completed session trend gating, 10-scenario search/category/difficulty filtering, evidence-based session recommendations, deterministic word-level Pronunciation transcript comparison, confidence-gated session results (`>= 0.70` Mistake Memory vs. `< 0.70` optional AI suggestions), and prompt-injection text sanitization.
  - Added user-scoped draft persistence `src/services/speakingStateStore.ts` (`linguaverse_speaking_state_v1:<userId>`, purged cleanly in `clearAccount()`), enabling lossless mid-session `"Save Draft & Exit"` and post-reload `"Resume Draft"`.
  - Built signature Voice Universe UI components (`src/components/speaking/`):
    - `VoiceUniverseOrb.tsx`: 3D-inspired holographic SVG Voice Orb reflecting real app states (`idle`, `listening`, `thinking`, `speaking`, `paused`, `error`, `unavailable`), `prefers-reduced-motion` static fallback, `aria-live="polite"` non-color-only state readouts, and genuine Web Audio API `AnalyserNode` `LiveMicrophoneWaveform` (zero fake mic waveforms).
    - `SpeakingHomeHero.tsx`: `"Find Your Voice. Build Your Confidence."` hero + verified 4-metric overview strip.
    - `ScenarioLibrarySection.tsx`: 10 configured Everyday, Professional, Academic, and Travel roleplay scenarios with search, category, and difficulty filtering.
    - `PronunciationPracticePanel.tsx`: Word & sentence articulation drills with Bangla-L1 tips, `0.75x`/`1.0x` browser TTS reference playback, real `MediaRecorder` voice capture + self-playback, deterministic word-level transcript match, and explicit non-acoustic capability disclosure.
    - `SpeakingSessionResults.tsx`: Post-session results view with verified duration, evaluation dimensions (each showing exact source and limitations), 3-column corrected vs. natural upgrades, confidence-gated Mistake Memory sync, Communication DNA evidence preview, and actionable links.
    - Upgraded `TurnEvaluationCard.tsx` to separate high-confidence confirmed mistakes (`>= 70%`) from low-confidence optional AI suggestions (`< 70%`).
  - Hardened `POST /api/speaking/evaluate` (`server.ts`, `src/domain/speakingEvaluation.ts`, `src/services/speakingApi.ts`, `src/utils/audioBlobStore.ts`):
    - Mandatory server-side session authentication (`lv_session_token` cookie or Bearer token; returns `401 UNAUTHORIZED` for unauthenticated/logged-out callers).
    - Bounded per-user sliding-window rate limiter (`25 req / 5 min`, `Retry-After` on `429`).
    - Strict allowlist validation for `modeId`, `inputChannel`, `explanationLanguage`, `learnerLevel`, and bounded `userTranscript`/`history`.
    - Untrusted learner speech wrapped in `<learner_utterance>` / `<conversation_history>` delimiters with sanitized tag stripping and anti-prompt-injection instructions (verified via live Gemini PoC).
    - Client recording guardrails: 120-second auto-stop cap, 10 MB / `audio/*` blob validation (`validateAudioBlob`), user-scoped IndexedDB blob keys (`audio_<userId>_<sessionId>_<turnId>`), and recording/transcript preservation on network/API failure with Retry.
- **Verified Architectural Limitations & Remaining Production Requirements (Honest Audit Scope)**:
  - **No Acoustic Phoneme / Accent Scoring Engine or Server-Side STT**: Only recognized text transcripts (from browser `SpeechRecognition` or typed fallback) are evaluated by Gemini; no Whisper/Cloud STT or acoustic phoneme engine exists. Pronunciation Practice Lab and Speaking Results explicitly disclose this boundary and never fabricate phoneme percentages or native-accent scores.
  - **Browser-Dependent Live STT & TTS**: Live speech-to-text relies on browser `SpeechRecognition` / `webkitSpeechRecognition` (with full editable text fallback when unavailable), and AI voice playback relies on browser `window.speechSynthesis`.
  - **Local-Only Persistence in Current Environment**: `VITE_API_BASE_URL` is unset, so speaking sessions/mistakes persist in browser `localStorage` (`linguaverse_d1_local_db_v1`), voice recordings persist locally in IndexedDB (`linguaverse_audio_v1`), and unfinished drafts persist in `localStorage` (`linguaverse_speaking_state_v1:<userId>`).
  - **Cloudflare Worker Parity**: `worker/index.ts` already includes `/api/v1/speaking/evaluate`, D1 speaking tables, and R2 audio storage, but should be mirrored with the 3 new `SpeakingModeId` values (`academic_discussion`, `presentation_pitch`, `travel_airport_assistance`) and `<learner_utterance>` confidence-gating updates before Cloudflare production deployment.

### Part 08 — AI Conversation Interface ("Speak Naturally. Think Clearly. Communicate Confidently.", `/app/speak`)
- **Audit Status (Verified 30-Requirement Score): 26/30 COMPLETE (86.7%) · 1 PARTIAL · 3 UNVERIFIED · 0 MISSING · 0 BLOCKED**:
  - Extended the existing `/app/speak` route (`src/pages/learner/SpeakStudioPage.tsx`) and `POST /api/speaking/evaluate` backend without creating duplicate routes, conversation stores, or AI providers.
  - Added pure decoupled Part 08 context engine `src/domain/conversationContextEngine.ts` + deterministic unit tests `src/domain/conversationContextEngine.test.ts` (6/6 new tests passing; 96/96 total suite tests passing) covering bounded rolling conversation context summarization, safe vocabulary phrase highlighting, history search filtering, honest live status derivation, and backend-validated correction style modes (`gentle`, `detailed`, `conversation_first`).
  - Upgraded `POST /api/speaking/evaluate` (`server.ts`, `src/domain/speakingEvaluation.ts`) with strict allowlist validation for `correctionStyle` (`400 INVALID_CORRECTION_STYLE`) and bounded `<earlier_conversation_summary>` (`<= 800` chars) delimiter-isolated context. Verified live with Gemini (`gemini-4-hydrogen` Turn 1 + `gemini-3.1-flash-lite` Turn 2 context continuity).
  - Extended user-scoped state in `src/services/speakingStateStore.ts` with persisted `correctionStyle` and `savedVocabulary` (`setUserCorrectionStyle`, `saveConversationVocabulary`, `removeConversationVocabulary`, purged cleanly on `clearAccount()`).
  - Built modular 3-panel AI Conversation Workspace (`src/components/speaking/`):
    - `ConversationHistorySidebar.tsx`: Collapsible left panel with `New Conversation`, live History Search, Saved Draft recovery card, Recent Conversations list, and Scenario Shortcuts.
    - `ConversationMessageStream.tsx`: Semantic `role="log" aria-live="polite"` stream with AI Coach bubbles (clickable vocabulary highlights, TTS `Listen`/`Stop`, `Copy`, Bangla `Explain` toggle, `Save`), Learner bubbles (channel label, timestamp, IndexedDB local audio replay, `Copy`, expandable inline Learning Feedback with Corrected Sentence, Natural Alternative + Save, confidence-gated Confirmed Mistakes `>= 70%` wired to `"Report Incorrect AI Feedback"`, Optional Suggestions `< 70%`, Strengths, and honest non-acoustic note), plus genuine AI Processing indicator.
    - `ConversationContextSidebar.tsx`: Collapsible right panel with Scenario Objective, Useful Vocabulary (one-click Save/Saved), Saved Vocabulary Vault, Session Grammar & Rolling Context indicator, Backend-wired Correction Preference radio group (`Gentle` / `Detailed` / `Conversation-First`), and Transparent Privacy Notice.
    - Upgraded `VoiceUniverseOrb.tsx` (`size="compact"` holographic cyan/violet glass rim + swirl + constellation) and `SpeakingSessionResults.tsx` (`Learner Messages`, `AI Replies`, `Saved Vocabulary & Useful Phrases`, and non-CEFR honesty disclaimer).
  - Hardened `server.ts`, `vite.config.ts`, and `src/domain/authSecurityEngine.ts`: CLI `--port`/`--host` precedence over inherited container `PORT=8080`, explicit `ws: false` + `hmr: false` + `watch: null` when `DISABLE_HMR=true` (eliminating port `24678` collisions on restart), fast `GET /api/health`, graceful `SIGTERM`/`SIGINT` shutdown, Vite 8 `import.meta.dirname`, and Node 22 native strip-types compatibility for `node server.ts`.
- **Audited Non-Complete Items & Remaining Production Work (Honest Scope)**:
  - **Session Persistence (PARTIAL)**: Browser-local reload persistence (`localStorage` + IndexedDB) is implemented and browser-verified; cross-device server-side database persistence is not active in the local Express runtime (`VITE_API_BASE_URL` unset) and `worker/index.ts` / `schema.sql` do not yet persist Part 08 `correctionStyle` and `savedVocabulary` in Cloudflare D1.
  - **Voice Input, Speech Transcription & AI Audio Playback (UNVERIFIED in headless container)**: Code is implemented (`MediaRecorder`, Web Audio `AnalyserNode`, browser `SpeechRecognition`, `window.speechSynthesis`, and verified explicit Mic Privacy Consent banner), but headless Linux has no microphone hardware and `0` OS speech synthesis voices (`speechSynthesis.getVoices().length === 0`), so real microphone capture, live STT, and audible TTS must be verified on a real desktop/mobile browser with audio hardware.
  - **Repository / Docs Notes**: No `PRD.md` file exists in the repository (only `STATE.md`, `README.md`, `DEPLOYMENT.md`), and no `.git` repository or GitHub remote is configured in this workspace.

### Part 09 — Mistake Memory Engine ("Your Mistakes Remembered. Your Progress Reimagined.", `/app/improve`)
- **Completed & Verified Implementation**:
  - Upgraded the existing `/app/improve` route (`src/pages/learner/ImprovePage.tsx`) in place without creating duplicate routes, stores, or AI providers.
  - Added decoupled pure analytics engine `src/domain/mistakeAnalyticsEngine.ts` + deterministic unit tests `src/domain/mistakeAnalyticsEngine.test.ts` (5 new tests passing; 101/101 total suite tests passing) covering:
    - Honest empty-state KPI computation (`improvementRatePercent: null`, mutually exclusive Hero Grammar/Vocabulary/Speaking pillars summing cleanly to 100%, 7-day real daily sparklines).
    - Extended 7-category classification (`verb_tense`, `prepositions`, `articles`, `word_order`, `vocabulary`, `sentence_structure`, plus explicit `pronunciation` / clarity detection without fabricating acoustic phoneme scores).
    - Real 7-day / 30-day trend series (`buildMistakeTrendSeries`) gated strictly on `>= 2` distinct active days (`hasSufficientTrendData`).
    - Interactive Neural Memory Network relationship graph (`buildNeuralRelationshipMap`) connecting Memory Core, active categories, Bangla-L1 cross-category transfer links, and top recurring mistake nodes.
    - Smart Spaced Revision Schedule (`buildSmartRevisionSchedule`: `overdue`, `dueToday`, `upcomingWeek`, `maintenance`, `topRecommended`, `recurringSpotlight`) and multi-facet search/sorting (`filterAndSearchMistakes`).
  - Built real server-side Gemini AI Learning Coach & Personalized Exercise endpoints (`server/geminiMistakeCoach.ts`, `server.ts`, `src/services/mistakeCoachApi.ts`):
    - `GET /api/mistakes/coach/health`
    - `POST /api/mistakes/coach`: mandatory session auth (`401`), bounded sliding-window per-user rate limit (`429` + `Retry-After`), strict input validation (`400`), `<learner_message>` / `<mistake_context>` / `<chat_history>` prompt-injection isolation, `gemini-4-hydrogen` (`ThinkingLevel.LOW`) primary + `gemini-3.1-flash-lite` fallback; verified live `200` bilingual EN + বাংলা response.
    - `POST /api/mistakes/generate-exercise`: authenticated, rate-limited Gemini endpoint generating fresh 2-part custom repair exercises (3-option MCQ + contextual active rewrite with Bangla hint & bilingual explanation) that record progress back into `recordMistakeDrillAttempt`; verified live `200` response.
  - Built modular futuristic Part 09 UI components (`src/components/improve/`):
    - `MistakeBrainHero.tsx`: Glassmorphic midnight-navy/cyan/violet/magenta hero with interactive 3D-layered SVG Glowing Neural Brain, dual 3D orbit rings, desktop pointer parallax (`prefers-reduced-motion` static fallback), floating real-data Grammar/Vocabulary/Speaking stat cards, headline `"Your Mistakes Remembered. Your Progress Reimagined."`, subtitle `"Understand, fix and never repeat your mistakes again."`, and primary `"Start Practicing"` CTA.
    - `MistakeAnalyticsVisuals.tsx`: 4 KPI sparkline cards (`Total Mistakes`, `Recurring Habits`, `Practicing`, `Improved`), Improvement Rate radial ring, 7D/30D dual-line trend graph with hover inspection and honest `< 2` day gate, interactive click-to-filter Category Donut chart, and interactive Neural Memory Network relationship map with node inspector.
    - `MistakeRevisionAndRecurringPanel.tsx`: Recurring Mistakes spotlight (`occurrences >= 2`), Recommended Practice spotlight card, and Smart Spaced Revision Schedule.
    - `MistakeAiCoachPanel.tsx`: Holographic AI Learning Coach avatar (`prefers-reduced-motion` safe), context-aware quick-ask prompts, live multi-turn Gemini Q&A, and interactive AI Custom Exercise studio.
    - Preserved `MistakeMicroDrillPanel.tsx`, `?focus=<mistakeId>` deep linking, related Academy lesson deep links, and `"Report False Correction"` / `"Undo False Flag"` workflow.
  - Hardened `src/i18n/LanguageContext.tsx` so undefined/invalid `preferredUiLanguage` values safely default to `'en'` instead of throwing on `translations[lang]`.
- **Honest Scope & Remaining Production Notes**:
  - **Local Persistence in Express Dev Runtime**: Mistake records and drill attempts persist locally in `localStorage` (`linguaverse_d1_local_db_v1`) when `VITE_API_BASE_URL` is unset; Cloudflare Worker parity for `/api/mistakes/coach` and `/api/mistakes/generate-exercise` should be mirrored into `worker/index.ts` before deploying to Cloudflare Workers/D1.
  - **Pronunciation Transparency**: The `Pronunciation & Clarity` category tracks transcript/text clarity notes captured by Speaking Studio only; no acoustic phoneme scoring engine exists or is fabricated.

### Part 11 — Transfer Lab ("Turn Your Knowledge Into Real Communication.", `/app/transfer-lab`)
- **Completed & Verified Implementation**:
  - Upgraded the existing `/app/transfer-lab` route (`src/pages/learner/TransferLabPage.tsx`) in place while preserving Phase 5 `TRANSFER_SCENARIOS` compatibility, existing `VerifiedGamificationPanel`, and all Part 08/09/10 routes and data stores.
  - Added pure decoupled Part 11 domain engine `src/domain/transferLabUniverseEngine.ts` + deterministic unit tests `src/domain/transferLabUniverseEngine.test.ts` (6/6 new tests passing; 104/104 total repository unit tests passing) covering:
    - 6 Scenario Universe categories and 30 structured real-world scenarios (`Daily Life` 6, `Travel & International` 5, `Professional Communication` 6, `Customer & Service` 5, `Education & Learning` 4, `Emergency & Problem Solving` 4), each with measurable objective criteria (including the exact 5 Restaurant Conversations objectives), AI participant persona, learner role, helpful phrases, and target skills.
    - Real-data KPI engine (`computeTransferDashboardMetrics`) returning honest empty/null states whenever no verified attempts exist.
    - Personalized scenario adaptation (`buildPersonalizedTransferAdaptation`) prioritizing active Part 09 Mistake Memory patterns, then Part 10 Communication DNA (`buildCommunicationDnaLab`) weak nodes, then Academy progress, then honest baseline.
    - Anti-fabrication objective progression (`mergeObjectiveUpdates`) and evidence-based 8-dimension session evaluation normalizer (`normalizePart11SessionEvaluation`) distinguishing Task Completion from Language Correctness and keeping unsupported dimensions strictly `Not Evaluated` (`score: null`).
  - Added per-user session draft & 2D/3D stage preference persistence `src/services/transferSessionStore.ts` (`linguaverse_transfer_state_v1:<userId>`, cleaned up on `AuthContext.clearAccount()`), optional transcript persistence on `TransferAttemptRecord`, and `MISTAKE_MEMORY_MIN_CONFIDENCE` (`0.70`) filtering when syncing Transfer Lab mistakes into Part 09 Mistake Memory (`src/services/storage/localRepository.ts`).
  - Built hardened server-side Gemini Transfer Lab routes (`server/geminiTransferLab.ts`, `server.ts`, `src/services/transferApi.ts`):
    - `GET /api/transfer/health`: Live AI, transcription, and TTS readiness check.
    - `POST /api/transfer/turn`: Multi-turn AI participant conversation (`gemini-4-hydrogen` primary + `gemini-3.1-flash-lite` fallback) with objective progress tracking.
    - `POST /api/transfer/session-evaluate`: Evidence-based 8-dimension + objective criteria evaluation separating Task Completion from Language Correctness.
    - `POST /api/transfer/transcribe`: Server-side speech-to-text (`gemini-3.5-transcribe`) with bounded base64/MIME validation.
    - `POST /api/transfer/tts`: Server-side speech synthesis (`gemini-3.8-flash-lite-tts`, unary WAV) for AI participant playback.
    - Hardened `POST /api/transfer/evaluate` alongside all new POST routes with mandatory session auth (`401`), per-user sliding-window rate limiting (`40 req / 5 min`, `429` + `Retry-After`), strict allowlist/input validation (`400`), and XML delimiter prompt-injection isolation.
  - Built modular Part 11 UI components (`src/components/transfer/`):
    - `TransferLabCanvas3D.tsx`: Lazy-loaded Three.js 3D Communication Transfer Hub (6 composite realm nodes + central transfer core + neural bridges + instanced particles + `RoomEnvironment` PBR + software-WebGL frame pacing + `prefers-reduced-motion` pause + accessible 2D Map toggle & WebGL fallback).
    - `TransferDashboardHero.tsx`: Hero banner, learner greeting, target language, current learning objective, 3D/2D Transfer Hub, `"Resume Previous Session"` banner (only when a valid draft exists), 5 real-data KPI cards, personalized recommendation, and recent practice activity.
    - `ScenarioUniverseExplorer.tsx`: 6 category tabs, 30 scenario cards, search, difficulty/skill/duration/status filters, sort, and live AI health status.
    - `ImmersiveScenarioRoom.tsx`: Split Mission Control + sticky Conversation Stage, live timer, Pressure Ladder selector, measurable Objectives checklist, Personalized Adaptation cues, Helpful Phrases, Save Draft & Exit, End & Evaluate Session (gated on `>= 1` learner turn), Text Mode + Voice Mode (explicit microphone consent, separate local retention consent, `MediaRecorder`, Web Audio `AnalyserNode` level meter, server/browser transcription, delete recording, non-acoustic pronunciation disclaimer, and server/browser AI TTS playback).
    - `TransferEvaluationReport.tsx`: Task Outcome vs. Language Correctness summary, documented scoring methodology disclosure, per-objective criteria evidence table, all 8 evidence-based dimension cards, confidence-gated Mistake Memory sync (`>= 70%`) with `/app/improve` link, Communication DNA evidence notice with `/app/progress` link, and saved transcript inspection.
- **Honest Scope & Remaining Production Notes**:
  - **Local Persistence in Express Dev Runtime**: When `VITE_API_BASE_URL` is unset, completed Transfer Lab attempts persist in browser `localStorage` (`linguaverse_d1_local_db_v1`), audio clips persist locally in IndexedDB (`linguaverse_audio_v1`), and unfinished drafts persist in `localStorage` (`linguaverse_transfer_state_v1:<userId>`).
  - **Cloudflare Worker Parity Pending for Part 11**: `worker/index.ts` and `schema.sql` do not yet mirror `/api/transfer/health`, `/api/transfer/turn`, `/api/transfer/session-evaluate`, `/api/transfer/transcribe`, `/api/transfer/tts`, or server-side multi-turn Transfer draft persistence.
  - **Hardware Voice Capture & Acoustic Scoring**: Live microphone recording and audible speaker playback could not be exercised on real audio hardware in the headless Linux test container; text transcripts never produce fabricated acoustic pronunciation accuracy scores.
  - **Admin Content Management for Transfer Scenarios**: Part 11 scenarios are currently curated in the code catalog (`transferLabUniverseEngine.ts`); dedicated Admin CMS CRUD for Transfer scenarios is not yet wired into `/admin`.

### Part 12 — Communication Replay ("Every Conversation Is an Opportunity to Improve.", `/app/replay`, `/replay`)
- **Completed & Verified Implementation (Master Production-Grade Upgrade)**:
  - Unified Communication Replay workspace at `/app/replay` (`src/pages/learner/CommunicationReplayPage.tsx`, `/replay` alias in `src/App.tsx`, `Replay` primary nav link in `src/components/layout/LearnerShell.tsx`, and `"Open Full Replay"` / `"Open in Replay"` deep links from Part 08 `CommunicationReplayPanel.tsx` and Part 11 `TransferLabPage.tsx` History).
  - Reuses real Part 08 `SpeakingSessionRecord` and Part 11 `TransferAttemptRecord` sessions strictly read-only alongside Part 09 `MistakeMemoryItem` cross-links and Part 10 Communication DNA (`/app/progress`) — opening or reviewing a saved replay **never** mutates historical transcripts, evaluations, or creates duplicate assessment evidence, mistakes, or XP ledger entries.
  - Pure decoupled domain engine `src/domain/communicationReplayEngine.ts` + deterministic unit tests `src/domain/communicationReplayEngine.test.ts` (12/12 tests passing) covering:
    - Strict user-ownership enforcement on sessions (`authorizeReplaySessionAccess`) and IndexedDB audio keys (`isAuthorizedAudioBlobKey`, requiring `audio_<userId>_` prefix + matching session owner).
    - Honest 4-state audio availability classification (`available`, `missing_recording`, `text_only`, `unauthorized`) and real measured PCM waveform peak extraction (`computeWaveformPeaksFromChannelData`) with zero fabricated audio recordings or fake waveforms.
    - Graceful handling of missing transcripts, legacy single-response Transfer Lab attempts (never fabricating turn timestamps), and missing/incomplete evaluations without fabricating scores or placeholder dialogue.
    - Safe structured transcript search & highlighting (`searchReplayTranscript`, `highlightTranscriptSegments`), speaker filtering (`filterReplayTurnsBySpeaker`), advanced multi-facet library filters (source, date range `7d`/`30d`/`90d`, scenario category, audio, transcript, evaluation, review status, `recently_reviewed` sort), pagination (`paginateReplaySessions`), real-data Recommended Session selection (`selectRecommendedReplaySession`), Part 10 Communication DNA Evidence Trace (`buildReplayDnaEvidenceTrace`), and privacy-scoped JSON export (`buildSessionExportPayload`).
  - Isolated per-user replay review & practice store `src/services/replayStateStore.ts` (`linguaverse_replay_state_v1:<userId>`, cleared in `AuthContext.clearAccount()`) storing idempotent review progress (`unreviewed` | `in_review` | `reviewed`, `startedReviewAt`, `reviewedAt`, `lastReviewedTurnId`, `reviewedComparisonIds[]`, `learnerNote`) AND strictly separate `practiceAttempts[]` (`ReplayPracticeAttemptRecord`).
  - Hardened server-side Gemini Replay Coach routes (`server/geminiReplayCoach.ts`, `server.ts`, `src/services/replayApi.ts`):
    - `GET /api/v1/replay/health`: Live AI readiness and honest `cloudSyncActive: false` disclosure.
    - `POST /api/v1/replay/ai-assist`: Authenticated (`401`), rate-limited (`429`), XML-sanitized on-demand Gemini `correction_deep_dive` (Formal/Informal/Vocabulary/Contextual/Example/Practice Challenge) and `summarize_session`.
    - `POST /api/v1/replay/practice-attempts`: Authenticated (`401`), rate-limited (`429`), XML-sanitized Gemini feedback on Response Replay Practice attempts (kept strictly separate from historical session records).
    - `DELETE /api/v1/replay/sessions/:sessionId/recording`: Authenticated (`401`) server audit acknowledgment paired with authorized browser-local IndexedDB blob deletion (`storageScope: 'browser_local_indexeddb'`, `cloudStorageDeleted: false`).
  - Modular dark-glassmorphism, mobile-responsive components (`src/components/replay/`):
    - `ReplayLibrarySidebar.tsx`: Saved Session Library with search, source/review/audio/date/category/transcript/evaluation filters, 5 sort modes, unboxed metadata, and `Load More` pagination.
    - `ReplayAudioPlayer.tsx`: Real Web Audio `decodeAudioData` RMS waveform scrubber (falling back honestly to a neutral timeline if decode fails — never fabricated peaks), Play/Pause/±5s/Seek, speeds `0.75x`–`2x`, `mm:ss / mm:ss`, keyboard controls, multi-turn recording switcher, and exact required unavailable copy.
    - `ReplayTranscriptTimeline.tsx`: Speaker-separated timeline, speaker filter (`All`/`You`/`AI`), search + match navigation, copy message, provenance indicator, valid-timestamp-only display, audio player sync, and practice shortcut.
    - `ReplayMistakeAndDiffPanel.tsx`: Category-filtered Mistake Timeline with detection source + Part 09 Mistake Memory status/deep links, plus full Correction Lab (`ORIGINAL RESPONSE` immutable, `CORRECTED RESPONSE`, `WHY IT NEEDED IMPROVEMENT`, `MORE NATURAL ALTERNATIVE` suggested, `Mark Reviewed` toggle, on-demand Gemini AI Deep-Dive, and `Practice This Response`).
    - `ReplayPracticePanel.tsx`: Turn selector, Hide/Show Correction active-recall toggle, text practice composer, Save Practice Attempt (offline-capable) + optional Gemini AI Practice Feedback, and Separate Practice Attempt History.
    - `ReplayAnalysisAndPracticePanel.tsx`: Clearly separated Learner Self-Reflection, Saved Historical Assessment, Newly Generated On-Demand AI Summary, Part 10 Communication DNA Evidence Trace (explicitly marking Acoustic Pronunciation & Listening Comprehension as not updated from text-only records), Practice & Retry links, Export Session JSON (audit logged), and two-step Authorized Local Recording Deletion (IndexedDB cleanup + audit log + server notification).
- **Honest Scope & Remaining Production Limitations**:
  - **Browser-Local Storage Only**: Sessions, replay review status/notes, separate practice attempts, and IndexedDB audio blobs persist locally in the browser (`localStorage` + `linguaverse_audio_v1`); Cloudflare D1/R2 cross-device sync is not deployed or active in this runtime (`REPLAY_CLOUD_SYNC_CONTRACT.deploymentStatus = 'not_deployed_local_only'`).
  - **Hardware Audio Playback & Mic Capture Untested**: Real microphone capture and physical speaker playback have not been hardware-tested in this headless Linux environment; audio player waveform decoding and playback controls were verified with real generated PCM WAV blobs in headless Chromium.
  - **Transcript-Only Pronunciation Boundary**: No acoustic pronunciation or phoneme engine is active; replay never claims acoustic pronunciation or voice-similarity scoring from transcripts.
  - **Git / Cloudflare Deployment Blocked in Container**: This workspace has no `.git` repository and `wrangler` CLI is not installed, so GitHub push and Cloudflare deployment cannot be executed from this environment.

---

## Security & Privacy Verification Checklist
- [x] API keys (`GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_PROVIDER_API_KEY`, `JWT_SIGNING_SECRET`) strictly server-side (`server.ts` / Cloudflare Workers Secrets); verified absent from built client bundle (`dist/`).
- [x] `POST /api/speaking/evaluate` enforces server-side session authentication (`401`), per-user sliding-window rate limiting (`429` + `Retry-After`), strict allowlist validation (`400`), and `<learner_utterance>` prompt-injection isolation.
- [x] `POST /api/academy/assist` enforces server-side session authentication (`401`), per-user rate limiting (`429` + `Retry-After`), strict allowlist validation, server-authoritative lesson context lookup, and Assessment anti-cheat/prompt-injection guardrails.
- [x] `POST /api/mistakes/coach` and `POST /api/mistakes/generate-exercise` enforce server-side session authentication (`401`), bounded per-user rate limiting (`429` + `Retry-After`), strict input sanitization (`400`), and `<learner_message>` / `<mistake_context>` prompt-injection isolation.
- [x] `POST /api/transfer/evaluate`, `/api/transfer/turn`, `/api/transfer/session-evaluate`, `/api/transfer/transcribe`, and `/api/transfer/tts` enforce server-side session authentication (`401`), per-user sliding-window rate limiting (`40 req / 5 min`, `429` + `Retry-After`), strict input/MIME/size allowlist validation (`400`), and XML delimiter prompt-injection isolation.
- [x] `POST /api/v1/replay/ai-assist`, `POST /api/v1/replay/practice-attempts`, and `DELETE /api/v1/replay/sessions/:sessionId/recording` enforce server-side session authentication (`401`), per-user rate limiting (`429`), strict input validation (`400`), and XML delimiter prompt-injection isolation.
- [x] Email verification OTPs hashed via SHA-256 with 10-minute expiry, max 5 attempts, and 60-second resend rate limit; protected routes blocked until `emailVerified === true`.
- [x] Role-based access control (`hasAdminPermission` + Worker `requireAdmin`) blocks `learner` role from `/admin` controls and enforces role-scoped permissions.
- [x] Microphone permission is never requested automatically; only triggered on explicit user button click after privacy consent, with 90s–120s / 10 MB safety caps and immediate MediaStream track teardown.
- [x] Microphone recording storage honors `privacyConsent.storeMicRecordings` before writing user-scoped IndexedDB/R2 blobs.
- [x] AI telemetry honors `privacyConsent.logAiEvaluations` before logging usage events (`speaking`, `transfer`, `transfer_turn`, `transfer_session_eval`, `transfer_transcribe`, `transfer_tts`, `academy_assist`, `mistake_coach`, `dna_coach`).
- [x] Mistake Memory persistence filters AI speaking and Transfer Lab detections at `>= 0.70` confidence so low-confidence guesses are never stored as confirmed mistakes.
- [x] Account deletion verifies full IndexedDB audio purge, repository erasure, and per-user Academy (`linguaverse_academy_state_v1:<userId>`), Speaking (`linguaverse_speaking_state_v1:<userId>`), Transfer Lab (`linguaverse_transfer_state_v1:<userId>`), and Communication Replay (`linguaverse_replay_state_v1:<userId>`) state removal.
- [x] Communication Replay enforces strict user-scoped session & audio blob key ownership (`audio_<userId>_`), verifies ownership before reading or deleting IndexedDB recordings, never fabricates audio/waveforms/pronunciation scores, and keeps historical session replay strictly read-only (0 duplicate assessment evidence or XP).
- [x] Idempotent XP awards enforced via unique `idempotencyKey` in both local ledger and D1 `UNIQUE(user_id, idempotency_key)`.

---

## Parts 08–12 Final Integration & Production Readiness Audit (2026-11-25)

**Audit Scope:** Independent read-only code, API, persistence, Cloudflare configuration, security, and live browser integration audit across Parts 08 (`/app/speak`), 09 (`/app/improve`), 10 (`/app/progress`), 11 (`/app/transfer-lab`), and 12 (`/app/replay`, `/replay`). Zero application source files were modified during this audit.

### 1. Build, TypeScript, Unit Tests & Dependency Checks
- **TypeScript (`npm run lint` / `tsc --noEmit`):** PASS — `0` errors.
- **Production Build (`npm run build` / `vite build`):** PASS — clean bundle emitted to `dist/`.
- **Unit Test Suite (`npx tsx --test src/domain/*.test.ts src/services/storage/*.test.ts`):** PASS — **122/122** tests passing (`0` fail, `0` skipped, 23 test files across domain engines and storage).
- **Dependency Audit (`bun audit`):** PASS — `0` vulnerabilities across 272 packages.
- **Client Bundle Secret Scan (`dist/`):** PASS — zero leaked server secrets or real API keys (`AIza...`, `sk-...`); only UI placeholder/help text strings.
- **Git Working Tree:** BLOCKED — no `.git` repository exists in the workspace (`fatal: not a git repository`).

### 2. Verified Routes & Live Browser Integration (Desktop `1440×900` & Mobile `390×844`)
- Verified live against `http://localhost:3000` with authenticated user registration + OTP verification across:
  - `/app/speak` (Part 08 AI Conversation)
  - `/app/improve` (Part 09 Mistake Memory)
  - `/app/progress` (Part 10 Communication DNA)
  - `/app/transfer-lab` (Part 11 Transfer Lab)
  - `/app/replay` & `/replay` (Part 12 Communication Replay)
- Zero non-WebSocket console errors and zero uncaught page errors across desktop and mobile navigation.
- **Immutability & Zero-Duplicate Evidence Invariant:** Opening, reviewing, marking corrections reviewed, saving practice attempts, and reloading Part 12 Replay produced `0` mutations to historical `speakingSessions`, `transferAttempts`, `mistakes`, `xpLedger`, or original `userTranscript` text.
- **Audio Ownership, Measured Waveform & Deletion:** Real 44.1kHz PCM WAV stored in user-scoped IndexedDB (`audio_<userId>_...`) decoded into `replay-measured-waveform`; two-step authorized deletion removed the blob and updated the player immediately to the honest unavailable banner (`replay-audio-unavailable-banner`). Cross-user access attempt (`/app/replay?session=spk_foreign_999`) was blocked by `replay-access-guard`.
- **Hardware Audio Limitation:** Physical microphone recording and speaker output remain **unverified** on real audio hardware in this headless Linux container.

### 3. Live API Verification (`http://localhost:3000`)
- **Health Endpoints (6/6 `HTTP 200`):** `/api/health`, `/api/speaking/health`, `/api/mistakes/coach/health`, `/api/dna/health`, `/api/transfer/health`, `/api/v1/replay/health` (`cloudSyncActive: false`).
- **Unauthenticated Protection (13/13 `HTTP 401 UNAUTHORIZED`):** `POST /api/speaking/evaluate`, `/api/mistakes/coach`, `/api/mistakes/generate-exercise`, `/api/dna/analyze`, `/api/dna/coach`, `/api/transfer/evaluate`, `/api/transfer/turn`, `/api/transfer/session-evaluate`, `/api/transfer/transcribe`, `/api/transfer/tts`, `/api/v1/replay/ai-assist`, `/api/v1/replay/practice-attempts`, and `DELETE /api/v1/replay/sessions/:id/recording`.
- **Authenticated Validation (`HTTP 400`):** Verified structured `400` error responses on empty/invalid payloads across Parts 08–12 endpoints.
- **Authenticated Live Execution (`HTTP 200`):** Verified live Gemini responses on `POST /api/v1/replay/ai-assist` (`correction_deep_dive`) and `POST /api/v1/replay/practice-attempts`, plus `DELETE /api/v1/replay/sessions/:id/recording` (`storageScope: "browser_local_indexeddb"`, `cloudStorageDeleted: false`).

### 4. Persistence Boundary & Cloudflare Worker / D1 / R2 Status
- **Active Runtime Persistence (Browser-Local Only):** `VITE_API_BASE_URL` is unset. Learner records (`linguaverse_d1_local_db_v1`), replay state (`linguaverse_replay_state_v1:<userId>`), and audio recordings (`linguaverse_audio_v1` IndexedDB) persist strictly in the local browser. Cross-device persistence is **NOT active**.
- **Cloudflare Worker, D1 & R2 Readiness (BLOCKED for Production):**
  - `wrangler.toml` contains placeholder zero UUIDs for D1 (`00000000-0000-0000-0000-000000000000`) and KV namespaces (`0000...0001`–`0006`), plus outdated `GEMINI_PRIMARY_MODEL = "gemini-2.5-flash"`. `wrangler` CLI is not installed in this environment.
  - `worker/index.ts` is missing 17 Express routes introduced across Parts 06, 09, 10, 11, and 12 (`/api/academy/assist*`, `/api/mistakes/coach*`, `/api/mistakes/generate-exercise`, `/api/dna/*`, `/api/transfer/health|turn|session-evaluate|transcribe|tts`, `/api/v1/replay/*`).
  - `schema.sql` lacks D1 tables for Part 12 replay reviews and practice attempts (`replay_reviews`, `replay_practice_attempts`) and Part 11 multi-turn Transfer drafts/transcripts.
  - All inspected D1 SQL queries in `worker/index.ts` use parameterized `.prepare(...).bind(...)`.

### 5. Security, Privacy & Production Deployment Blockers (Code Changes Pending Approval)
1. **HIGH — Unauthenticated Account Creation with Client-Controlled Verification/Plan (`POST /api/v1/auth/mirror-local`, `server.ts:509–530`, `server/authStore.ts:515–546`):** Checks CSRF only (obtainable by any visitor) without requiring an authenticated session, and accepts client-supplied `emailVerified: true` and `plan: 'pro'` for new users. Existing accounts cannot be overwritten or elevated to admin (`role` is hardcoded `'learner'`), but new accounts can bypass email verification and self-assign `pro`.
2. **HIGH — Permissive Reflected CORS with Credentials in Worker (`worker/index.ts:49–58`):** Defaults to reflecting arbitrary `Origin` headers with `credentials: true` whenever `CORS_ALLOWED_ORIGIN` is unset.
3. **MEDIUM — Missing CSRF / Origin Verification on Authenticated Express AI & Replay Routes (`server.ts:725–2140`):** All 13 AI/Replay mutation endpoints enforce session auth (`401`) and rate limits (`429`), but rely solely on `SameSite=Lax` cookies without explicit CSRF token or `Origin` header validation.
4. **PRIVACY / OPS — Email Delivery & Deployment Prerequisites:** No transactional email provider key (`RESEND_API_KEY` / `EMAIL_PROVIDER_API_KEY`) is configured locally (dev OTP preview mode active), no `.git` repository is initialized in the workspace, and Cloudflare Worker/D1/R2 deployment + route/schema parity remain incomplete.

---

## P1 — Critical Security Hardening (S2–S11) Completed & Verified (2026-11-25)

**Scope Executed (P1 ONLY):** Hardened Express (`server.ts`, `server/authStore.ts`, `server/cmsStore.ts`), Cloudflare Worker (`worker/index.ts`), shared policy (`src/domain/securityPolicy.ts`), and frontend clients (`src/services/*`, `src/components/admin/AdminCmsWorkspace.tsx`) for S2–S11. Zero database schemas (`schema.sql`), migrations, `wrangler.toml`, CI/CD workflows, or Cloudflare resources were modified.

- **S2 (Admin Auth & RBAC):** Replaced spoofable `X-Admin-Role` / `X-Admin-Email` headers with server-verified session auth (`lv_session_token` cookie or Bearer) + server-stored role checks across all 8 `/api/v1/admin/*` routes (`401` unauthenticated, `403` non-admin).
- **S3 (SVG XSS & Image Signature Validation):** Removed `image/svg+xml` / `.svg` support, added PNG/JPEG/WebP magic-byte + markup signature validation (`verifyImageMagicBytes`), path-confinement checks, and `Content-Security-Policy: default-src 'none'; sandbox` on `GET /api/v1/media/:filename`.
- **S4 (Account Sync & Registration Lockdown):** Restricted `POST /api/v1/auth/mirror-local` to authenticated same-email sessions with CSRF + rate limit, and forced `plan: 'free'`, `role: 'learner'`, `emailVerified: false` on self-registration (Express & Worker) and local account mirror sync.
- **S5 (OTP Relay Removal):** Deleted unauthenticated `POST /api/auth/send-otp`; added authenticated, CSRF-protected, cooldown-enforced `POST /api/v1/auth/resend-otp` backed by `resendServerEmailOtp`.
- **S6 (Fail-Closed Worker JWT Secret):** Removed static fallback JWT secret in `worker/index.ts`; `resolveWorkerJwtSecret` throws `JwtSecretConfigError` -> `500 AUTH_CONFIG_ERROR` in staging/production when unset or `< 32` characters.
- **S7 (Strict Production CORS):** Replaced reflected credentialed CORS in `worker/index.ts` with `resolveAllowedCorsOrigin` (explicit allowlist only; ignores `*`).
- **S8 (CSRF & Origin Verification):** Upgraded Express `verifyCsrf` with `isTrustedMutationOrigin` + `crypto.timingSafeEqual` and enforced it on all Auth, Admin CMS/Media, and 14 authenticated AI & Replay mutation routes; updated all frontend API clients to send `X-CSRF-Token`.
- **S9 (Secure Session Token Storage):** Replaced persistent `localStorage` JWT storage with `HttpOnly` cookies (`credentials: 'include'`) + ephemeral in-memory bearer token (`src/services/sessionTokenMemory.ts`, which purges legacy `linguaverse_cf_token_v1` / `linguaverse_session_token_v1` keys) and hardened Worker production cookies (`SameSite=None; Secure; Partitioned`).
- **S10 (R2 Audio MIME, Size & Server Consent):** Enforced D1 `learner_profiles.store_mic_recordings` consent (`403`), audio MIME allowlist (`415`), 10 MB size cap (`413`/`400`), upload rate limiting (`429`), and MIME-derived R2 file extensions on `POST /api/v1/learners/:userId/recordings`.
- **S11 (Rate Limiting):** Added sliding-window rate limits with `429` + `Retry-After` on Express (`POST /api/landing/analyze`, `/api/v1/analytics/event`, `/api/v1/subscriptions/intent`, `/api/v1/auth/mirror-local`) and Worker (`/api/v1/subscriptions/intent`, `/api/v1/learners/:userId/recordings`, and `Retry-After: 60` on KV `429` responses).
- **Verified Checks:** `tsc --noEmit` (`0` errors), `vite build` (PASS), `npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts` (**137/137** passing), `bun audit` (`0` vulnerabilities across 272 packages), `dist/` secret scan clean, and 22/22 live Express HTTP PoC checks + Playwright `localStorage` check passing.
- **Not Done (Awaiting Separate Authorization):** P3 (PRD v5.0 features & deployment), secret rotation in external dashboards, and production Cloudflare deployment.

---

## P2 — Cloudflare Worker, D1 Schema & Migrations Parity Completed & Verified (2026-11-25)

**Scope Executed (P2 ONLY):** Implemented D1 sequential migrations, canonical `schema.sql` parity, `wrangler.toml` Gemini model config alignment, Worker Gemini failover/transcribe/WAV-TTS service, full Parts 06–12 + learner persistence Cloudflare Worker route parity, and frontend `VITE_API_BASE_URL` routing parity. Zero live Cloudflare resources, D1/KV/R2 IDs, GitHub Actions deployment workflows, or production deployments were touched.

- **D1 Migrations & Canonical Schema Parity:**
  - Created `migrations/0001_initial_schema.sql` (baseline Sections 1–13), `migrations/0002_parts06_12_parity.sql` (strictly additive — adds `learner_academy_state`, `learner_speaking_preferences`, `transfer_session_drafts`, `replay_reviews`, `replay_practice_attempts` + indexes), and `migrations/ROLLBACK_0002_parts06_12_parity.sql` (non-destructive rollback dropping only the 5 additive P2 tables/indexes).
  - Updated `schema.sql` to deduplicate `password_reset_tokens`, add `idx_password_reset_tokens_hash`, and append Section 14 matching `0002`.
- **Cloudflare Worker Config & Gemini Service (`wrangler.toml`, `worker/types.ts`, `worker/services/gemini.ts`):**
  - Aligned `[vars]` Gemini models (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-3.5-transcribe`, `gemini-3.8-flash-lite-tts`); kept placeholder D1/KV IDs untouched.
  - Added primary -> fallback failover, native REST audio transcription (`callWorkerGeminiTranscribe`), and pure-JS PCM16-to-WAV framing (`callWorkerGeminiTts`, `wrapPcm16ToWavBase64`) with full Parts 06–12 endpoint telemetry.
- **Worker Route Parity (`worker/index.ts`, `worker/routes/parts06To12Routes.ts`, `worker/routes/learnerPersistenceRoutes.ts`):**
  - Added Auth recovery parity (`/api/v1/auth/providers`, `forgot-password`, `reset-password/validate`, `reset-password` with full session revocation).
  - Added Parts 06–12 AI, cloud state CRUD, Replay immutability, and owner-scoped R2 recording deletion routes (with both `/api/v1/...` and `/api/...` aliases) and hardened `POST /api/v1/speaking/evaluate` (+ `/api/speaking/evaluate`, `/api/transfer/evaluate`) with 10-mode allowlist, `correctionStyle`, XML delimiter isolation, and `normalizeSpeakingEvaluation`.
  - Added all missing `d1ApiRepository.ts` learner persistence routes (diagnostic, lessons/exercises, speaking sessions, mistakes, drills, false-correction flags, transfer attempts) plus `POST /api/v1/admin/curriculum/modules`.
- **Frontend API Base Routing (`src/services/apiBase.ts` + 7 API clients):**
  - Routed `authApi.ts`, `speakingApi.ts`, `transferApi.ts`, `academyAssistApi.ts`, `mistakeCoachApi.ts`, `dnaCoachApi.ts`, and `replayApi.ts` through `resolveApiUrl`, `getApiCredentialsMode`, and `attachAuthBearerHeader` so setting `VITE_API_BASE_URL` targets the Worker without breaking local Express dev or CSRF protection.
- **Verified Checks (Local Verification — NOT Live Cloudflare Deployment):**
  - `npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts`: **144/144 PASS** (137 pre-existing + 7 new SQLite-backed Worker & migration tests in `worker/workerParity.test.ts` executing real `0001`, `0002`, `ROLLBACK_0002`, and `schema.sql` via Node 22 `node:sqlite`, plus Hono `workerApp.request` with mock R2/KV and mocked Gemini REST responses).
  - `npm run lint` (`tsc --noEmit`): **PASS (0 errors)**.
  - `npm run build` (`vite build`): **PASS (clean `dist/` bundle)**.
  - Live Express smoke checks on `http://localhost:3000`: `GET /api/health` (`200`), `GET /api/v1/auth/csrf` (`200`), `GET /api/v1/replay/health` (`200`, `cloudSyncActive: false`).
  - `bun audit`: **0 vulnerabilities** across 272 packages; `dist/` secret scan: **CLEAN_DIST**.
- **Explicitly Not Done (Awaiting Separate Authorization):**
  - Live Cloudflare provisioning (D1/KV/R2 resource IDs), running `wrangler d1 migrations apply`, deploying the Worker/Pages, creating GitHub Actions deployment workflows, or starting P3 features.

---

## P3 — Remaining PRD v5.0 Product Modules, Admin Expansion, Additive Migration 0003 & CI/CD Completed & Verified (2026-11-25)

**Scope Executed (P3):** Implemented the remaining PRD v5.0 learner workspaces, Admin Control Center moderation & subscription tabs, full Express + Cloudflare Worker backend parity, strictly additive D1 migration `0003` + rollback, and GitHub Actions CI/CD workflow without deploying to live Cloudflare or fabricating synthetic community posts, leaderboard entries, starter vocabulary cards, or payment revenue.

- **Additive Database Migration & Canonical Schema Parity:**
  - Created `migrations/0003_p3_community_vocab_billing.sql` (strictly additive — adds 9 tables: `vocabulary_items`, `community_posts`, `community_comments`, `community_reports`, `community_user_blocks`, `community_user_restrictions`, `subscription_invoices`, `support_tickets`, `learner_gamification_prefs`) and non-destructive `migrations/ROLLBACK_0003_p3_community_vocab_billing.sql`.
  - Updated `schema.sql` (Section 15) and verified 100% table parity between `0001 + 0002 + 0003` and `schema.sql`, plus data-preserving rollbacks (`ROLLBACK_0003` -> `ROLLBACK_0002`), in `node:sqlite`.
- **Decoupled Domain Engines & Unit Tests:**
  - `src/domain/vocabularyDeckEngine.ts` + `.test.ts` (SM-2 spaced-repetition scheduler `srs-v2.0-sm2-lite`, `>= 3` consecutive successful recalls required for `mastered`, real retention rate).
  - `src/domain/communityModerationEngine.ts` + `.test.ts` (`COMMUNITY_DIRECT_MESSAGING_ENABLED = false`, spam/abuse validation, blocking/hiding, restriction & appeal workflow).
  - `src/domain/subscriptionEntitlementsEngine.ts` + `.test.ts` (`free` / `pro` / `institution` plan matrix, honest `pending_provider` status when no gateway is connected, zero fabricated MRR/revenue).
  - Extended `src/domain/gamificationEngine.ts` with `computeLearnerLevel`, `computeWeeklyChallenges`, and `sortVerifiedLeaderboard` (server-derived XP only).
- **Full-Stack Backend Parity (Express + Cloudflare Worker):**
  - Express: `server/p3Store.ts`, `server/p3Routes.ts` (wired in `server.ts`, with CSRF, session auth, RBAC, rate limits, `viewerUserId`, and audit logging via `appendServerAuditLog`).
  - Cloudflare Worker: `worker/routes/p3CommunityVocabBillingRoutes.ts` (wired in `worker/index.ts`, full D1 parity including community appeals, admin moderation & subscription/support management, and server-computed D1 XP leaderboard ignoring client-supplied XP).
  - Frontend client: `src/services/p3Api.ts` and `institution` plan support in `src/types/domain.ts` & `src/services/authApi.ts`.
- **4 Live Learner Workspaces & Live Navigation (`src/App.tsx`, `src/components/layout/LearnerShell.tsx`):**
  - `/app/vocabulary` (`VocabularyPage.tsx`): Context-grounded SRS deck, manual card creation, Speaking Studio & Mistake Memory import, interactive recall session, and honest empty state.
  - `/app/community` (`CommunityPage.tsx`): Discussions, Questions, and Practice Challenges with comments, Helpful reactions, owner delete, cross-user report/block, restriction appeal flow, and DMs explicitly disabled (`COMMUNITY_DIRECT_MESSAGING_ENABLED = false`).
  - `/app/achievements` (`AchievementsPage.tsx`): Verified XP level progression, weekly challenges, and strictly opt-in leaderboard derived solely from verified server XP.
  - `/app/subscription` (`SubscriptionPage.tsx`): Transparent Free / Pro / Institution entitlements, honest `pending_provider` checkout intent recording (zero fake charges), invoice ledger, and support ticket creation.
  - Replaced all planned/"Coming Soon" sidebar modal buttons in `LearnerShell.tsx` with live `NavLink` items under `Workspace`.
- **Admin Control Center Expansion (`src/pages/admin/AdminControlCenterPage.tsx`):**
  - Added `AdminModerationTab.tsx` (gated by `canReviewMistakes`: pending report triage, content removal, temporary mute / posting suspension, and appeal review) and `AdminSubscriptionsTab.tsx` (gated by `canManageUsers`: real collected revenue/MRR metrics, AI cost vs. revenue view, subscription/invoice records, and support ticket status updates).
- **CI/CD & Runbook:**
  - Created `.github/workflows/ci-cd.yml` (typecheck, unit + Worker tests, production build, `dist/` secret scan, and gated Cloudflare D1 `0001 -> 0002 -> 0003` + Worker + Pages deployment via GitHub Secrets) and updated `DEPLOYMENT.md`.
- **Verified Checks:**
  - `npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts`: **155/155 PASS** (`0` fail; includes P3 domain unit tests, `0001 -> 0002 -> 0003 -> ROLLBACK_0003 -> ROLLBACK_0002` migration/rollback parity, and full P3 Worker integration + leaderboard anti-tamper tests).
  - `npm run lint` (`tsc --noEmit`): **PASS (0 errors)**.
  - `npm run build` (`vite build`): **PASS (clean `dist/` bundle)**; `dist/` secret scan: **CLEAN**.
  - Live HTTP Security Checks on `http://localhost:3000`: unauth `GET /api/v1/vocabulary` (`401`), missing CSRF `POST /api/v1/vocabulary` (`403`), learner `GET /api/v1/admin/moderation/reports` (`403`), learner `GET /api/v1/admin/subscriptions` (`403`), authenticated learner `GET /api/v1/vocabulary` (`200`).
  - Browser E2E Verification (Round 1 desktop `1440×900` + mobile `390×844` across all 4 routes; Round 2 desktop verification on `/app/vocabulary` SRS add -> review `Good` -> reload persistence showing `learning · 100%` retention, and `/app/community` own-post Trash icon + active cyan `Helpful (1)` vs. other learner's post Report/Block icons + singular `1 comment`): **PASS** with zero non-HMR console errors and zero horizontal overflow.
- **External Prerequisites (Not Executed in Container):**
  - Live Cloudflare provisioning & deployment require configuring GitHub Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and real D1/KV/R2 bindings in `wrangler.toml`, then applying migrations `0001 -> 0002 -> 0003`.
  - Real subscription payment processing requires connecting an external payment provider (e.g., Stripe, SSLCommerz, or Paddle) and webhook verification.

---

## PRD v6.1 Master Audit, Final Gap Closure & PWA Readiness Completed & Verified (2026-11-25)

**Scope Executed:** Conducted a complete project audit against the supplied Master PRD v6.1 (noting transparently that the supplied PRD v6.1 text ends at Section 2.4; Sections 3–18 and Directive §§4–14 were cross-referenced against the Master Execution Directive and full PRD v5.0 baseline), closed all 6 locally actionable gaps without modifying existing working architecture or requiring any new D1 migration, and produced the full `/audit/` governance documentation suite.

- **Signed HMAC-SHA256 Payment Webhooks & Admin System Configuration (Express + Cloudflare Worker Parity):**
  - Created `src/domain/paymentWebhookEngine.ts` + `.test.ts` (WebCrypto HMAC-SHA256 signing & constant-time verification, 5-minute replay window, payload normalization, and non-secret `validateSystemConfigPatch` rejecting secret keys and `communityDirectMessagingEnabled: true`).
  - Added `GET/PUT /api/v1/admin/system-settings` (server-verified `admin`/`super_admin` RBAC, CSRF, audit logging) and `POST /api/v1/billing/webhooks/:provider` (fail-closed `503` when secret unset, `401` invalid signature, idempotent `eventId` deduplication updating `subscriptions`, `subscription_invoices`, and `users.plan`) in both Express (`server/p3Store.ts`, `server/p3Routes.ts`) and Cloudflare Worker (`worker/routes/p3CommunityVocabBillingRoutes.ts`), reusing existing D1 `system_settings` (`0001`), `subscriptions` (`0001`), and `subscription_invoices` (`0003`) tables.
  - Added `AdminSystemConfigTab.tsx` wired into `AdminControlCenterPage.tsx`, `src/services/p3Api.ts`, `worker/types.ts`, and `.env.example` webhook secret entries.
- **Academy Reading, Listening & Writing Intelligence (`src/domain/curriculumData.ts`, `src/domain/academyEngine.ts`):**
  - Expanded Academy catalog to **5 courses / 9 lessons** by adding `course_reading_listening` (Reading Inference & Spoken Updates) and `course_writing_workplace` (Action-Oriented Workplace Emails), keeping `pronunciation` transparently linked to `/app/speak` with explicit non-acoustic disclosure.
- **Interactive 8-Stage Communication Improvement Loop & Live Dashboard Previews:**
  - Added `buildCommunicationLoopStages` (`src/domain/dashboardIntelligence.ts` + `.test.ts`) and `CommunicationLoopWidget.tsx` in `LearnerHomePage.tsx`.
  - Updated `DashboardModulePreviews.tsx` to replace all obsolete "not built yet" / "Planned Module" cards with live links to `/app/vocabulary`, `/app/learn`, `/app/achievements`, and `/app/community`.
- **Full PWA Compliance:**
  - Installed `vite-plugin-pwa`, configured `VitePWA` in `vite.config.ts` (`manifest.webmanifest`, Workbox `sw.js`, `navigateFallbackDenylist: [/^\/api\//]`, Google Fonts `CacheFirst`, 10 MiB bundle cache cap), generated PNG icons (`public/icon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`), added iOS/mobile meta tags in `index.html`, added `usePWAInstall.ts` + `PWAInstallButton.tsx` (in `LearnerShell.tsx`) and `OfflineIndicator.tsx` (in `App.tsx`).
- **Audit Documentation Suite:**
  - Created `audit/EXISTING-PROJECT-AUDIT.md`, `audit/IMPLEMENTATION-PLAN.md`, `audit/PRD-COMPLIANCE-MATRIX.md`, and `audit/TEST-EVIDENCE.md`.
- **Final Production Release Verification & Dependency Remediation (2026-11-25):**
  - Remediated the 2 moderate build-time transitive advisories (`GHSA-3g3m-2fjr-6pw4` in `glob@11.1.0`, `GHSA-g3hv-75wg-m249` in `minimatch@10.2.6` via `vite-plugin-pwa > workbox-build`) by adding `"overrides": { "glob": "^14.0.6" }` to `package.json`; re-ran `bun audit`: **No vulnerabilities found (checked 569 packages)**.
  - Resolved cold-boot dev server startup stall (caused by initial `bun install` downloading the `vite-plugin-pwa` dependency graph) and restarted the dev server cleanly (`GET /` `200`, `GET /api/health` `200`, `GET /manifest.webmanifest` `200`).
  - Hardened `.github/workflows/ci-cd.yml` (safe `package-lock.json` fallback + expanded secret scan), updated `DEPLOYMENT.md` (pre-migration `wrangler d1 export` backup + webhook secrets), and added `CHANGELOG.md`.
- **Verification Tiers (Re-Verified):**
  - **Locally Verified:** `npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts` (**160/160 PASS**, 0 fail, 0 skipped), `npm run lint` (`tsc --noEmit`: **0 errors**), `npm run build` (`vite build`: **PASS**, `dist/manifest.webmanifest` 578 B, `dist/sw.js` 2.7 KB, all 5 icon assets), `bun audit` (**0 vulnerabilities across 569 packages**), `dist/` secret scan (**CLEAN**), live HTTP health/provider/security PoCs on `http://localhost:3000`, and Playwright Chromium desktop (`1440×900`) + mobile (`390×844`) checks.
  - **Remotely Verified:** None (no GitHub remote or staging environment accessible from container).
  - **Production Verified:** None (no live Cloudflare Worker/Pages/D1/R2/KV deployment executed from container).
  - **Blocked (Container Environment Limits):**
    - **GitHub Commit/Push (`ubuttomkumar-commits/Linguaverse-Ai`)**: Blocked (`git rev-parse --is-inside-work-tree` fails: `.git` absent; `gh` CLI and GitHub tokens unavailable).
    - **Live Cloudflare Provisioning & Deployment**: Blocked (`wrangler` CLI absent; zero `CLOUDFLARE_*`/`CF_*` credentials; `wrangler.toml` retains placeholder IDs).
  - **Not Implemented / External Provider Unconfigured:** Live transactional email (`RESEND_API_KEY`/`EMAIL_PROVIDER_API_KEY` unset -> `local_dev_preview`), live payment gateway webhook secrets (`503` fail-closed / `pending_provider`), Google OAuth (`configured: false`), acoustic phoneme pronunciation engine (honestly disclosed as text-transcript only).
  - **Not Applicable:** Community Direct Messaging (permanently disabled per PRD safety policy).






---

## Full PRD v6.1 A–Z Master Completion & Resume Recovery Checkpoint (2026-11-26)
- **Authoritative Source:** Master PRD v6.1 (`Paste November 26, 2026 - 9:11AM`, 3,319 lines, Sections 0–46.1; line 3,319 truncates mid-word at `Meet documented requir` — honestly disclosed).
- **Recovery & Completion Summary:**
  - Recovered interrupted PRD v6.1 workspace cleanly (`audit/RESUME-RECOVERY-REPORT.md`, `audit/REMAINING-TASKS.md`).
  - Repaired Worker D1 `system_settings` column parity (`setting_key`/`setting_value` in `worker/routes/prd61Routes.ts`), Express audit log signatures (`server/prd61Routes.ts`), `'institution'` plan support (`server/authStore.ts`), Admin provider/flag field alignment (`AdminAiProvidersTab.tsx`, `AdminSystemConfigTab.tsx`), Progress analytics property names (`ProgressPage.tsx`), dev-server cold-start boot (`vite.config.ts`, `server.ts`), Admin System Health `securityEvents` contract + Worker D1 audit surfacing (`server/prd61Routes.ts`, `worker/routes/prd61Routes.ts`), and provider key rotation payload compatibility (`src/domain/aiProviderRegistry.ts`).
  - Completed Express <-> Cloudflare Worker parity for all PRD v6.1 routes (`GET /api/v1/system/status`, `/api/v1/admin/feature-flags`, `/api/v1/admin/ai-providers`, `/health`, `/rotate-key`, `/api/v1/admin/system-health`, `PATCH`/`DELETE /api/v1/admin/users/:id`, `/api/v1/admin/notifications/broadcast`, `/api/v1/examinations/*`, `/api/v1/writing/*`, `/api/v1/human-bridge/logs`, `/api/v1/notifications/*`) and additive D1 migration `0004` + `ROLLBACK_0004` + `schema.sql` Section 16 + `.github/workflows/ci-cd.yml`.
  - Created `docs/API.md` and updated `DEPLOYMENT.md`, `README.md`, `CHANGELOG.md`, `audit/PRD-COMPLIANCE-MATRIX.md`, and `audit/TEST-EVIDENCE.md`.
- **Fresh Verification Results:**
  - `LOCALLY VERIFIED`: `173 / 173` automated tests passing across 11 suites (including `0001->0004` & `ROLLBACK_0004->0002` vs `schema.sql` and full PRD v6.1 Worker parity), `tsc --noEmit` (`0` errors), `npm run build` (clean `dist/`), `bun audit` (`0` vulnerabilities across 569 packages), `dist/` secret scan (`0` leaked keys), `24 / 24` + `16 / 16` live Express HTTP security/RBAC/CSRF/Admin PoCs, and headless Chromium desktop (`1440×900`) + mobile (`390×844`) verification across `/app/ielts`, `/app/writing`, `/app/progress`, `/app/settings`, and `/admin` (`overflowPx: 0`, `0` app console errors).
  - `REMOTELY VERIFIED`: None (`BLOCKED` — no `.git`, `gh`, or GitHub token in container).
  - `PRODUCTION VERIFIED`: None (`BLOCKED` — Cloudflare deployment explicitly prohibited by user directive; manual runbook ready in `DEPLOYMENT.md`).

---

## Phase 7 — Separate Admin Application, Dual Production Builds & Full Documentation Suite (2026-11-26)

- **Authoritative Source:** Master PRD v6.1 (`Paste_November_27__2026_-_12_20AM`, 3,318 lines, Sections 0–46.1; line 3,318 truncates mid-word at `Meet documented requir` — remainder explicitly disclosed as unavailable).
- **Genuinely Separate Admin Application (`admin.html`, `dist-admin/`):**
  - Created standalone Admin entry point (`admin.html`, `src/admin-main.tsx`, `src/AdminApp.tsx`, `src/pages/admin/AdminLoginPage.tsx`, `src/services/adminPortalApi.ts`) and independent Vite build configuration (`vite.admin.config.ts` -> `dist-admin/index.html` & `dist-admin/admin.html`, wired via `npm run build:admin` and `npm run build:all`, plus `/admin-portal` production Express mount and `linguaverse-admin` Cloudflare Pages deploy job in `.github/workflows/ci-cd.yml`).
  - Added pure decoupled bootstrap & role-gate domain engine (`src/domain/adminBootstrapEngine.ts` + `src/domain/adminBootstrapEngine.test.ts` — 5/5 passing).
  - Implemented full Express (`server/authStore.ts`, `server/prd61Routes.ts`) and Cloudflare Worker D1 (`worker/routes/prd61Routes.ts`, `worker/types.ts`) parity for `GET /api/v1/admin/auth/status`, `POST /api/v1/admin/auth/bootstrap`, `POST /api/v1/admin/auth/login`, `GET /api/v1/admin/auth/me`, and `POST /api/v1/admin/auth/logout` with:
    - Zero public admin registration and zero hardcoded production credentials.
    - One-time Initial Super Admin Provisioning that fails closed in production (`503`) if `ADMIN_BOOTSTRAP_SECRET` is unset and locks permanently (`409 ADMIN_ALREADY_PROVISIONED`) once an admin exists.
    - Strict server-side RBAC (`403` for learner accounts), HttpOnly cookie + ephemeral in-memory Bearer token session handling, CSRF/rate limiting, and real `/api/v1/admin/audit-logs` + `/api/v1/admin/users` integration inside standalone `AdminControlCenterPage.tsx`.
- **Complete Technical Documentation Suite (`/docs/`):**
  - Created `docs/PRD_IMPLEMENTATION_TRACKER.md` (11-column traceability matrix across Sections 0–46.1), `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, and `docs/TESTING.md` alongside existing `docs/API.md`.
- **Final Verification Results (2026-11-26):**
  - **Automated Tests (`npx --yes tsx --test src/domain/*.test.ts src/services/storage/*.test.ts worker/*.test.ts`):** **179 / 179 PASS** (`0` fail, `0` skipped, 11 suites — including `0001->0004` + `ROLLBACK_0004->0002` SQLite parity and full Separate Admin Application Worker D1 parity Test #146).
  - **TypeScript (`npm run lint` / `tsc --noEmit`):** **PASS (`0` errors)**.
  - **Dual Production Builds (`npm run build:all`):** **PASS** (`dist/index.html` + native PWA `dist/sw.js` & `dist/manifest.webmanifest` AND `dist-admin/index.html` / `dist-admin/admin.html`); secret scan across both `dist/` and `dist-admin/`: **CLEAN (`0` leaked keys)**.
  - **Dependency Audit (`bun audit`):** **PASS (`0` vulnerabilities across 273 packages — replaced `vite-plugin-pwa` with lightweight native `public/manifest.webmanifest` + `public/sw.js` to cut cold-boot install size by ~300 packages and eliminate dev-server startup timeouts)**.
  - **Live Express + Headless Chromium Verification (`http://localhost:3000/` & `/admin.html`):** Verified live Express HTTP lifecycle (`201` bootstrap -> `409` permanent lock -> `200` `/me` -> `200` `/logout` -> `401` revoked), live port 3000 `HTTP 200` across `/`, `/api/health`, `/manifest.webmanifest`, `/sw.js`, and `/admin.html`, and headless Chromium verification across all 14 authenticated Learner routes and all 12 Separate Admin App tabs (`overflowPx: 0`, `0` application console errors, `0` HTTP 4xx/5xx).
  - **Honest External Blockers:** GitHub commit/push (`ubuttomkumar-commits/Linguaverse-Ai`) is `BLOCKED` (no `.git`, `gh`, or GitHub token in sandbox) and live Cloudflare provisioning/deployment is `BLOCKED` (no `wrangler` CLI or Cloudflare credentials in sandbox; placeholder IDs preserved in `wrangler.toml`).

---

## Independent Full Re-Audit & Express ↔ Cloudflare Worker Parity Closure (2026-11-26)

- **Gaps Uncovered & Fixed Independently:**
  - **Express ↔ Worker Curriculum, Mistakes & Overview Parity:** Added persistent Express routes (`GET /api/v1/curriculum/overlay`, `GET /api/v1/admin/overview`, `POST /api/v1/admin/curriculum/courses|modules|lessons`, `POST /api/v1/mistakes/report-false-correction`, `GET/POST /api/v1/admin/flagged-mistakes*`), wired Separate Admin App Curriculum Builder & Reported Mistakes to persist to server APIs, hydrated custom published curriculum into Learner Academy (`AcademyPage.tsx`), wired Learner `"Report False Correction"` (`AuthContext.tsx`) to sync live to `/api/v1/mistakes/report-false-correction`, and normalized `fetchAdminAuditLogs` (`src/services/cmsApi.ts`) for both Express object and Worker array payloads.
  - **Cloudflare Worker Missing Frontend Routes & Snake-Case Mapping Bug:** Added `DELETE /api/v1/community/posts/:postId`, `POST /api/v1/subscriptions/:subscriptionId/cancel`, `POST /api/v1/subscriptions/invoices/:invoiceId/refund-request`, `PATCH /api/v1/admin/support/:ticketId`, `GET /api/health`, `POST /api/landing/analyze` (with `<learner_sentence>` XML prompt-injection isolation), `GET /api/v1/auth/csrf`, `POST /api/v1/mistakes/report-false-correction`, `GET /api/v1/admin/analytics`, and `POST /api/v1/admin/cms/reset`; fixed `GET /api/v1/admin/flagged-mistakes` in `worker/index.ts` mapping snake_case SQLite columns to camelCase `MistakeMemoryItem` fields.
  - **Hardened PWA Service Worker v2 & TypeScript Lint Cleanup:** Upgraded `public/sw.js` (`linguaverse-shell-v2`) with strict cache isolation (`/api/*`, `/admin*`, `Authorization`, `Set-Cookie`, `no-store`, `private`, root-only navigation cache) and `CLEAR_USER_CACHES` logout purge (`src/utils/pwaRuntime.ts`); removed stale `vite-plugin-pwa/client` and excluded `dist-admin` in `tsconfig.json`.
- **Verified Gate Results:**
  - **Automated Tests:** **184 / 184 PASS** (`0` fail, `0` skipped, 11 suites / 36 test files, including `pwaCompliance.test.ts` and new Worker full-parity D1 tests).
  - **TypeScript (`tsc --noEmit`) & Dual Builds (`npm run build:all`):** **PASS** (`0` errors, `0` leaked secrets across `dist/` and `dist-admin/`).
  - **Dependency Audit (`bun audit`):** **0 vulnerabilities across 273 packages**.
  - **External Environment Blockers (Re-Verified):** GitHub sync (`ubuttomkumar-commits/Linguaverse-Ai` — `fatal: not a git repository`, no `.git`/`gh`/token) and live Cloudflare provisioning/deployment (`wrangler` CLI and Cloudflare credentials absent; `wrangler.toml` retains placeholder IDs).

---

## Final Cloudflare Production Readiness, Repository Recovery & Wrangler v4 Validation (2026-11-27)

- **GitHub Repository Recovery & History Preservation (`ubuttomkumar-commits/Linguaverse-Ai`):**
  - Safely recovered the real Git history (`origin/main` at `53461b1`, 8 commits preserved linearly) without overwriting remote fixes.
  - Merged remote security & dependency fixes from `origin/main` (`c54a03e`: `resolveClientIp` with `TRUST_PROXY` guard + `shouldExposeDevPreviewOtp` production OTP leak guard + 5 unit tests; `535ec4e`: `esbuild ^0.28.0` Vite 8 peer fix; `53461b1`: preserved `docs/DEPLOYMENT_REPORT.md`, `IMPLEMENTATION_STATUS.md`, `KNOWN_LIMITATIONS.md`, `TESTING_REPORT.md`) and synchronized `package-lock.json`.
- **Cloudflare Wrangler v4.168.0 Pre-Deployment Audit & Fixes (`wrangler.toml`, `migrations/`, `db/`, `.github/workflows/ci-cd.yml`):**
  - Removed conflicting `pages_build_output_dir = "dist"` from `wrangler.toml` so Worker deploys cleanly while Learner PWA (`dist/`) and Separate Admin App (`dist-admin/`) deploy via separate Cloudflare Pages projects.
  - Declared explicit, isolated bindings (`DB`, `AUDIO_BUCKET`, `MEDIA_BUCKET`, `LINGUAVERSE_KV`, `SESSION_KV`, `RATE_LIMIT_KV`), all 11 environment vars, and Cron triggers (`0 3 * * *`, `0 */6 * * *`) separately for `[env.staging]` and `[env.production]` (Wrangler v4 does not inherit top-level bindings/vars into named environments); preserved non-secret placeholder UUIDs without fabricating real resource IDs.
  - Separated rollback scripts into `db/rollbacks/` and idempotent reference seed into `db/seeds/seed_reference_data.sql` so `migrations/` contains **only** the 4 forward sequential D1 migrations (`0001`–`0004`) and `wrangler d1 migrations apply` can never accidentally execute rollback SQL.
  - Validated with real **Wrangler `4.168.0`**: `npx wrangler deploy --dry-run --env staging` (`0` warnings, `945.21 KiB` / `189.95 KiB` gzip), `npx wrangler deploy --dry-run --env production` (`0` warnings, `945.21 KiB` / `189.95 KiB` gzip), and `npx wrangler d1 migrations list linguaverse-db --local --env production` (lists strictly `0001`–`0004`).
- **Worker R2 CMS Media Parity & Cron Scheduled Maintenance (`worker/index.ts`, `worker/types.ts`):**
  - Added `MEDIA_BUCKET` R2 binding, RBAC-protected Admin CMS media endpoints (`POST /api/v1/admin/media`, `GET /api/v1/media/:filename` with sandboxed CSP, `DELETE /api/v1/admin/media/:mediaId`), and `scheduled()` -> `runWorkerScheduledMaintenance(env)`.
- **Phase 13 Production Documentation Suite:**
  - Created & synchronized `docs/CLOUDFLARE_DEPLOYMENT.md` (10-step separate runbook), `docs/DATABASE_DEPLOYMENT.md`, `docs/ENVIRONMENT_SETUP.md`, `docs/PRODUCTION_READINESS.md`, `docs/ROLLBACK.md`, and `docs/SECURITY_AUDIT.md`.
- **Final Verified Gate Results (2026-11-27):**
  - `npm run lint` (`tsc --noEmit`): **PASS (`0` errors)**.
  - `npm run verify:db`: **PASS** (`forwardMigrationsOnly: true`, `migrationsApplied: 4`, `tablesVerified: 63`, `schemaParity: "100%"`, `integrityCheck: "ok"`, `foreignKeyViolations: 0`, `seedIdempotent: true`, `existingSchemaUpgradePreservedData: true`, `rollbackPreservedUsers: true`).
  - `npm test`: **190 / 190 PASS** (`0` fail, `0` skipped, 13 suites — includes merged `resolveClientIp`/`shouldExposeDevPreviewOtp` tests and Worker R2 Media + Cron parity Test #154).
  - `npm run build:all`: **PASS** (clean `dist/` & `dist-admin/`, `0` leaked secrets).
  - `npm run verify:smoke` (against `http://localhost:3000`): **6 / 6 PASS** (`ok: true`).
  - `bun audit`: **0 vulnerabilities across 273 packages**.
  - **External Environment Boundaries:** Local Git commit created on recovered `main` branch off `origin/main` (`53461b1`); remote `git push` requires GitHub authentication credentials absent in the sandbox; live Cloudflare production deployment intentionally withheld per owner restriction.

---

## Blank-Screen Root Cause Repair & Extreme Mobile Performance Checkpoint (2026-11-27)

- **Live Staging Blank-Screen Root Cause Confirmed in Mobile Chromium (`390×844`):**
  - Deployed Staging Worker (`linguaverse-ai-api-staging`) is still running the pre-fix build returning `{"config":null}` from `GET /api/v1/cms/public` on fresh D1, causing the pre-fix monolithic `index-BNuKe6hs.js` on `linguaverse-web` to throw `TypeError: Cannot read properties of null (reading 'sections')` (on `/`) and `Cannot destructure property 'seo' of 'e' as it is null` (on `/login`), unmounting `#root` into a blank `#05091F` screen due to missing top-level ErrorBoundary and empty initial HTML shells.
- **Fixes Applied & Verified Locally (`192 / 192` tests PASS, `6 / 6` smoke PASS, `0` TS errors, `0` warnings on Wrangler staging dry-run):**
  - Added `src/components/common/RootErrorBoundary.tsx` wrapping both `src/main.tsx` and `src/admin-main.tsx` with automatic one-shot stale-chunk cache recovery (`vite:preloadError`) and sanitized public fallback UI (zero stack trace/error exposure; also sanitized `WorkspaceErrorBoundary.tsx`).
  - Added instant zero-JS initial branded loading shells to `index.html` (`#root`) and `admin.html` (`#admin-root`), achieving `FCP: 76 ms`, `LCP: 920 ms`, `CLS: 0` on built desktop Learner bundle.
  - Lazy-loaded `LocalPersistenceRepository` in `src/services/storage/index.ts` so Cloudflare Staging/Production builds exclude offline catalogs from initial load (`AuthContext`: `453.13 kB -> 59.96 kB`, `-86.8%`; mobile Learner initial JS gzip: `979.18 kB -> 317.94 kB`, `-67.5%`).
  - Added 10s `AbortController` timeouts (`d1ApiRepository.ts`, `adminPortalApi.ts`), network Retry Connection banner (`AdminApp.tsx`), and Service Worker `v3` cache purge + Cache-First `/assets/*` with non-HTML MIME guard (`public/sw.js`).
- **Remaining External Blockers:** Live Cloudflare Worker/Pages redeploy, remote D1 migration `0005`, live Staging Admin provisioning, and `git push origin main` are blocked solely because neither `CLOUDFLARE_API_TOKEN` nor a GitHub PAT is configured in this container (`wrangler whoami` unauthenticated, `~/.git-credentials` absent).

---

## Complete 298-File Project Autopsy & Security Hardening Checkpoint (2026-11-27)

- **Scope Audited:** All `298` project files across `src/`, `server/`, `worker/`, `migrations/`, `db/`, `scripts/`, `docs/`, and `audit/` (static route cross-checks across 41 React routes, API parity across 152 Worker / 112 Express routes, SQL parameterization, XSS/URL sanitization, auth/session/cookie flags, RBAC role hierarchy, rate limiting, dependency audit).
- **Bugs & Security Issues Fixed:**
  1. **Admin Vertical Privilege Escalation & Unauthorized `super_admin` Tampering/Deletion (`worker/index.ts`, `server/authStore.ts`, `server/prd61Routes.ts`)**: Enforced `super_admin`-only guards on assigning `super_admin` or modifying/suspending/deleting any `super_admin` (`403`), explicit enum validation (`400`), self-demotion/self-suspension guards (`400`), and immediate session revocation on demotion to `learner`.
  2. **Per-Account Brute-Force Lockout & Admin Auth Rate Limiting (`worker/index.ts`, `worker/routes/parts06To12Routes.ts`, `worker/routes/prd61Routes.ts`, `server/authStore.ts`, `server/prd61Routes.ts`, `server.ts`)**: Added IP rate limiting on Worker `/api/v1/admin/auth/bootstrap` (`5/min`) and `/api/v1/admin/auth/login` (`10/min`), plus hashed per-account failed-login lockouts (`5` failed attempts -> `15 min` `429 ACCOUNT_LOCKED` + `Retry-After`, cleared on valid login) across both Worker (`RATE_LIMIT_KV`) and Express.
  3. **Protocol-Relative Open Redirect Guard (`src/domain/cmsEngine.ts`)**: Blocked `//...` protocol-relative URLs in `sanitizeUrl()`.
  4. **Express Health Parity (`server/prd61Routes.ts`)**: Added `0005_performance_indexes.sql` to `GET /api/v1/admin/system-health` `migrationsReady`.
- **Post-Fix Verification:** `npm run lint` (`0` errors), `npm run verify:db` (`5` migrations, `63` tables, `100%` parity), `npm test` (**194 / 194 PASS**, 13 suites), `npm run build:all` (`dist/` + `dist-admin/`), `npx wrangler deploy --env staging --dry-run` (`1004.74 KiB` / `201.53 KiB` gzip, `0` warnings), `scripts/smoke-test-deployment.mjs` (**6 / 6 PASS**), `bun audit` (`0` vulnerabilities across 273 packages), and headless Chromium desktop (`1440×900`) & mobile (`390×844`) checks (`0px` overflow, `0` app errors).

---

## Global Ultra Performance, Realtime SSE & Multi-Device Optimization Checkpoint (2026-11-27)

- **Audit & Baseline Documents:** Added `audit/PERFORMANCE_BASELINE.md`, `audit/PERFORMANCE_GAP_ANALYSIS.md`, and `audit/PERFORMANCE_IMPLEMENTATION_TRACKER.md`.
- **Frontend Perceived Speed & Discord-Inspired Interaction:**
  - Added pure client SWR/TTL query cache, request deduplication, 12s `AbortController` timeouts, and optimistic rollback helper (`src/services/queryCache.ts`, `src/domain/queryCache.test.ts`, wired into `src/services/prd61Api.ts`).
  - Added inversion-of-control route chunk prefetcher (`src/utils/routePrefetch.ts`, registered in `src/App.tsx` only so `dist-admin/` has `0` Learner/Three.js chunk leakage), zero-CLS `<WorkspaceRouteSkeleton />`, `Cmd/Ctrl+K` keyboard workspace search, optimistic notification read updates with rollback, persisted sidebar collapse state, safe-area mobile bottom bar (`.pb-safe`), `44px` mobile menu touch target, `touch-action: manipulation`, `.lv-defer-section`, and reduced mobile backdrop blur.
- **Realtime SSE & Sync Engine:**
  - Added pure `src/domain/realtimeSyncEngine.ts` + `src/domain/realtimeSyncEngine.test.ts` and `src/hooks/useRealtimeEvents.ts` (authenticated streaming-`fetch` SSE with backoff+jitter, deduplication, sequence ordering, offline/hidden pause, `401`/`403` stop, clean unmount/logout teardown).
  - Implemented authenticated `GET /api/v1/realtime/events` (`401` unauth, `200 text/event-stream`, strict `no-store, private`) on both Express (`server/prd61Routes.ts` with live broadcast/maintenance pub-sub + 25s heartbeats) and Cloudflare Worker (`worker/routes/prd61Routes.ts`), and documented the Cloudflare Durable Objects upgrade path in `docs/ARCHITECTURE.md`.
- **Backend D1 Optimization & Cloudflare Smart Placement:**
  - Added additive D1 migration `migrations/0006_global_query_indexes.sql` (10 composite indexes) + `db/rollbacks/ROLLBACK_0006_global_query_indexes.sql` + `schema.sql` parity + `scripts/verify-d1-migrations.mjs` (`6` migrations, `63` tables, `100%` parity).
  - Parallelized `buildHydratedAuthPayload()` (`6` serial queries → `1` parallel `Promise.all` with explicit projections), pushed search/cursor pagination to SQL in `GET /api/v1/admin/users` and `GET /api/v1/community/posts`, and enabled `[placement] mode = "smart"` in `wrangler.toml` for both staging and production.
- **Verified Gate Results:** `npm run lint` (`0` errors), `npm run verify:db` (`6` migrations, `63` tables, `100%` parity), `npm test` (**204 / 204 PASS**, 13 suites), `npm run build:all` (`dist/` entry `86.45 kB` gzip; `dist-admin/` entry `26.17 kB` gzip, `0` warnings), Wrangler staging & production dry-runs (`1011.84 KiB` / `203.25 KiB` gzip, `0` warnings), `scripts/smoke-test-deployment.mjs` (**6 / 6 PASS**), local concurrent load test (up to `1,498.4 RPS`, `p95 11.72–17.15ms`, `0` errors), and headless Chromium 12-viewport verification (`320px`–`1920px` + `844×390` landscape, `0px` overflow on all 12 viewports, mobile `FCP/LCP 148ms`, `CLS 0.044`, click-to-paint `50.8ms`, live authenticated SSE `200 text/event-stream`).
- **External Blockers (Unchanged):** Live Cloudflare Staging/Production redeploy, remote D1 migration `0005`/`0006`, `git push origin main`, and multi-region WAN edge probes remain blocked pending owner `CLOUDFLARE_API_TOKEN`, GitHub PAT/SSH, and external multi-region runners.

---

## Critical Production Blank-Screen Recovery, SW v4 Hardening & Scenario A–M Regression Checkpoint (2026-11-27)

- **Live Staging Root Cause Reproduced (`https://staging.linguaverse-web-1s7.pages.dev` in headless Chromium):**
  - First visit renders the complete landing page immediately from synchronous `createDefaultCmsConfig()`, then crashes when the stale deployed Staging Worker (`linguaverse-ai-api-staging`) returns `{"config":null}` from `GET /api/v1/cms/public` → stale deployed bundle (`index-BNuKe6hs.js`) throws `TypeError: Cannot read properties of null (reading 'sections')` with no top-level ErrorBoundary, unmounting `#root` into a blank dark navy `#05091F` screen (`~11.6s` on cold load, `~317ms` on reload — producing the exact intermittent blank-screen behavior).
- **Additional Resilience & Rolling-Deploy Blank-Screen Hardening Implemented:**
  - **Pure Boot Recovery Engine (`src/domain/bootRecovery.ts`, `src/domain/bootRecovery.test.ts`):** Pure chunk/CSS/module load error classifier and 30s anti-loop auto-reload guard.
  - **Service Worker v4 (`public/sw.js`, `src/utils/pwaRuntime.ts`, `src/domain/pwaCompliance.test.ts`):** Bumped caches to `linguaverse-shell-v4` / `linguaverse-fonts-v4`, moved `request.mode === 'navigate'` BEFORE `PRECACHE_URLS` (`cache: 'no-cache'` online, `/` offline fallback only), added `/assets/*` HTML-fallback mismatch detection (`503` + `X-LV-Chunk-Mismatch: 1` + stale `/` purge), `PURGE_ALL_CACHES` handler, `updateViaCache: 'none'`, and 5-minute foreground visibility update checks.
  - **Zero-JS Boot Watchdogs (`index.html`, `admin.html`, `src/main.tsx`, `src/admin-main.tsx`):** Pure-DOM inline boot watchdogs detecting module `<script>` failures or 12s startup stalls before React mounts, performing one-shot cache-purge recovery or showing a `"Reload Fresh App"` recovery card; `markAppBootMounted()` clears watchdog and resets reload guards after 5s of stable mount.
  - **Isolated Feature & Section Boundaries (`src/components/common/RootErrorBoundary.tsx`, `src/components/landing/HeroCommunicationCore.tsx`, `src/pages/LandingPage.tsx`):** Added `SafeFeatureBoundary` around lazy `<ThreeLanguageGlobe />` (graceful SVG fallback on WebGL/chunk failure) and around all non-hero landing sections, plus `unhandledrejection` chunk-error listener.
  - **API Timeout & Explicit Vite Base Paths (`src/services/cmsApi.ts`, `vite.config.ts`, `vite.admin.config.ts`, `.github/workflows/ci-cd.yml`):** Added 10s `AbortController` timeout to `fetchPublicCmsConfig()`, explicit `base: '/'` in both Vite configs, and synced CI migration step descriptions to `0001 -> 0006`.
- **Verified Gate Results:** `npm run lint` (`0` errors), `npm test` (**206 / 206 PASS**, 13 suites), `npm run verify:db` (`6` migrations, `63` tables, `100%` parity), `npm run build:all` (`dist/` + `dist-admin/`), `bun audit` (`0` vulnerabilities / `273` packages), bundle secret scan (`0` hits), Wrangler staging & production dry-runs (`1011.84 KiB` / `203.25 KiB` gzip, `0` warnings), `scripts/smoke-test-deployment.mjs` (**6 / 6 PASS**), and all **13 Mandatory Browser Regression Scenarios (A–M)** PASS on built `dist/` (`5×` reloads non-blank, `{"config":null}` + `500` API non-blank, slow network non-blocking, boot failure fallback verified, `EN ⇄ বাংলা` verified, mobile `390×844` `0px` overflow + menu verified, `0` uncaught page errors).
- **Remaining External Blockers:** `git push origin main` (no GitHub PAT/SSH in container) and live Cloudflare Worker/Pages production & staging deployment (no `CLOUDFLARE_API_TOKEN` in container; `wrangler whoami` unauthenticated).





