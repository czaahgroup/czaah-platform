-- Phase 8: buyer accounts on CZAAH Properties. Additive only.
-- 'buyer' is a new role, approved on sign-up (no KYC). Profiles are still
-- only ever created server-side, so nobody can choose their own role.
alter type public.user_role add value if not exists 'buyer';

-- Saved properties: private to the buyer.
create table if not exists public.saved_properties (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.property_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.saved_properties enable row level security;
create policy saved_properties_own_select on public.saved_properties for select to authenticated using (user_id = auth.uid());
create policy saved_properties_own_insert on public.saved_properties for insert to authenticated with check (user_id = auth.uid());
create policy saved_properties_own_delete on public.saved_properties for delete to authenticated using (user_id = auth.uid());
revoke all on public.saved_properties from anon;

-- Saved searches: the search's URL query, so reopening it is exact.
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  path text not null check (char_length(path) <= 1000),
  email_alerts boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user on public.saved_searches(user_id);
alter table public.saved_searches enable row level security;
create policy saved_searches_own_select on public.saved_searches for select to authenticated using (user_id = auth.uid());
create policy saved_searches_own_insert on public.saved_searches for insert to authenticated with check (user_id = auth.uid());
create policy saved_searches_own_update on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_searches_own_delete on public.saved_searches for delete to authenticated using (user_id = auth.uid());
revoke all on public.saved_searches from anon;
