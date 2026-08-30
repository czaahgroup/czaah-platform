# Database backups — P1A

## Current state — 2026-08-30

**There is no backup of the production database.**

Checked via the Supabase management API for project `rwmiegcwxkffkxuokesc`
(eu-north-1, the live one):

- `pitr_enabled: false` — no point-in-time recovery
- `backups: []` — no daily snapshots
- `walg_enabled: true` — WAL archiving infra is on, but nothing is retained
  without a paid plan

This is consistent with the **Supabase Free plan**, which includes no managed
backups. If the database is lost or corrupted, there is nothing to restore from.

There is also a second, **inactive** Supabase project (`uzkpritwklqdxxhmcarp`,
eu-west-2) from an earlier setup — not used, can be deleted.

## What to do

### 1. Managed safety net — upgrade Supabase to Pro (recommended, ~$25/mo)

Pro gives automatic **daily backups with 7-day retention** and makes
**point-in-time recovery** available as an add-on. This is the baseline for
running a business on this database.

Dashboard &rarr; project &rarr; Settings &rarr; Billing &rarr; upgrade to Pro,
then Settings &rarr; Database &rarr; enable PITR if the extra retention is
worth it.

### 2. Independent export — weekly `pg_dump` off-platform

So a backup exists that does not depend on Supabase's retention or account
access. `.github/workflows/backup.yml.disabled` is ready — it runs `pg_dump`
weekly, gzips, and uploads to object storage.

**To enable it:**

1. Enable **R2** in the Cloudflare dashboard (has a free tier: 10 GB), create a
   bucket `czaah-db-backups`, and create an R2 API token (S3 credentials).
2. Add GitHub repo secrets:
   - `BACKUP_DB_URL` — the Supabase connection string
     (Dashboard &rarr; Settings &rarr; Database &rarr; Connection string &rarr;
     URI, session mode)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
3. Rename `.github/workflows/backup.yml.disabled` &rarr; `.yml`.
4. Trigger it once manually (Actions &rarr; Backup database &rarr; Run workflow)
   and confirm the object lands in the bucket.

Retention: the workflow keeps the last 12 weekly dumps and deletes older ones.

### Restore drill

Once backups exist, do a restore drill onto a scratch database at least once so
the process is known and the dump is proven good. Note the steps here when done.
