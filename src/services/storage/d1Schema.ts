/**
 * Reference SQLite / Cloudflare D1 DDL for Worker deployment.
 * Mirrors Phase 1 (Auth/Diagnostic/Mistakes) + Phase 2 (Academy Lesson & Exercise Attempts).
 */
export const CLOUDFLARE_D1_MIGRATION_0001 = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_ui_language TEXT NOT NULL DEFAULT 'en',
  explanation_language TEXT NOT NULL DEFAULT 'bn',
  self_estimated_level TEXT NOT NULL DEFAULT 'A2',
  primary_goal TEXT NOT NULL DEFAULT 'daily_speaking',
  daily_time_goal_minutes INTEGER NOT NULL DEFAULT 15,
  spaced_repetition_preset TEXT NOT NULL DEFAULT 'standard',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  diagnostic_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnostic_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_correct INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  accuracy_percent INTEGER NOT NULL,
  estimated_starting_band TEXT NOT NULL,
  confidence_coverage_percent INTEGER NOT NULL,
  payload_json TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mistake_memory_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  lesson_id TEXT,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  user_example TEXT NOT NULL,
  corrected_example TEXT NOT NULL,
  pattern_en TEXT NOT NULL,
  pattern_bn TEXT NOT NULL,
  explanation_en TEXT NOT NULL,
  explanation_bn TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  severity TEXT DEFAULT 'medium',
  confidence REAL,
  speaking_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  practice_attempts_count INTEGER NOT NULL DEFAULT 0,
  practice_pass_count INTEGER NOT NULL DEFAULT 0,
  review_interval_days INTEGER,
  last_practiced_at TEXT,
  next_review_at TEXT,
  false_correction_reported INTEGER NOT NULL DEFAULT 0,
  false_correction_reason TEXT,
  false_correction_reported_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS mistake_drill_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mistake_id TEXT NOT NULL REFERENCES mistake_memory_items(id) ON DELETE CASCADE,
  passed INTEGER NOT NULL,
  user_rewrite TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  guided_correct INTEGER NOT NULL,
  guided_total INTEGER NOT NULL,
  independent_correct INTEGER NOT NULL,
  independent_total INTEGER NOT NULL,
  assessment_correct INTEGER NOT NULL,
  assessment_total INTEGER NOT NULL,
  overall_accuracy_percent INTEGER NOT NULL,
  mistakes_logged_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  lesson_attempt_id TEXT REFERENCES lesson_attempts(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  user_response TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  mistake_category TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS speaking_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode_id TEXT NOT NULL,
  pressure_level TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  turns_json TEXT NOT NULL,
  total_mistakes_detected INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transfer_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  pressure_level TEXT NOT NULL,
  target_skill_label_en TEXT NOT NULL,
  target_skill_label_bn TEXT NOT NULL,
  linked_source_type TEXT NOT NULL,
  linked_source_id TEXT,
  user_response TEXT NOT NULL,
  twist_prompt_shown TEXT,
  twist_response TEXT,
  input_channel TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  timed_out INTEGER NOT NULL DEFAULT 0,
  evaluation_json TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  detail_en TEXT NOT NULL,
  detail_bn TEXT NOT NULL,
  xp_earned INTEGER NOT NULL,
  verified_at TEXT NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user_lesson ON lesson_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user_lesson ON exercise_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user ON speaking_sessions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_mistakes_user_status ON mistake_memory_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mistake_drills_user ON mistake_drill_attempts(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transfer_attempts_user ON transfer_attempts(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user ON xp_ledger(user_id, verified_at);
`;
