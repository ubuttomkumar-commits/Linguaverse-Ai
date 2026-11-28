-- LINGUAVERSE AI — Non-Destructive Rollback for Migration 0006
-- Drops only the composite query indexes introduced in 0006; preserves 100% of table data.

DROP INDEX IF EXISTS idx_users_account_status;
DROP INDEX IF EXISTS idx_users_email_verified;
DROP INDEX IF EXISTS idx_community_comments_post_status_created;
DROP INDEX IF EXISTS idx_community_posts_status_created;
DROP INDEX IF EXISTS idx_user_xp_events_user_verified;
DROP INDEX IF EXISTS idx_transfer_attempts_user_completed;
DROP INDEX IF EXISTS idx_speaking_sessions_user_updated;
DROP INDEX IF EXISTS idx_lesson_attempts_user_completed;
DROP INDEX IF EXISTS idx_learner_mistakes_user_status;
DROP INDEX IF EXISTS idx_learner_mistakes_user_last_seen;
