-- ============================================================================
-- Migration 0002: Parts 06–12 Cloud Persistence Parity (Strictly Additive)
-- ============================================================================
-- Non-destructive additive migration adding cloud-persisted state tables for:
--   - Part 06 Academy enrollments, bookmarks & Save/Exit lesson drafts
--   - Part 08 AI Conversation correction preference, vocabulary vault & draft
--   - Part 11 Transfer Lab multi-turn session drafts & transcripts
--   - Part 12 Communication Replay reviews (read-only over history) & separate practice attempts
--
-- Apply via:
--   npx wrangler d1 migrations apply linguaverse-db
-- Rollback strategy:
--   See migrations/ROLLBACK_0002_parts06_12_parity.sql (drops only these 5 additive tables;
--   leaves all pre-existing users, sessions, lessons, speaking, mistakes, and transfer records intact).
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Part 06: Academy Enrollments, Bookmarks & Mid-Lesson Save/Exit Drafts
CREATE TABLE IF NOT EXISTS learner_academy_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enrolled_course_ids_json TEXT NOT NULL DEFAULT '[]',
  bookmarked_lesson_ids_json TEXT NOT NULL DEFAULT '[]',
  lesson_drafts_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

-- Part 08: Speaking Studio Correction Style, Saved Vocabulary Vault & Active Draft
CREATE TABLE IF NOT EXISTS learner_speaking_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  correction_style TEXT NOT NULL DEFAULT 'gentle' CHECK (correction_style IN ('gentle', 'detailed', 'conversation_first')),
  saved_vocabulary_json TEXT NOT NULL DEFAULT '[]',
  active_draft_json TEXT,
  updated_at TEXT NOT NULL
);

-- Part 11: Multi-Turn Transfer Lab Drafts & Transcripts
CREATE TABLE IF NOT EXISTS transfer_session_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  pressure_level TEXT NOT NULL DEFAULT 'level_2_guided',
  transcript_json TEXT NOT NULL DEFAULT '[]',
  objectives_json TEXT NOT NULL DEFAULT '[]',
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'abandoned')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfer_drafts_user_updated
  ON transfer_session_drafts(user_id, updated_at DESC);

-- Part 12: Communication Replay Review Progress (Strictly Separate from Historical Records)
CREATE TABLE IF NOT EXISTS replay_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_source TEXT NOT NULL CHECK (session_source IN ('speaking_studio', 'transfer_lab')),
  status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed', 'in_review', 'reviewed')),
  started_review_at TEXT,
  reviewed_at TEXT,
  last_reviewed_turn_id TEXT,
  reviewed_comparison_ids_json TEXT NOT NULL DEFAULT '[]',
  learner_note TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_replay_reviews_user_updated
  ON replay_reviews(user_id, updated_at DESC);

-- Part 12: Communication Replay Practice Retries (Strictly Isolated from Historical Mistakes/XP)
CREATE TABLE IF NOT EXISTS replay_practice_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  original_response TEXT NOT NULL,
  corrected_reference TEXT,
  learner_retry_text TEXT NOT NULL,
  ai_feedback_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_replay_practice_user_session
  ON replay_practice_attempts(user_id, session_id, created_at DESC);
