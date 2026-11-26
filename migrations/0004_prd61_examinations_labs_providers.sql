-- ============================================================================
-- LINGUAVERSE AI — Additive D1 Migration 0004 (PRD v6.1 Examinations, Labs & Notifications)
-- Strictly additive (CREATE TABLE IF NOT EXISTS). Preserves all existing data.
-- Provider configs & feature flags reuse existing `system_settings` (0001).
-- ============================================================================

-- 1. IELTS & English Examination Attempts (PRD §22)
CREATE TABLE IF NOT EXISTS examination_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('speaking', 'writing', 'reading', 'listening')),
  task_title_en TEXT NOT NULL,
  response_text TEXT NOT NULL DEFAULT '',
  word_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  objective_score_pct INTEGER,
  correct_count INTEGER,
  total_questions INTEGER,
  rubric_feedback_json TEXT,
  question_results_json TEXT,
  model_used TEXT NOT NULL DEFAULT 'deterministic',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_examination_attempts_user_created
  ON examination_attempts(user_id, created_at DESC);

-- 2. Writing Intelligence & Language Diary Entries (PRD §23.2, §26)
CREATE TABLE IF NOT EXISTS writing_diary_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  title TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_version TEXT NOT NULL,
  natural_alternative TEXT NOT NULL,
  issues_json TEXT NOT NULL DEFAULT '[]',
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  bangla_summary TEXT NOT NULL DEFAULT '',
  targeted_practice_en TEXT NOT NULL DEFAULT '',
  rewritten_text TEXT,
  model_used TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_writing_diary_user_created
  ON writing_diary_entries(user_id, created_at DESC);

-- 3. Human Communication Bridge Reflection Logs (PRD §30 — strictly user_reported)
CREATE TABLE IF NOT EXISTS human_bridge_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scenario_context TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'other',
  goal_en TEXT NOT NULL DEFAULT '',
  what_went_well TEXT NOT NULL,
  what_felt_hard TEXT NOT NULL DEFAULT '',
  self_reported_confidence INTEGER NOT NULL CHECK (self_reported_confidence BETWEEN 1 AND 5),
  evidence_type TEXT NOT NULL DEFAULT 'user_reported' CHECK (evidence_type = 'user_reported'),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_human_bridge_user_created
  ON human_bridge_logs(user_id, created_at DESC);

-- 4. Learner Notification & Learning Schedule Preferences (PRD §35)
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id TEXT PRIMARY KEY,
  reminders_enabled INTEGER NOT NULL DEFAULT 1,
  preferred_time_local TEXT NOT NULL DEFAULT '20:00',
  quiet_hours_start TEXT NOT NULL DEFAULT '22:30',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:30',
  review_reminders INTEGER NOT NULL DEFAULT 1,
  assessment_reminders INTEGER NOT NULL DEFAULT 1,
  subscription_notices INTEGER NOT NULL DEFAULT 1,
  security_notifications INTEGER NOT NULL DEFAULT 1,
  email_notifications INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Persisted User & Admin Broadcast Notifications (PRD §35)
CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system_broadcast',
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL,
  body_bn TEXT NOT NULL DEFAULT '',
  action_route TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON user_notifications(user_id, created_at DESC);
