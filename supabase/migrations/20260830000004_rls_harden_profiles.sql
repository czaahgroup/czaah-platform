-- ============================================================
-- SECURITY: stop self-service privilege escalation on profiles
-- ============================================================
-- The profiles UPDATE policy is WITH CHECK (id = auth.uid()) — it scopes the
-- ROW but not the COLUMNS. A signed-in user could run, from the browser,
--   supabase.from('profiles').update({ role: 'super_admin', status: 'approved' })
-- and elevate themselves. RLS cannot restrict columns, so we use column-level
-- privileges instead: the authenticated role may only write the self-service
-- profile fields. role / status / email / id / timestamps become writable
-- only by service_role — i.e. server routes using the service key.
--
-- Found in the P1A RLS audit. See docs/rls-matrix.md.

REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  full_name,
  phone,
  company_name,
  company_registration_number,
  country,
  industry_interests,
  company_website,
  company_description,
  avatar_url
) ON public.profiles TO authenticated;

-- The existing profiles_update_own / profiles_update_super_admin RLS policies
-- still apply on top of this — column privileges are checked first, then RLS.
