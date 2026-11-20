-- ============================================================================
-- LINGUAVERSE AI — Cloudflare D1 (SQLite) Production Migration Schema
-- Execute via:
--   npx wrangler d1 execute linguaverse-db --file=./schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Core Identity & RBAC Accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'institution')),
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'content_manager', 'ai_ops', 'admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Learner Preferences, Spaced Repetition Cadence & Privacy Sovereignty Consents
CREATE TABLE IF NOT EXISTS learner_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_ui_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_ui_language IN ('en', 'bn')),
  explanation_language TEXT NOT NULL DEFAULT 'bn' CHECK (explanation_language IN ('bn', 'both', 'en')),
  self_estimated_level TEXT NOT NULL DEFAULT 'A2' CHECK (self_estimated_level IN ('Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1')),
  primary_goal TEXT NOT NULL DEFAULT 'daily_speaking' CHECK (primary_goal IN ('job_interview', 'daily_speaking', 'academic_ielts', 'workplace')),
  daily_time_goal_minutes INTEGER NOT NULL DEFAULT 15,
  spaced_repetition_preset TEXT NOT NULL DEFAULT 'standard' CHECK (spaced_repetition_preset IN ('intensive', 'standard', 'relaxed')),
  store_mic_recordings INTEGER NOT NULL DEFAULT 1 CHECK (store_mic_recordings IN (0, 1)),
  log_ai_evaluations INTEGER NOT NULL DEFAULT 1 CHECK (log_ai_evaluations IN (0, 1)),
  privacy_consent_updated_at TEXT NOT NULL,
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
  diagnostic_completed INTEGER NOT NULL DEFAULT 0 CHECK (diagnostic_completed IN (0, 1)),
  updated_at TEXT NOT NULL
);

-- 3. Versioned Bilingual Curriculum (Admin Curriculum Builder -> Live Academy)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  cefr_range TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  subtitle_en TEXT NOT NULL,
  subtitle_bn TEXT NOT NULL,
  target_audience_en TEXT NOT NULL,
  target_audience_bn TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  published_status TEXT NOT NULL DEFAULT 'published' CHECK (published_status IN ('draft', 'published')),
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_bn TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modules_course_order ON modules(course_id, sort_order);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  cefr_band TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 7,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_bn TEXT NOT NULL,
  payload_json TEXT NOT NULL, -- Full 7-stage structured lesson JSON (concept, contrastRows, examples, guided, independent, assessment)
  version INTEGER NOT NULL DEFAULT 1,
  published_status TEXT NOT NULL DEFAULT 'published' CHECK (published_status IN ('draft', 'published')),
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON lessons(module_id, sort_order);

-- 4. Evidence-Based Baseline Diagnostic Attempts
CREATE TABLE IF NOT EXISTS diagnostic_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  self_estimated_level TEXT NOT NULL,
  observed_starting_band TEXT NOT NULL,
  total_correct INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  recommended_track_en TEXT NOT NULL,
  recommended_track_bn TEXT NOT NULL,
  domain_breakdown_json TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_user_date ON diagnostic_attempts(user_id, completed_at DESC);

-- 5. Academy 7-Stage Lesson & Exercise Attempts (Spaced Repetition Evidence)
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

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user_lesson ON lesson_attempts(user_id, lesson_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('guided', 'independent', 'assessment')),
  exercise_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  user_response TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  mistake_category TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user ON exercise_attempts(user_id, created_at DESC);

-- 6. AI Speaking Studio Sessions & Turn Replay (Audio Blobs in Cloudflare R2)
CREATE TABLE IF NOT EXISTS speaking_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode_id TEXT NOT NULL,
  pressure_level TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  turns_json TEXT NOT NULL, -- Includes R2 object keys (audioBlobKey) when recording storage consent = 1
  total_mistakes_detected INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user ON speaking_sessions(user_id, updated_at DESC);

-- 7. Mistake Memory Engine & Admin False-Correction Quality Queue
CREATE TABLE IF NOT EXISTS learner_mistakes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('diagnostic', 'lesson_guided', 'lesson_independent', 'lesson_assessment', 'speaking_studio')),
  lesson_id TEXT,
  speaking_session_id TEXT,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  user_example TEXT NOT NULL,
  corrected_example TEXT NOT NULL,
  pattern_en TEXT NOT NULL,
  pattern_bn TEXT NOT NULL,
  explanation_en TEXT NOT NULL,
  explanation_bn TEXT NOT NULL,
  occurrences INTEGER NOT NULL DEFAULT 1,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'practicing', 'resolved')),
  practice_attempts INTEGER NOT NULL DEFAULT 0,
  consecutive_passes INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TEXT,
  next_review_at TEXT,
  false_correction_reported INTEGER NOT NULL DEFAULT 0 CHECK (false_correction_reported IN (0, 1)),
  false_correction_reason TEXT,
  false_correction_reported_at TEXT,
  admin_review_status TEXT CHECK (admin_review_status IN ('pending', 'upheld_false_positive', 'confirmed_accurate')),
  admin_review_note TEXT,
  admin_reviewed_at TEXT,
  admin_reviewed_by TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mistakes_user_status ON learner_mistakes(user_id, status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistakes_flagged_queue ON learner_mistakes(false_correction_reported, admin_review_status);

CREATE TABLE IF NOT EXISTS mistake_drill_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mistake_id TEXT NOT NULL REFERENCES learner_mistakes(id) ON DELETE CASCADE,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  user_rewrite TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mistake_drills_user ON mistake_drill_attempts(user_id, created_at DESC);

-- 8. Transfer Lab & 5-Level Pressure Ladder Attempts
CREATE TABLE IF NOT EXISTS transfer_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id TEXT NOT NULL,
  pressure_level TEXT NOT NULL,
  target_skill_label_en TEXT NOT NULL,
  target_skill_label_bn TEXT NOT NULL,
  linked_source_type TEXT NOT NULL CHECK (linked_source_type IN ('mistake_memory', 'academy_lesson', 'baseline')),
  linked_source_id TEXT,
  user_response TEXT NOT NULL,
  twist_prompt_shown TEXT,
  twist_response TEXT,
  input_channel TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  timed_out INTEGER NOT NULL DEFAULT 0 CHECK (timed_out IN (0, 1)),
  overall_score INTEGER NOT NULL,
  evaluation_json TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transfer_attempts_user ON transfer_attempts(user_id, completed_at DESC);

-- 9. Verified Idempotent XP Ledger (DB-Level Anti-Farming Guarantee)
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('lesson_completion', 'lesson_mastery_tier', 'speaking_session', 'mistake_resolved', 'transfer_pass')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  evidence_en TEXT NOT NULL,
  evidence_bn TEXT NOT NULL,
  related_entity_id TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id, created_at DESC);

-- 10. Real AI Operations & Cost Telemetry (Strict Zero-Fabrication Log)
CREATE TABLE IF NOT EXISTS ai_telemetry_events (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  latency_ms INTEGER NOT NULL,
  estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_telemetry_created ON ai_telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_status ON ai_telemetry_events(status, created_at DESC);

-- 11. Immutable Administrative & Privacy Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_bn TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, created_at DESC);
