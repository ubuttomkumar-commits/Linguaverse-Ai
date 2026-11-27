-- ============================================================================
-- LINGUAVERSE AI — Production-Safe Idempotent Reference Baseline Seed
-- ============================================================================
-- Purpose: Populates non-secret baseline configuration rows ONLY (prompt
--          versions and default system_settings).
-- Policy:  NEVER inserts fake users, fake learners, fake payments, fake
--          subscriptions, fake achievements, or synthetic analytics.
-- Safe to run repeatedly on empty or existing D1 databases (INSERT OR IGNORE).
-- ============================================================================

INSERT OR IGNORE INTO prompt_versions (
  id, domain, version_tag, model_target, is_active, notes, created_at
) VALUES
  ('pv_speaking_v50', 'speaking_evaluate', 'speaking-eval-v5.0', 'gemini-4-hydrogen', 1, 'Bilingual EN/BN speaking coach with confidence-gated mistake memory', '2026-11-26T00:00:00Z'),
  ('pv_transfer_v51', 'transfer_evaluate', 'transfer-rubric-v5.1', 'gemini-4-hydrogen', 1, '8-dimension evidence-based Transfer Lab evaluation rubric', '2026-11-26T00:00:00Z'),
  ('pv_landing_v50', 'landing_analyze', 'landing-sandbox-v5.0', 'gemini-4-hydrogen', 1, 'Public landing sentence diagnostic sandbox with XML input isolation', '2026-11-26T00:00:00Z');

INSERT OR IGNORE INTO system_settings (
  setting_key, setting_value, updated_by, updated_at
) VALUES
  ('default_ui_language', '"en"', 'system_seed', '2026-11-26T00:00:00Z'),
  ('community_direct_messaging_enabled', 'false', 'system_seed', '2026-11-26T00:00:00Z'),
  ('maintenance_mode_enabled', 'false', 'system_seed', '2026-11-26T00:00:00Z'),
  ('public_registration_enabled', 'true', 'system_seed', '2026-11-26T00:00:00Z');
