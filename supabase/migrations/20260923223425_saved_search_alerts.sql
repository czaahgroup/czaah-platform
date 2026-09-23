-- Saved-search email alerts (additive). last_alerted_at: listings newer
-- than this are "new" for the next alert. alert_token: lets the unsubscribe
-- link in an email switch alerts off without signing in; never exposed to
-- other users (RLS: own rows only).
alter table public.saved_searches
  add column if not exists last_alerted_at timestamptz,
  add column if not exists alert_token uuid not null default gen_random_uuid();
create unique index if not exists saved_searches_alert_token on public.saved_searches(alert_token);
create index if not exists saved_searches_alerts_on on public.saved_searches(email_alerts) where email_alerts;
