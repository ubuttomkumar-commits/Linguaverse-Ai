-- ============================================================================
-- Rollback Reference for Migration 0002 (Parts 06–12 Cloud Persistence Parity)
-- ============================================================================
-- Drops ONLY the 5 additive tables introduced in 0002_parts06_12_parity.sql.
-- Does NOT modify or drop any core tables (users, sessions, speaking_sessions,
-- learner_mistakes, transfer_attempts, audio_assets, xp_events, audit_logs, etc.).
-- Execute manually ONLY if reverting Migration 0002:
--   npx wrangler d1 execute linguaverse-db --file=./migrations/ROLLBACK_0002_parts06_12_parity.sql
-- ============================================================================

DROP INDEX IF EXISTS idx_replay_practice_user_session;
DROP TABLE IF EXISTS replay_practice_attempts;

DROP INDEX IF EXISTS idx_replay_reviews_user_updated;
DROP TABLE IF EXISTS replay_reviews;

DROP INDEX IF EXISTS idx_transfer_drafts_user_updated;
DROP TABLE IF EXISTS transfer_session_drafts;

DROP TABLE IF EXISTS learner_speaking_preferences;
DROP TABLE IF EXISTS learner_academy_state;
