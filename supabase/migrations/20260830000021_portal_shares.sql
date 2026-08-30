-- ============================================================
-- P3-F — client portal shares
-- ============================================================
-- Grants a specific platform user (member) read access to a specific
-- deal, construction project or commodity trade, so they can follow
-- their own transactions in /dashboard/portfolio. Everything the portal
-- exposes is gated on a row here; there is no blanket visibility.
--
-- RLS: a user sees only their own shares; admins manage all. Writes are
-- service-role only (admin API routes).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE portal_resource AS ENUM ('deal','construction_project','commodity_trade');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS portal_shares (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type      portal_resource NOT NULL,
  resource_id        UUID NOT NULL,
  can_view_documents BOOLEAN NOT NULL DEFAULT TRUE,
  title_override     TEXT,
  shared_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, resource_type, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_portal_shares_profile  ON portal_shares (profile_id);
CREATE INDEX IF NOT EXISTS idx_portal_shares_resource ON portal_shares (resource_type, resource_id);

ALTER TABLE portal_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_shares_select ON portal_shares;
CREATE POLICY portal_shares_select ON portal_shares FOR SELECT
  USING (profile_id = auth.uid() OR is_super_admin() OR is_admin());
DROP POLICY IF EXISTS portal_shares_write ON portal_shares;
CREATE POLICY portal_shares_write ON portal_shares FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON portal_shares FROM anon, authenticated;
GRANT SELECT ON portal_shares TO authenticated;
GRANT ALL ON portal_shares TO service_role;
