# Supabase — schema & edge functions

Project ref: `rwmiegcwxkffkxuokesc`

## Auto-deploy

`.github/workflows/supabase.yml` runs on every push to `master` that changes
anything under `supabase/`:

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

## One-time setup (DONE 2026-08-30)

1. GitHub repo secrets `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` — added.
2. Remote migration history baselined via
   `supabase migration repair --status applied 20260828000001 … 20260828000024`
   (the 24 files were originally run by hand in the SQL editor, so the remote
   had no migration history). Only *new* files run from now on.

## Edge function runtime secrets

`mail-inbound` needs these set on the project (Dashboard → Edge Functions →
Secrets, or `npx supabase secrets set`): `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
Deploying does not change them.

<!-- ci: retrigger -->
