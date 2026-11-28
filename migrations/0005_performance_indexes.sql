-- LINGUAVERSE AI — Additive Migration 0005: D1 Query Performance Indexes
-- Strictly additive & idempotent (safe on fresh and populated databases).
-- Optimizes Admin listing, public curriculum overlay, security audit filtering,
-- CMS analytics sorting, and Cron scheduled cleanup scans.

CREATE INDEX IF NOT EXISTS idx_users_created_desc
  ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_courses_custom_published
  ON courses(is_custom, published_status, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_lessons_custom_published
  ON lessons(is_custom, published_status, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_analytics_created
  ON cms_analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audio_assets_created
  ON audio_assets(created_at);
