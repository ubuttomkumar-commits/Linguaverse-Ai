# LINGUAVERSE AI — Database Deployment & Migration Guide (Cloudflare D1)

> **Verified Package:** `npm run verify:db` confirms `migrations/` contains **only** the 4 forward sequential SQL migrations (`0001`–`0004`), rollbacks are cleanly isolated in `db/rollbacks/`, reference seed is cleanly isolated in `db/seeds/seed_reference_data.sql`, **63 tables** match canonical `schema.sql` (`100%` parity), `PRAGMA integrity_check = ok`, `0` foreign key violations, idempotent seeding, non-destructive existing-schema upgrades (`0001 -> 0004`), and non-destructive rollbacks (`ROLLBACK_0004 -> 0002`).

---

## 1. SQL Deployment Package Layout

| Role | Directory / File | Executed By | Notes |
| --- | --- | --- | --- |
| **Forward Migrations (1)** | `migrations/0001_initial_schema.sql` | `wrangler d1 migrations apply` | Base schema (users, sessions, OTP/reset, courses, speaking, mistakes, DNA, transfer, XP, CMS, audit) |
| **Forward Migrations (2)** | `migrations/0002_parts06_12_parity.sql` | `wrangler d1 migrations apply` | Additive cloud state for Parts 06–12 & Replay practice |
| **Forward Migrations (3)** | `migrations/0003_p3_community_vocab_billing.sql` | `wrangler d1 migrations apply` | Additive Vocabulary SRS, Community/Moderation, Subscriptions/Webhooks, Leaderboard |
| **Forward Migrations (4)** | `migrations/0004_prd61_examinations_labs_providers.sql` | `wrangler d1 migrations apply` | Additive IELTS, Writing/Human Bridge, Notifications, AI Provider Config & Feature Flags |
| **Reference Seed** | `db/seeds/seed_reference_data.sql` | `wrangler d1 execute --file=...` | Strictly idempotent (`INSERT OR IGNORE`) `prompt_versions` + `system_settings`; zero fake users/payments |
| **Rollback (0004)** | `db/rollbacks/ROLLBACK_0004_prd61_examinations_labs_providers.sql` | Manual emergency only | Drops only `0004` tables; preserves `users` & prior data |
| **Rollback (0003)** | `db/rollbacks/ROLLBACK_0003_p3_community_vocab_billing.sql` | Manual emergency only | Drops only `0003` tables; preserves `users` & prior data |
| **Rollback (0002)** | `db/rollbacks/ROLLBACK_0002_parts06_12_parity.sql` | Manual emergency only | Drops only `0002` tables; preserves `users` & prior data |
| **Canonical Reference** | `schema.sql` | CI / `verify:db` parity check | Must always match `0001 + 0002 + 0003 + 0004` 100% |

> **Why rollbacks and seeds are outside `migrations/`:** Wrangler v4 (`wrangler d1 migrations apply`) runs every `.sql` file in `migrations_dir` alphabetically. Keeping `migrations/` strictly forward-only guarantees Wrangler never executes rollback SQL during a migration.

---

## 2. Automated Verification (`npm run verify:db`)

```powershell
npm run verify:db
```
Validates:
- `migrations/` directory purity (`forwardMigrationsOnly: true`)
- Fresh D1 init (`0001 -> 0004` + double idempotent `db/seeds/seed_reference_data.sql`)
- `PRAGMA integrity_check = ok` and `0` foreign key violations
- `100%` table parity (`63` tables) vs. `schema.sql`
- Existing schema upgrade (`0001` populated with live `users`, `sessions`, `learner_mistakes` -> `0002 -> 0003 -> 0004` + seed preserves 100% of existing rows)
- Non-destructive rollback (`ROLLBACK_0004 -> ROLLBACK_0003 -> ROLLBACK_0002` preserves existing user & mistake rows)

---

## 3. Fresh Production D1 Initialization (PowerShell)

```powershell
# 1. Create production D1 database and paste returned database_id into wrangler.toml ([env.production])
npx wrangler d1 create linguaverse-db

# 2. Confirm exactly 4 pending forward migrations
npx wrangler d1 migrations list linguaverse-db --remote --env production

# 3. Apply sequential migrations 0001 -> 0004
npx wrangler d1 migrations apply linguaverse-db --remote --env production

# 4. Apply idempotent non-secret reference seed
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/seeds/seed_reference_data.sql

# 5. Verify integrity, foreign keys, and 63 application tables
npx wrangler d1 execute linguaverse-db --remote --env production --command "PRAGMA integrity_check; PRAGMA foreign_key_check; SELECT COUNT(*) AS table_count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations';"
```

---

## 4. Upgrading an Existing Production D1 Database (Zero Data Loss)

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path .\backups | Out-Null

# 1. MANDATORY pre-migration full backup (./backups is gitignored)
npx wrangler d1 export linguaverse-db --remote --env production --output=".\backups\linguaverse-db-$stamp.sql"

# 2. Review pending migrations
npx wrangler d1 migrations list linguaverse-db --remote --env production

# 3. Apply only new additive migrations
npx wrangler d1 migrations apply linguaverse-db --remote --env production

# 4. Re-apply idempotent reference seed (INSERT OR IGNORE preserves existing customized values)
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/seeds/seed_reference_data.sql

# 5. Confirm zero integrity/FK issues
npx wrangler d1 execute linguaverse-db --remote --env production --command "PRAGMA integrity_check; PRAGMA foreign_key_check;"
```

---

## 5. Local Wrangler D1 Validation

```powershell
npx wrangler d1 migrations apply linguaverse-db --local --env production
npx wrangler d1 execute linguaverse-db --local --env production --file=./db/seeds/seed_reference_data.sql
npx wrangler dev
```
