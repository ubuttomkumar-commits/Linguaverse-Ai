# LINGUAVERSE AI

**Voice-first, evidence-based AI English learning & communication intelligence platform tailored for Bangla-speaking learners (`EN` + `বাংলা`).**

## Key Capabilities

1. **Bilingual-First Architecture (`EN` / `বাংলা`)**: Seamless interface language switching plus Bangla explanations contrasting Bangla L1 interference patterns against natural English.
2. **The Academy (`/app/learn`)**: Structured Pre-A1 to B2 courses with a 7-stage interactive Lesson Player (objectives, bilingual concept + contrast table, TTS audio examples at `0.75x`/`1.0x`, guided practice, independent writing, graded assessment, and spaced repetition scheduling that caps single-attempt mastery at `<= 45%`).
3. **AI Speaking Studio (`/app/speak`)**: 7 real-world modes, 5-level Pressure Ladder, browser `MediaRecorder` + Web Speech Recognition + text fallback, IndexedDB voice replay, and Gemini structured JSON evaluation (`/api/speaking/evaluate`).
4. **Mistake Memory & Communication DNA (`/app/improve`, `/app/progress`)**: Captures real errors from diagnostics, lessons, speaking, and transfer drills; runs targeted `"Fix This Mistake"` micro-drills; supports `"Report False Correction"` flagging; computes 5 independent Communication DNA dimensions only when `sampleSize >= 3`.
5. **Transfer Lab & Verified Gamification (`/app/transfer-lab`)**: Bridges recent lessons and recurring mistakes into unassisted real-world scenarios graded across a 4-dimension Gemini rubric (`/api/transfer/evaluate`), backed by an auditable, idempotent XP ledger.
6. **Admin Control Center & Privacy Sovereignty (`/admin`, `/settings`)**:
   - RBAC-guarded **Curriculum Builder** (create, edit, version, and live-publish playable 7-stage courses/modules/lessons), **AI Operations & Cost Monitor** (strictly real latency, tokens, cost, prompt versions, error logs), **Reported Mistakes Queue**, and **Immutable Audit Log Viewer**.
   - Granular privacy consent switches (**Mic Recording Storage**, **AI Telemetry Logging**), one-click **JSON Learning Data Export**, and **Verified Recordings & Account Deletion**.

---

## Local Development

```bash
npm install
cp .env.example .env
# Set GEMINI_API_KEY in .env (or AI Studio Secrets)
npm run dev
```

The Express + Vite dev server runs on `http://localhost:3000`.

### Verification Commands

```bash
# TypeScript type-check
npm run lint

# Unit tests (Diagnostic, Spaced Repetition, Speaking, Mistake Memory, DNA, Transfer Lab, Gamification, Admin Governance & Privacy)
npx tsx --test src/domain/*.test.ts src/services/storage/localRepository.test.ts

# Production SPA build
npm run build
```

---

## Cloudflare Production Deployment (Pages + Workers + D1 + R2 + KV)

This repository includes production-ready Cloudflare infrastructure configuration:

- **`wrangler.toml`**: Configures Cloudflare Pages (`dist/`), Workers API, D1 (`DB`), R2 (`AUDIO_BUCKET`), and KV (`SESSION_KV`, `RATE_LIMIT_KV`).
- **`schema.sql`**: Complete normalized SQLite schema for Cloudflare D1 (`users`, `learner_profiles`, `courses`, `modules`, `lessons`, `diagnostic_attempts`, `lesson_attempts`, `exercise_attempts`, `speaking_sessions`, `learner_mistakes`, `mistake_drill_attempts`, `transfer_attempts`, `xp_events`, `ai_telemetry_events`, `audit_logs`).
- **`src/services/apiClient.ts` & `src/services/storage/d1ApiRepository.ts`**: Cleanly switch the entire frontend from local persistence to live `/api/v1/*` Cloudflare Workers endpoints by setting `VITE_API_BASE_URL` with zero UI code rewrites.

### Deployment Steps

1. **Create Cloudflare Resources**
   ```bash
   npx wrangler d1 create linguaverse-db
   npx wrangler r2 bucket create linguaverse-voice-recordings
   npx wrangler kv namespace create SESSION_KV
   npx wrangler kv namespace create RATE_LIMIT_KV
   ```
   Copy the generated IDs into `wrangler.toml`.

2. **Apply D1 Database Migration**
   ```bash
   npx wrangler d1 execute linguaverse-db --remote --file=./schema.sql
   ```

3. **Configure Production Secrets (Never Commit Keys)**
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put JWT_SIGNING_SECRET
   ```

4. **Deploy Worker API & Pages Frontend**
   ```bash
   npx wrangler deploy --env production
   VITE_API_BASE_URL=https://api.linguaverse.ai npm run build
   npx wrangler pages deploy dist --project-name=linguaverse-ai
   ```

---

## Security & Privacy Checklist
- **No client-side secrets**: Gemini API calls are proxied exclusively through server/Worker routes (`/api/speaking/evaluate`, `/api/transfer/evaluate`).
- **RBAC Enforcement**: `/admin` enforces granular role grants (`admin`, `content_manager`, `ai_ops`, `learner` blocked). Production Workers validate signed JWT claims + D1 `users.role` on every `/api/v1/admin/*` route.
- **Consent-First Audio & Telemetry**: Audio blobs are persisted to IndexedDB/R2 only when `storeMicRecordings` is enabled; AI usage telemetry is recorded only when `logAiEvaluations` is enabled.
- **Right to Portability & Erasure**: Learners can export a full structured JSON archive or trigger verified cleanup of all voice recordings and account records from `/settings`.
- **Anti-Farming XP Integrity**: `xp_events` enforces `UNIQUE(user_id, idempotency_key)` so repeating the same action never mints duplicate XP.
