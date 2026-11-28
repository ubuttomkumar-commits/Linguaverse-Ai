-- LINGUAVERSE AI — Non-Destructive Rollback for Migration 0005 (Performance Indexes)
-- Preserves 100% of tables and data rows; drops only the additive 0005 indexes.

DROP INDEX IF EXISTS idx_users_created_desc;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_courses_custom_published;
DROP INDEX IF EXISTS idx_lessons_custom_published;
DROP INDEX IF EXISTS idx_audit_logs_action_created;
DROP INDEX IF EXISTS idx_cms_analytics_created;
DROP INDEX IF EXISTS idx_audio_assets_created;
