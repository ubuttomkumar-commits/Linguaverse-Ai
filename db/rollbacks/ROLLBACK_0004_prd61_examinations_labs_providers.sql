-- ============================================================================
-- LINGUAVERSE AI — Non-Destructive Rollback for Migration 0004
-- Drops ONLY the 5 additive tables added in 0004_prd61_examinations_labs_providers.sql.
-- Preserves all tables and user data from migrations 0001, 0002, and 0003.
-- ============================================================================

DROP INDEX IF EXISTS idx_user_notifications_user_created;
DROP TABLE IF EXISTS user_notifications;

DROP TABLE IF EXISTS user_notification_preferences;

DROP INDEX IF EXISTS idx_human_bridge_user_created;
DROP TABLE IF EXISTS human_bridge_logs;

DROP INDEX IF EXISTS idx_writing_diary_user_created;
DROP TABLE IF EXISTS writing_diary_entries;

DROP INDEX IF EXISTS idx_examination_attempts_user_created;
DROP TABLE IF EXISTS examination_attempts;
