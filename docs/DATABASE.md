# LINGUAVERSE AI — Database Schema & Migration Ledger

## 1. Database Engine & Parity Strategy

- **Production Database:** Cloudflare D1 (SQLite) configured via `wrangler.toml` (`binding = "DB"`).
- **Canonical Baseline:** `schema.sql` (Sections 1–16) represents the complete schema state.
- **Sequential Additive Migrations (`migrations/`):**
  1. `migrations/0001_initial_schema.sql` — Baseline production tables (Sections 1–13).
  2. `migrations/0002_parts06_12_parity.sql` — Additive Parts 06–12 cloud sync & replay tables (Section 14).
  3. `migrations/0003_p3_community_vocab_billing.sql` — Additive Vocabulary SRS, Community, Moderation, Billing & Gamification tables (Section 15).
  4. `migrations/0004_prd61_exams_labs_notifications.sql` — Additive IELTS Examinations, Writing Diary, Human Bridge & Server Notifications tables (Section 16).
- **Non-Destructive Rollback Scripts (`migrations/`):**
  - `migrations/ROLLBACK_0004_prd61_exams_labs_notifications.sql`
  - `migrations/ROLLBACK_0003_p3_community_vocab_billing.sql`
  - `migrations/ROLLBACK_0002_parts06_12_parity.sql`
- **Automated Verification:** `worker/workerParity.test.ts` (Test #136) executes `0001 -> 0002 -> 0003 -> 0004` against an in-memory Node 22 `node:sqlite` database, asserts exact table parity with `schema.sql`, seeds records across tables, and verifies non-destructive rollback (`ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002`) preserves all baseline user and learning rows.

---

## 2. Table Domains Overview

### Core Identity, Auth & RBAC (`0001`)
- `users`: Primary accounts with `password_salt`, `password_hash`, `email_verified`, `account_status` (`active` | `suspended`), `plan` (`free` | `pro` | `institution`), and `role` (`learner` | `moderator` | `content_manager` | `ai_ops` | `admin` | `super_admin`).
- `sessions`: Server-tracked sessions with `token_hash` (SHA-256 unique), `user_agent`, `expires_at`, and `revoked_at`.
- `email_verification_tokens`: SHA-256 hashed 6-digit OTPs with `expires_at`, `attempts`, and `consumed_at`.
- `password_reset_tokens`: Single-use SHA-256 hashed recovery tokens with `used_at`.

### Learner Profile, Privacy & Academy (`0001`, `0002`)
- `learner_profiles`, `user_consents` (authoritative server-side consent for `mic_recordings` and `ai_evaluation_logging`).
- `courses`, `modules`, `lessons`, `lesson_attempts`, `diagnostic_attempts`, `learner_academy_state` (enrollments, bookmarks, mid-lesson drafts).

### Speaking, Transfer Lab, Mistake Memory, DNA & Replay (`0001`, `0002`)
- `speaking_sessions`, `speaking_transcripts`, `speaking_assessments`, `audio_assets` (R2 object keys scoped by `user_id`), `learner_speaking_preferences`.
- `mistake_memory`, `mistake_reviews`, `reported_mistakes`.
- `skill_measurements` (Communication DNA evidence ledger).
- `transfer_scenarios`, `transfer_attempts`, `transfer_session_drafts`.
- `replay_reviews`, `replay_practice_attempts` (strictly separated from historical sessions to enforce immutability).

### Vocabulary, Community, Gamification & Billing (`0001`, `0003`)
- `vocabulary_items`, `vocabulary_reviews` (SM-2 scheduling state).
- `community_posts`, `community_comments`, `community_reports`, `community_user_blocks`, `community_user_restrictions` (zero direct-messaging tables).
- `user_xp_events` (`UNIQUE(user_id, idempotency_key)`), `achievements`, `learner_gamification_prefs`.
- `subscriptions`, `subscription_invoices`, `support_tickets`.

### PRD v6.1 Examinations, Advanced Labs & Notifications (`0004`)
- `examination_attempts` (IELTS/exam attempts & graded rubrics).
- `writing_diary_entries` (multi-mode writing journal & AI feedback).
- `human_bridge_logs` (real-world conversation practice tracker).
- `user_notification_preferences`, `user_notifications` (per-user inbox & broadcast notices).

### Governance, AI Ops, CMS & System Config (`0001`)
- `ai_provider_events`, `ai_usage_ledger`, `prompt_versions`.
- `system_settings` (`setting_key`, `setting_value` — stores feature flags, AI runtime config, and non-secret platform config).
- `cms_documents`, `cms_media_assets`, `analytics_events`, `audit_logs` (append-only administrative ledger with correlation IDs).

---

## 3. Safe Production Migration Procedure

```bash
# 1. Export a timestamped pre-migration backup from production D1
npx wrangler d1 export linguaverse-db --remote --output="backups/linguaverse-db-$(date +%Y%m%d-%H%M%S).sql"

# 2. Apply pending additive migrations in strict order
npx wrangler d1 migrations apply linguaverse-db --remote

# 3. Verify applied migration list
npx wrangler d1 migrations list linguaverse-db --remote
```
