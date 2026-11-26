-- ============================================================================
-- LINGUAVERSE AI — Cloudflare D1 (SQLite) Production Migration Schema (PRD v5.0)
-- Execute via:
--   npx wrangler d1 execute linguaverse-db --file=./schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Core Identity, Email Verification & RBAC Accounts
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'institution')),
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'moderator', 'content_manager', 'ai_ops', 'admin', 'super_admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(email_verified, account_status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_hash TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_otp_user ON email_verification_tokens(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_otp_email ON email_verification_tokens(email, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id, created_at DESC);

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

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('mic_recordings', 'ai_evaluation_logging', 'privacy_policy', 'terms_of_service')),
  granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
  policy_version TEXT NOT NULL DEFAULT 'v5.0',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, consent_type, updated_at DESC);

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
  published_status TEXT NOT NULL DEFAULT 'published' CHECK (published_status IN ('draft', 'published', 'archived')),
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
  payload_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  published_status TEXT NOT NULL DEFAULT 'published' CHECK (published_status IN ('draft', 'published', 'archived')),
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

-- 5. Academy 7-Stage Lesson, Exercise & Vocabulary Spaced Repetition Attempts
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

CREATE TABLE IF NOT EXISTS vocabulary_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT,
  word_en TEXT NOT NULL,
  meaning_bn TEXT NOT NULL,
  context_sentence TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TEXT NOT NULL,
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocab_reviews_user_due ON vocabulary_reviews(user_id, next_review_at);

-- 6. AI Speaking Studio Sessions, Transcripts, Assessments & R2 Audio Assets
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

CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user ON speaking_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS speaking_transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES speaking_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  input_channel TEXT NOT NULL,
  raw_transcript TEXT NOT NULL,
  corrected_transcript TEXT NOT NULL,
  audio_asset_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_speaking_transcripts_session ON speaking_transcripts(session_id, turn_number);

CREATE TABLE IF NOT EXISTS speaking_assessments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES speaking_sessions(id) ON DELETE CASCADE,
  transcript_id TEXT REFERENCES speaking_transcripts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ai_reply TEXT NOT NULL,
  ai_reply_bn_hint TEXT,
  natural_alternative TEXT,
  pronunciation_note TEXT,
  mistakes_count INTEGER NOT NULL DEFAULT 0,
  evaluation_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_speaking_assessments_user ON speaking_assessments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audio_assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES speaking_sessions(id) ON DELETE SET NULL,
  r2_object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audio_assets_user ON audio_assets(user_id, created_at DESC);

-- 7. Mistake Memory Engine, Mistake Reviews, Reported Mistakes & Skill Measurements
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

CREATE TABLE IF NOT EXISTS mistake_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mistake_id TEXT NOT NULL REFERENCES learner_mistakes(id) ON DELETE CASCADE,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  interval_days INTEGER NOT NULL DEFAULT 1,
  next_review_at TEXT NOT NULL,
  reviewed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mistake_reviews_user ON mistake_reviews(user_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS reported_mistakes (
  id TEXT PRIMARY KEY,
  mistake_id TEXT NOT NULL REFERENCES learner_mistakes(id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'upheld_false_positive', 'confirmed_accurate')),
  reviewer_user_id TEXT,
  reviewer_note TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reported_mistakes_status ON reported_mistakes(review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS skill_measurements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  score_percent REAL NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 1,
  source_type TEXT NOT NULL,
  measured_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_measurements_user ON skill_measurements(user_id, domain, measured_at DESC);

-- 8. Transfer Lab Scenarios & 5-Level Pressure Ladder Attempts
CREATE TABLE IF NOT EXISTS transfer_scenarios (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  context_en TEXT NOT NULL,
  context_bn TEXT NOT NULL,
  min_cefr TEXT NOT NULL DEFAULT 'A2',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  updated_at TEXT NOT NULL
);

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

-- 9. Verified Idempotent XP Ledger & Achievements (Zero Fake Gamification)
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

CREATE TABLE IF NOT EXISTS user_xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('lesson_completed', 'lesson_mastery_tier', 'speaking_session_completed', 'mistake_resolved', 'transfer_lab_passed')),
  source_id TEXT NOT NULL,
  xp_earned INTEGER NOT NULL CHECK (xp_earned > 0),
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  detail_en TEXT NOT NULL,
  detail_bn TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_user_xp_events_user ON user_xp_events(user_id, verified_at DESC);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  evidence_summary TEXT NOT NULL,
  unlocked_at TEXT NOT NULL,
  UNIQUE(user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id, unlocked_at DESC);

-- 10. Real AI Operations, Provider Events, Usage Ledger & Prompt Versions
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

CREATE TABLE IF NOT EXISTS ai_provider_events (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gemini',
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  latency_ms INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  user_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_events_created ON ai_provider_events(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id TEXT PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  user_id TEXT,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_ledger_created ON ai_usage_ledger(created_at DESC);

CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('speaking_evaluate', 'transfer_evaluate', 'landing_analyze')),
  version_tag TEXT NOT NULL UNIQUE,
  model_target TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL
);

-- 11. System Settings & Immutable Administrative Audit Log
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

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

-- ============================================================================
-- 12. Full-Stack CMS, Media Assets, Analytics Events & Subscriptions (Additive)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cms_documents (
  doc_key TEXT PRIMARY KEY CHECK (doc_key IN ('published', 'draft')),
  version INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_sections (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_navigation_items (
  id TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  label_bn TEXT NOT NULL,
  href TEXT NOT NULL,
  nav_type TEXT NOT NULL DEFAULT 'anchor' CHECK (nav_type IN ('anchor', 'route', 'dropdown')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  dropdown_json TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_features (
  id TEXT PRIMARY KEY,
  icon_key TEXT NOT NULL,
  accent TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  summary_bn TEXT NOT NULL,
  target_route TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_languages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_label TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('live', 'coming_soon')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_pricing_plans (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  tagline_en TEXT NOT NULL,
  tagline_bn TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT '$',
  monthly_price REAL NOT NULL DEFAULT 0,
  yearly_monthly_price REAL NOT NULL DEFAULT 0,
  is_popular INTEGER NOT NULL DEFAULT 0 CHECK (is_popular IN (0, 1)),
  features_en_json TEXT NOT NULL,
  features_bn_json TEXT NOT NULL,
  fair_use_note_en TEXT,
  fair_use_note_bn TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_testimonials (
  id TEXT PRIMARY KEY,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  quote_en TEXT NOT NULL,
  quote_bn TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_testimonials_status ON cms_testimonials(status, sort_order ASC);

CREATE TABLE IF NOT EXISTS cms_faqs (
  id TEXT PRIMARY KEY,
  question_en TEXT NOT NULL,
  question_bn TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  answer_bn TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_media_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cms_analytics_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_analytics_type ON cms_analytics_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_slug TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('pending_provider', 'active', 'past_due', 'canceled')),
  provider TEXT NOT NULL DEFAULT 'unconfigured',
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Password Reset Token Lookup Index (table defined in Section 1)
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);

-- ============================================================================
-- 14. Parts 06–12 Cloud Persistence Parity Tables (Mirrors migrations/0002_parts06_12_parity.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS learner_academy_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enrolled_course_ids_json TEXT NOT NULL DEFAULT '[]',
  bookmarked_lesson_ids_json TEXT NOT NULL DEFAULT '[]',
  lesson_drafts_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS learner_speaking_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  correction_style TEXT NOT NULL DEFAULT 'gentle' CHECK (correction_style IN ('gentle', 'detailed', 'conversation_first')),
  saved_vocabulary_json TEXT NOT NULL DEFAULT '[]',
  active_draft_json TEXT,
  updated_at TEXT NOT NULL
);

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

-- ============================================================================
-- 15. P3 Vocabulary Deck, Community & Moderation, Billing Invoices, Support & Retention
--     (Mirrors migrations/0003_p3_community_vocab_billing.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  word_normalized TEXT NOT NULL,
  phonetic_hint TEXT,
  meaning_en TEXT NOT NULL,
  meaning_bn TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'lesson', 'speaking_studio', 'mistake_memory')),
  source_id TEXT,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  review_count INTEGER NOT NULL DEFAULT 0,
  pass_count INTEGER NOT NULL DEFAULT 0,
  consecutive_passes INTEGER NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 1,
  mastery_status TEXT NOT NULL DEFAULT 'new' CHECK (mastery_status IN ('new', 'learning', 'reviewing', 'mastered')),
  algorithm_version TEXT NOT NULL DEFAULT 'srs-v2.0-sm2-lite',
  last_reviewed_at TEXT,
  next_review_at TEXT NOT NULL,
  review_history_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, word_normalized)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_user_due
  ON vocabulary_items(user_id, next_review_at ASC);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_level TEXT NOT NULL DEFAULT 'A2',
  category TEXT NOT NULL DEFAULT 'discussion' CHECK (category IN ('discussion', 'question', 'practice_challenge')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  helpful_user_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden_by_mod', 'deleted')),
  moderation_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created
  ON community_posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden_by_mod', 'deleted')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_comments_post
  ON community_comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
  target_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved_removed', 'resolved_dismissed', 'escalated')),
  enforcement_action TEXT NOT NULL DEFAULT 'none' CHECK (enforcement_action IN ('none', 'hide_content', 'warn_user', 'restrict_user')),
  reviewer_user_id TEXT,
  reviewer_note TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_community_reports_status
  ON community_reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS community_user_blocks (
  id TEXT PRIMARY KEY,
  blocker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_blocks_blocker
  ON community_user_blocks(blocker_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_user_restrictions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  restriction_level TEXT NOT NULL DEFAULT 'none' CHECK (restriction_level IN ('none', 'muted_24h', 'posting_suspended')),
  reason TEXT NOT NULL DEFAULT '',
  restricted_by TEXT,
  expires_at TEXT,
  appeal_text TEXT,
  appeal_status TEXT NOT NULL DEFAULT 'none' CHECK (appeal_status IN ('none', 'pending', 'approved', 'denied')),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_invoices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_slug TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending_provider' CHECK (status IN ('pending_provider', 'paid', 'failed', 'refund_requested', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'unconfigured',
  failure_reason TEXT,
  refund_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user
  ON subscription_invoices(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('billing', 'technical', 'curriculum', 'abuse_appeal', 'privacy')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_response TEXT,
  handled_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
  ON support_tickets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS learner_gamification_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_opt_in IN (0, 1)),
  display_alias TEXT NOT NULL DEFAULT '',
  reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
  reminder_time_local TEXT NOT NULL DEFAULT '20:00',
  updated_at TEXT NOT NULL
);

-- ============================================================================
-- 16. PRD v6.1 Examinations, Writing Intelligence, Human Bridge & Notifications
--     (Mirrors migrations/0004_prd61_examinations_labs_providers.sql)
-- ============================================================================
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





