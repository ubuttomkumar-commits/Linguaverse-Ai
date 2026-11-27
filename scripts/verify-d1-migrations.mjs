#!/usr/bin/env node
/**
 * LINGUAVERSE AI — Automated D1 / SQLite Migration, Upgrade & Integrity Verifier
 *
 * Verifies:
 * 1. `migrations/` contains ONLY forward sequential SQL migrations (`0001`–`0004`)
 *    so `wrangler d1 migrations apply` never accidentally executes rollback or seed SQL.
 * 2. Fresh DB initialization across migrations `0001 -> 0004` + idempotent `db/seeds/seed_reference_data.sql` (run twice).
 * 3. `PRAGMA integrity_check === 'ok'` and `PRAGMA foreign_key_check === 0` violations.
 * 4. 100% table parity between sequential migrations (`0001..0004`) and canonical `schema.sql`.
 * 5. Existing schema upgrade path: populated `0001` DB (with live `users`, `sessions`, and `learner_mistakes`)
 *    upgraded sequentially through `0002 -> 0003 -> 0004` + seed preserves 100% of existing data.
 * 6. Non-destructive rollback path (`db/rollbacks/ROLLBACK_0004 -> 0003 -> 0002`) preserves existing user data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = process.cwd();
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');
const MIGRATIONS = [
  'migrations/0001_initial_schema.sql',
  'migrations/0002_parts06_12_parity.sql',
  'migrations/0003_p3_community_vocab_billing.sql',
  'migrations/0004_prd61_examinations_labs_providers.sql',
];
const ROLLBACKS = [
  'db/rollbacks/ROLLBACK_0004_prd61_examinations_labs_providers.sql',
  'db/rollbacks/ROLLBACK_0003_p3_community_vocab_billing.sql',
  'db/rollbacks/ROLLBACK_0002_parts06_12_parity.sql',
];
const SEED_FILE = 'db/seeds/seed_reference_data.sql';
const CANONICAL_SCHEMA = 'schema.sql';

function listTables(db) {
  return db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    .all()
    .map((row) => row.name);
}

function assertOk(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

// 0. Guard migrations/ directory purity (prevents Wrangler from ever running rollbacks/seeds during migrate)
const actualMigrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => `migrations/${f}`);

assertOk(
  JSON.stringify(actualMigrationFiles) === JSON.stringify(MIGRATIONS),
  `migrations/ directory must contain ONLY forward migrations (${MIGRATIONS.join(', ')}), found: ${actualMigrationFiles.join(', ')}`
);

const seedSql = fs.readFileSync(path.join(ROOT, SEED_FILE), 'utf8');

// 1. Fresh DB via sequential migrations 0001 -> 0004 + reference seed (executed twice for idempotency)
const freshDb = new DatabaseSync(':memory:');
freshDb.exec('PRAGMA foreign_keys = ON;');
for (const file of MIGRATIONS) {
  freshDb.exec(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
freshDb.exec(seedSql);
freshDb.exec(seedSql);

const freshIntegrity = freshDb.prepare('PRAGMA integrity_check;').all();
assertOk(freshIntegrity.length === 1 && freshIntegrity[0].integrity_check === 'ok', 'Fresh DB PRAGMA integrity_check failed');
const freshFk = freshDb.prepare('PRAGMA foreign_key_check;').all();
assertOk(freshFk.length === 0, `Fresh DB PRAGMA foreign_key_check found ${freshFk.length} violations`);

const promptCount = freshDb.prepare('SELECT COUNT(*) AS cnt FROM prompt_versions').get().cnt;
const settingsCount = freshDb.prepare('SELECT COUNT(*) AS cnt FROM system_settings').get().cnt;
assertOk(promptCount >= 3 && settingsCount >= 4, 'Reference seed did not populate baseline prompt_versions/system_settings');

const migratedTables = listTables(freshDb);

// 2. Canonical schema.sql table parity
const canonicalDb = new DatabaseSync(':memory:');
canonicalDb.exec('PRAGMA foreign_keys = ON;');
canonicalDb.exec(fs.readFileSync(path.join(ROOT, CANONICAL_SCHEMA), 'utf8'));
const canonicalTables = listTables(canonicalDb);

assertOk(
  JSON.stringify(migratedTables) === JSON.stringify(canonicalTables),
  `Table mismatch between migrations 0001-0004 (${migratedTables.length}) and schema.sql (${canonicalTables.length})`
);

// 3. Existing schema upgrade path (0001 with populated user/session/mistake data -> 0002 -> 0003 -> 0004 + seed)
const upgradeDb = new DatabaseSync(':memory:');
upgradeDb.exec('PRAGMA foreign_keys = ON;');
upgradeDb.exec(fs.readFileSync(path.join(ROOT, MIGRATIONS[0]), 'utf8'));
upgradeDb
  .prepare(
    `INSERT INTO users (id, name, email, password_salt, password_hash, email_verified, account_status, plan, role, created_at, updated_at)
     VALUES ('usr_upgrade_1', 'Existing Learner', 'existing@example.com', 'salt', 'hash', 1, 'active', 'free', 'learner', '2026-11-26T00:00:00Z', '2026-11-26T00:00:00Z')`
  )
  .run();
upgradeDb
  .prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES ('ses_upgrade_1', 'usr_upgrade_1', 'tokhash_1', '2026-12-31T00:00:00Z', '2026-11-26T00:00:00Z')`
  )
  .run();
upgradeDb
  .prepare(
    `INSERT INTO learner_mistakes (id, user_id, source, domain, category, user_example, corrected_example, pattern_en, pattern_bn, explanation_en, explanation_bn, occurrences, severity, status, created_at, last_seen_at)
     VALUES ('mst_upgrade_1', 'usr_upgrade_1', 'speaking_studio', 'grammar', 'verb_tense', 'I go yesterday', 'I went yesterday', 'Past simple tense', 'অতীত কাল', 'Past tense required', 'অতীত কাল প্রয়োজন', 1, 'medium', 'active', '2026-11-26T00:00:00Z', '2026-11-26T00:00:00Z')`
  )
  .run();

for (const file of MIGRATIONS.slice(1)) {
  upgradeDb.exec(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}
upgradeDb.exec(seedSql);

const upgradeTables = listTables(upgradeDb);
assertOk(JSON.stringify(upgradeTables) === JSON.stringify(canonicalTables), 'Upgraded DB table set diverges from canonical schema');
const upgradedUser = upgradeDb.prepare(`SELECT id, email FROM users WHERE id = 'usr_upgrade_1'`).get();
const upgradedSession = upgradeDb.prepare(`SELECT id FROM sessions WHERE id = 'ses_upgrade_1'`).get();
const upgradedMistake = upgradeDb.prepare(`SELECT id FROM learner_mistakes WHERE id = 'mst_upgrade_1'`).get();
assertOk(Boolean(upgradedUser && upgradedSession && upgradedMistake), 'Existing 0001 user/session/mistake data was not preserved during upgrade');
assertOk(upgradeDb.prepare('PRAGMA foreign_key_check;').all().length === 0, 'Foreign key violations after existing schema upgrade');

// 4. Non-destructive rollback path (ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002)
for (const rb of ROLLBACKS) {
  upgradeDb.exec(fs.readFileSync(path.join(ROOT, rb), 'utf8'));
}
const preservedUser = upgradeDb.prepare(`SELECT id, email FROM users WHERE id = 'usr_upgrade_1'`).get();
const preservedMistake = upgradeDb.prepare(`SELECT id FROM learner_mistakes WHERE id = 'mst_upgrade_1'`).get();
assertOk(
  Boolean(preservedUser && preservedUser.email === 'existing@example.com' && preservedMistake),
  'Rollback did not preserve existing user and mistake rows'
);
assertOk(upgradeDb.prepare('PRAGMA foreign_key_check;').all().length === 0, 'Foreign key violations detected after rollback');

freshDb.close();
canonicalDb.close();
upgradeDb.close();

console.log(
  JSON.stringify(
    {
      ok: true,
      forwardMigrationsOnly: true,
      migrationsApplied: MIGRATIONS.length,
      tablesVerified: migratedTables.length,
      schemaParity: '100%',
      integrityCheck: 'ok',
      foreignKeyViolations: 0,
      seedIdempotent: true,
      existingSchemaUpgradePreservedData: true,
      rollbackPreservedUsers: true,
    },
    null,
    2
  )
);
