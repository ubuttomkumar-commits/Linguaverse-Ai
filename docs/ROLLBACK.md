# LINGUAVERSE AI — Rollback & Disaster Recovery Runbook

Use this runbook to safely revert a Cloudflare Worker deployment, Cloudflare Pages release, or Cloudflare D1 schema migration without losing existing learner accounts.

---

## 1. Rollback Cloudflare Worker API (`linguaverse-ai-api-prod`)

```powershell
# 1. List recent Worker deployments
npx wrangler deployments list --env production

# 2. Roll back immediately to the previous deployment
npx wrangler rollback --env production

# 3. Verify health and security headers
node scripts/smoke-test-deployment.mjs --api-url https://<your-api-domain>
```

---

## 2. Rollback Cloudflare Pages (Learner PWA & Separate Admin App)

In Cloudflare Dashboard -> **Workers & Pages** -> select **`linguaverse-ai`** or **`linguaverse-admin`** -> **Deployments** -> select last verified deployment -> **`...` -> Rollback to this deployment**.

Or redeploy a known-good Git commit:
```powershell
git checkout <last-good-commit-sha>
$env:VITE_API_BASE_URL = "https://<your-api-domain>"
npm run build:all
npx wrangler pages deploy dist --project-name linguaverse-ai
npx wrangler pages deploy dist-admin --project-name linguaverse-admin
```

---

## 3. Non-Destructive D1 Schema Rollback

All rollback SQL scripts are isolated in `db/rollbacks/` (outside `migrations/`) and drop **only** the additive tables created by their paired migration while preserving `users`, `sessions`, and core learning data (verified by `npm run verify:db`).

> **Mandatory Pre-Rollback Backup:**
> ```powershell
> $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
> New-Item -ItemType Directory -Force -Path .\backups | Out-Null
> npx wrangler d1 export linguaverse-db --remote --env production --output=".\backups\pre-rollback-$stamp.sql"
> ```

### Revert Migration `0004` (Examinations, Labs, Notifications, AI Provider Config)
```powershell
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0004_prd61_examinations_labs_providers.sql
```

### Revert Migration `0003` (Vocabulary SRS, Community, Billing, Gamification)
```powershell
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0003_p3_community_vocab_billing.sql
```

### Revert Migration `0002` (Parts 06–12 Cloud State & Replay Practice)
```powershell
npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0002_parts06_12_parity.sql
```

### Post-Rollback Integrity Check
```powershell
npx wrangler d1 execute linguaverse-db --remote --env production --command "PRAGMA integrity_check; PRAGMA foreign_key_check;"
```

---

## 4. Full Point-in-Time Restore (Cloudflare D1 Time Travel / Snapshot)

1. Enable **Maintenance Mode** in the Separate Admin App (`System & Flags`) so no writes land during restore.
2. Restore using Cloudflare D1 Time Travel:
   ```powershell
   npx wrangler d1 time-travel info linguaverse-db --env production --timestamp="2026-11-27T00:00:00Z"
   npx wrangler d1 time-travel restore linguaverse-db --env production --bookmark="<bookmark-id>"
   ```
3. Or import a saved `.\backups\linguaverse-db-<timestamp>.sql` dump into a fresh recovery D1 database, verify `PRAGMA integrity_check`, and switch `database_id` under `[[env.production.d1_databases]]` in `wrangler.toml`.
4. Run `node scripts/smoke-test-deployment.mjs` before disabling Maintenance Mode.
