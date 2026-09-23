-- A signed-in user could insert their OWN profile row with any role and
-- status (e.g. super_admin / approved), because profiles_insert_own only
-- checked id = auth.uid(). Public sign-up is enabled, so anyone could create
-- a login and make themselves an admin. Every real profile is created
-- server-side with the service role (which bypasses RLS), so self-inserts
-- are now limited to the least-privileged, unapproved state.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'member' and status = 'pending_kyc_review');

-- anon never writes profiles; TRUNCATE is not covered by RLS at all.
revoke insert, update, delete, truncate on public.profiles from anon;
revoke truncate on public.profiles from authenticated;
