-- LINGUAVERSE AI — Additive Migration 0006: Global Query & Hydration Composite Indexes
-- Strictly additive & idempotent (safe on fresh and populated databases).
-- Eliminates full scans and temp B-tree sorts across learner auth hydration,
-- admin overview/users metrics, and scoped community feed cursor pagination.

CREATE INDEX IF NOT EXISTS idx_learner_mistakes_user_last_seen
  ON learner_mistakes(user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_learner_mistakes_user_status
  ON learner_mistakes(user_id, status);

CREATE INDEX IF NOT EXISTS idx_lesson_attempts_user_completed
  ON lesson_attempts(user_id, completed_at ASC);

CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user_updated
  ON speaking_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_transfer_attempts_user_completed
  ON transfer_attempts(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_xp_events_user_verified
  ON user_xp_events(user_id, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_status_created
  ON community_posts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_status_created
  ON community_comments(post_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users(email_verified);

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users(account_status);
