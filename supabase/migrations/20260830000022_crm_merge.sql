-- ============================================================
-- P2-A — CRM de-duplication (no AI)
-- ============================================================
-- Detection is done in the API (normalised string / email / domain
-- matching). This migration provides:
--   * crm_duplicate_dismissals — "these two are not the same", so a pair
--     stops surfacing
--   * crm_merge_contacts()  / crm_merge_companies()  — atomic merge that
--     repoints every reference from the loser to the winner, fills blank
--     winner fields from the loser, then deletes the loser.
--
-- The merge functions are executable by service_role only and are called
-- from an API route that has already enforced the admin gate (same trust
-- model as every other crm_* write).
-- ============================================================

CREATE TABLE IF NOT EXISTS crm_duplicate_dismissals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_type  TEXT NOT NULL CHECK (object_type IN ('contact','company')),
  id_low       UUID NOT NULL,
  id_high      UUID NOT NULL,
  dismissed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id_low < id_high),
  UNIQUE (object_type, id_low, id_high)
);
ALTER TABLE crm_duplicate_dismissals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_dupe_dismissals_select ON crm_duplicate_dismissals;
CREATE POLICY crm_dupe_dismissals_select ON crm_duplicate_dismissals FOR SELECT
  USING (is_super_admin() OR is_admin());
DROP POLICY IF EXISTS crm_dupe_dismissals_write ON crm_duplicate_dismissals;
CREATE POLICY crm_dupe_dismissals_write ON crm_duplicate_dismissals FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());
REVOKE ALL ON crm_duplicate_dismissals FROM anon, authenticated;
GRANT SELECT ON crm_duplicate_dismissals TO authenticated;
GRANT ALL ON crm_duplicate_dismissals TO service_role;

-- ---- contacts merge ------------------------------------------------

CREATE OR REPLACE FUNCTION crm_merge_contacts(p_winner UUID, p_loser UUID)
RETURNS VOID AS $$
BEGIN
  IF p_winner = p_loser OR p_winner IS NULL OR p_loser IS NULL THEN
    RAISE EXCEPTION 'invalid merge pair';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_contacts WHERE id = p_winner)
     OR NOT EXISTS (SELECT 1 FROM crm_contacts WHERE id = p_loser) THEN
    RAISE EXCEPTION 'contact not found';
  END IF;

  -- fill blank scalar fields on the winner from the loser
  UPDATE crm_contacts w SET
    email        = COALESCE(w.email, l.email),
    phone        = COALESCE(w.phone, l.phone),
    title        = COALESCE(w.title, l.title),
    company_id   = COALESCE(w.company_id, l.company_id),
    source       = COALESCE(w.source, l.source),
    owner_id     = COALESCE(w.owner_id, l.owner_id),
    profile_id   = COALESCE(w.profile_id, l.profile_id),
    notes        = NULLIF(concat_ws(E'\n\n', NULLIF(w.notes,''), NULLIF(l.notes,'')), ''),
    tags         = (SELECT COALESCE(array_agg(DISTINCT t), '{}') FROM unnest(w.tags || l.tags) t),
    last_activity_at = GREATEST(w.last_activity_at, l.last_activity_at)
  FROM crm_contacts l
  WHERE w.id = p_winner AND l.id = p_loser;

  -- clear the loser's unique-constrained columns before anything else can clash
  UPDATE crm_contacts SET email = NULL, profile_id = NULL WHERE id = p_loser;

  -- polymorphic children
  UPDATE crm_notes     SET related_id = p_winner WHERE related_type = 'contact' AND related_id = p_loser;
  UPDATE crm_tasks     SET related_id = p_winner WHERE related_type = 'contact' AND related_id = p_loser;
  UPDATE crm_documents SET related_id = p_winner WHERE related_type = 'contact' AND related_id = p_loser;
  UPDATE audit_log     SET target_id = p_winner WHERE target_type = 'contact' AND target_id = p_loser;

  -- crm_links (unique on source_type, source_id, contact_id)
  UPDATE crm_links l SET contact_id = p_winner
   WHERE l.contact_id = p_loser
     AND NOT EXISTS (SELECT 1 FROM crm_links x
                      WHERE x.contact_id = p_winner AND x.source_type = l.source_type AND x.source_id = l.source_id);
  DELETE FROM crm_links WHERE contact_id = p_loser;

  -- deal_parties (unique on deal_id, contact_id, role)
  UPDATE deal_parties d SET contact_id = p_winner
   WHERE d.contact_id = p_loser
     AND NOT EXISTS (SELECT 1 FROM deal_parties x
                      WHERE x.contact_id = p_winner AND x.deal_id = d.deal_id AND x.role = d.role);
  DELETE FROM deal_parties WHERE contact_id = p_loser;

  DELETE FROM crm_contacts WHERE id = p_loser;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION crm_merge_contacts(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION crm_merge_contacts(UUID, UUID) TO service_role;

-- ---- companies merge --------------------------------------------

CREATE OR REPLACE FUNCTION crm_merge_companies(p_winner UUID, p_loser UUID)
RETURNS VOID AS $$
BEGIN
  IF p_winner = p_loser OR p_winner IS NULL OR p_loser IS NULL THEN
    RAISE EXCEPTION 'invalid merge pair';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_companies WHERE id = p_winner)
     OR NOT EXISTS (SELECT 1 FROM crm_companies WHERE id = p_loser) THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  UPDATE crm_companies w SET
    domain              = COALESCE(w.domain, l.domain),
    website             = COALESCE(w.website, l.website),
    sector_id           = COALESCE(w.sector_id, l.sector_id),
    country             = COALESCE(w.country, l.country),
    company_size        = COALESCE(w.company_size, l.company_size),
    owner_id            = COALESCE(w.owner_id, l.owner_id),
    description         = NULLIF(concat_ws(E'\n\n', NULLIF(w.description,''), NULLIF(l.description,'')), ''),
    registration_number = COALESCE(w.registration_number, l.registration_number),
    regulator           = COALESCE(w.regulator, l.regulator),
    jurisdiction        = COALESCE(w.jurisdiction, l.jurisdiction),
    is_directory_public = w.is_directory_public OR l.is_directory_public
  FROM crm_companies l
  WHERE w.id = p_winner AND l.id = p_loser;

  UPDATE crm_companies SET domain = NULL WHERE id = p_loser;

  -- straight FK repoints
  UPDATE crm_contacts           SET company_id         = p_winner WHERE company_id         = p_loser;
  UPDATE recruitment_job_orders SET company_id         = p_winner WHERE company_id         = p_loser;
  UPDATE deals                  SET company_id         = p_winner WHERE company_id         = p_loser;
  UPDATE construction_projects  SET client_company_id  = p_winner WHERE client_company_id  = p_loser;
  UPDATE commodity_trades       SET counterparty_id    = p_winner WHERE counterparty_id    = p_loser;

  -- polymorphic children
  UPDATE crm_notes     SET related_id = p_winner WHERE related_type = 'company' AND related_id = p_loser;
  UPDATE crm_tasks     SET related_id = p_winner WHERE related_type = 'company' AND related_id = p_loser;
  UPDATE crm_documents SET related_id = p_winner WHERE related_type = 'company' AND related_id = p_loser;
  UPDATE audit_log     SET target_id = p_winner WHERE target_type = 'company' AND target_id = p_loser;

  -- crm_links
  UPDATE crm_links l SET company_id = p_winner
   WHERE l.company_id = p_loser
     AND NOT EXISTS (SELECT 1 FROM crm_links x
                      WHERE x.company_id = p_winner AND x.source_type = l.source_type AND x.source_id = l.source_id);
  DELETE FROM crm_links WHERE company_id = p_loser;

  -- deal_parties (unique deal_id, company_id, role)
  UPDATE deal_parties d SET company_id = p_winner
   WHERE d.company_id = p_loser
     AND NOT EXISTS (SELECT 1 FROM deal_parties x
                      WHERE x.company_id = p_winner AND x.deal_id = d.deal_id AND x.role = d.role);
  DELETE FROM deal_parties WHERE company_id = p_loser;

  -- org relationships (avoid self-links and dup (from,to,kind))
  UPDATE crm_org_relationships r SET from_company = p_winner
   WHERE r.from_company = p_loser AND r.to_company <> p_winner
     AND NOT EXISTS (SELECT 1 FROM crm_org_relationships x
                      WHERE x.from_company = p_winner AND x.to_company = r.to_company AND x.kind = r.kind);
  UPDATE crm_org_relationships r SET to_company = p_winner
   WHERE r.to_company = p_loser AND r.from_company <> p_winner
     AND NOT EXISTS (SELECT 1 FROM crm_org_relationships x
                      WHERE x.to_company = p_winner AND x.from_company = r.from_company AND x.kind = r.kind);
  DELETE FROM crm_org_relationships WHERE from_company = p_loser OR to_company = p_loser;

  DELETE FROM crm_companies WHERE id = p_loser;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION crm_merge_companies(UUID, UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION crm_merge_companies(UUID, UUID) TO service_role;
