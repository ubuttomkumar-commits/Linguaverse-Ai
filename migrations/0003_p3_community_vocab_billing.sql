-- ============================================================================
-- LINGUAVERSE AI — Migration 0003: P3 Vocabulary, Community, Billing, Support & Retention
-- Strictly ADDITIVE migration (zero destructive drops or alterations of pre-existing tables).
-- Rollback script: migrations/ROLLBACK_0003_p3_community_vocab_billing.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. Spaced-Repetition Vocabulary Deck (PRD Section 8.5 & 18.5)
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

-- 2. Learner Community Posts, Comments, Reports, Blocks & Restrictions (PRD Section 14)
-- NOTE: Private direct messaging is intentionally omitted per PRD 14.2 MVP safety policy.
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

-- 3. Subscription Invoices & Learner Support Tickets (PRD Sections 16.6, 17.2)
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

-- 4. Opt-in Leaderboard & Non-Punitive Reminder Preferences (PRD Section 15)
CREATE TABLE IF NOT EXISTS learner_gamification_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  leaderboard_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (leaderboard_opt_in IN (0, 1)),
  display_alias TEXT NOT NULL DEFAULT '',
  reminder_enabled INTEGER NOT NULL DEFAULT 0 CHECK (reminder_enabled IN (0, 1)),
  reminder_time_local TEXT NOT NULL DEFAULT '20:00',
  updated_at TEXT NOT NULL
);
