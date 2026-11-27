# LINGUAVERSE AI — Rollback & Disaster Recovery Runbook (Wrangler v4 Verified)

Use this runbook to safely revert a Cloudflare Worker deployment, Cloudflare Pages release, or Cloudflare D1 database state. **Always treat Worker code rollback and D1 database recovery as separate operations** — rolling back Worker code never reverts database schema or data.

---

## 1. Rollback Cloudflare Worker API (Supported Wrangler v4 Versioned Rollback)

Do **not** run a blind `npx wrangler rollback --env production` without inspecting deployed versions first. Follow the verified Wrangler `4.168.0` workflow:

1. **Identify the deployed Worker and inspect available versions & active deployment:**
   ```bash
   npx wrangler deployments list --env production
   npx wrangler versions list --env production
   ```
2. **Select a verified stable `<version-id>` from the list and execute the explicit versioned rollback:**
   ```bash
   npx wrangler rollback <version-id> --env production --message "Rollback to verified stable version"
   ```
   *(For staging, substitute `--env staging`.)*
3. **Verify the active deployment and live API health:**
   ```bash
   npx wrangler deployments status --env production
   node scripts/smoke-test-deployment.mjs --api-url https://<your-api-domain>
   ```

---

## 2. Rollback Cloudflare Pages (Learner PWA & Separate Admin App)

In the Cloudflare Dashboard -> **Workers & Pages** -> select **`linguaverse-ai`** (Learner PWA) or **`linguaverse-admin`** (Separate Admin App) -> **Deployments** -> locate the last verified green deployment -> click **`...` -> Rollback to this deployment**.

---

## 3. Separate D1 Database Recovery (Backup & D1 Time Travel)

> **Critical Rule:** Never execute destructive SQL or schema rollbacks without first verifying the target database (`linguaverse-db-staging` vs `linguaverse-db`) and capturing a verified backup.

### 3.1 Capture a Verified Pre-Recovery Snapshot
```bash
npx wrangler d1 export linguaverse-db --remote --env production --output=./backups/pre-recovery-snapshot.sql
```

### 3.2 Preferred Production Recovery: Cloudflare D1 Time Travel
1. Enable **Maintenance Mode** via Separate Admin App (`System & Flags`) to pause learner writes.
2. Inspect the exact bookmark prior to the incident:
   ```bash
   npx wrangler d1 time-travel info linguaverse-db --env production --timestamp="2026-11-27T00:00:00Z"
   ```
3. Restore strictly to the verified bookmark:
   ```bash
   npx wrangler d1 time-travel restore linguaverse-db --env production --bookmark="<verified-bookmark-id>"
   ```
4. Verify database integrity before disabling Maintenance Mode:
   ```bash
   npx wrangler d1 execute linguaverse-db --remote --env production --command "PRAGMA integrity_check; PRAGMA foreign_key_check;"
   ```

### 3.3 Emergency Additive Schema Rollback (Isolated in `db/rollbacks/`)
Only if an additive migration must be reverted independently (after exporting a backup above):
- Revert Migration `0004`: `npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0004_prd61_examinations_labs_providers.sql`
- Revert Migration `0003`: `npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0003_p3_community_vocab_billing.sql`
- Revert Migration `0002`: `npx wrangler d1 execute linguaverse-db --remote --env production --file=./db/rollbacks/ROLLBACK_0002_parts06_12_parity.sql`

*(Rollbacks live strictly under `db/rollbacks/` outside `migrations/` so `wrangler d1 migrations apply` never executes rollback SQL.)*
