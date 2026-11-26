-- ============================================================================
-- LINGUAVERSE AI — Non-Destructive Rollback for Migration 0003
-- Drops ONLY the 9 additive P3 tables/indexes introduced in 0003.
-- Preserves all pre-existing tables from 0001 and 0002 completely untouched.
-- ============================================================================

DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_subscription_invoices_user;
DROP INDEX IF EXISTS idx_community_blocks_blocker;
DROP INDEX IF EXISTS idx_community_reports_status;
DROP INDEX IF EXISTS idx_community_comments_post;
DROP INDEX IF EXISTS idx_community_posts_status_created;
DROP INDEX IF EXISTS idx_vocabulary_user_due;

DROP TABLE IF EXISTS learner_gamification_prefs;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS subscription_invoices;
DROP TABLE IF EXISTS community_user_restrictions;
DROP TABLE IF EXISTS community_user_blocks;
DROP TABLE IF EXISTS community_reports;
DROP TABLE IF EXISTS community_comments;
DROP TABLE IF EXISTS community_posts;
DROP TABLE IF EXISTS vocabulary_items;
