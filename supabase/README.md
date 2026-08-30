# Supabase — schema & edge functions

Project ref: `rwmiegcwxkffkxuokesc`

## Auto-deploy (currently OFF)

The workflow is parked at `.github/workflows/supabase.yml.disabled` — GitHub
ignores files without a `.yml`/`.yaml` extension, so nothing runs automatically
yet. Schema + function changes are deployed by hand.

**To turn it on:** do the "One-time setup" below, then rename the file to
`.github/workflows/supabase.yml`. After that it runs on every push to `master`
that changes anything under `supabase/`:

- **`supabase db push`** — applies migration files in `migrations/` that the
  production database hasn't seen yet.
- **`supabase functions deploy mail-inbound`** — redeploys the Resend inbound
  webhook function.

## Migrations

Files are `YYYYMMDDHHMMSS_name.sql`, applied in filename order. To add a schema
change: create a new file with a later timestamp, test it, then
`git push`. **The workflow applies it straight to the live database — review
the SQL first.**

Local: `npx supabase migration new <name>`.

## One-time setup (already needs doing)

1. **GitHub → repo Settings → Secrets and variables → Actions**, add:
   - `SUPABASE_ACCESS_TOKEN` — https://supabase.com/dashboard/account/tokens
   - `SUPABASE_DB_PASSWORD` — the database password
     (Dashboard → Project Settings → Database → Connection string / reset)

2. **Baseline the remote** so the 24 existing migrations are recorded as
   already applied (they were run by hand in the SQL editor, so the remote
   migration history is empty). Run once locally:

   ```
   npx supabase link --project-ref rwmiegcwxkffkxuokesc
   npx supabase migration repair --status applied \
     20260828000001 20260828000002 20260828000003 20260828000004 \
     20260828000005 20260828000006 20260828000007 20260828000008 \
     20260828000009 20260828000010 20260828000011 20260828000012 \
     20260828000013 20260828000014 20260828000015 20260828000016 \
     20260828000017 20260828000018 20260828000019 20260828000020 \
     20260828000021 20260828000022 20260828000023 20260828000024
   ```

   After that, `npx supabase migration list` should show every migration as
   applied on both local and remote. Only *new* files will run from then on.

## Edge function runtime secrets

`mail-inbound` needs these set on the project (Dashboard → Edge Functions →
Secrets, or `npx supabase secrets set`): `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
Deploying does not change them.
