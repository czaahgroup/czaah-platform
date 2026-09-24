# Database backups — P1A

## Current state — 2026-09-24

Project `rwmiegcwxkffkxuokesc` (eu-north-1, the live one) is on **Supabase Pro**.

- **Daily physical backups are running** — `npx supabase backups list
  --project-ref rwmiegcwxkffkxuokesc` shows one COMPLETED backup per day
  (~01:25 UTC), 7-day retention.
- `pitr_enabled: false` — point-in-time recovery is an optional paid add-on
  (Dashboard &rarr; Settings &rarr; Database). Without it, the worst case is
  losing up to ~24 h of changes.
- **No off-platform copy yet** — every backup lives inside the same Supabase
  account. See step 2.

(2026-08-30 this project was on Free with no backups at all; it has since been
upgraded.)

There is also a second, **inactive** Supabase project (`uzkpritwklqdxxhmcarp`,
eu-west-2) from an earlier setup — not used, can be deleted.

## What to do

### 1. Managed safety net — DONE (Supabase Pro)

Restore from Dashboard &rarr; project &rarr; Database &rarr; Backups. Consider
the PITR add-on if losing a day of data would be costly.

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
