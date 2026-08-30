-- ============================================================
-- Index sweep for the Phase 2/3 tables
-- ============================================================
-- Covers the FK columns that are (a) used by scopeQuery / RLS SELECT
-- policies for non-admin callers (`created_by`), (b) filtered in list
-- endpoints, or (c) the target of an ON DELETE SET NULL that would
-- otherwise seq-scan the child table when a parent row is removed.
-- Small tables today, but the same proactive stance as 20260830000005.

-- scopeQuery / list filters
CREATE INDEX IF NOT EXISTS idx_rec_orders_created_by   ON recruitment_job_orders (created_by);
CREATE INDEX IF NOT EXISTS idx_rec_orders_company      ON recruitment_job_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_deals_created_by        ON deals (created_by);
CREATE INDEX IF NOT EXISTS idx_construction_created_by ON construction_projects (created_by);
CREATE INDEX IF NOT EXISTS idx_trades_created_by       ON commodity_trades (created_by);

-- ON DELETE SET NULL targets (deal -> its projects / trades)
CREATE INDEX IF NOT EXISTS idx_construction_deal ON construction_projects (deal_id);
CREATE INDEX IF NOT EXISTS idx_trades_deal       ON commodity_trades (deal_id);

-- RLS SELECT policies for non-admins filter these child tables on created_by
CREATE INDEX IF NOT EXISTS idx_rec_placements_created_by  ON recruitment_placements (created_by);
CREATE INDEX IF NOT EXISTS idx_deal_parties_created_by    ON deal_parties (created_by);
CREATE INDEX IF NOT EXISTS idx_construction_upd_created_by ON construction_updates (created_by);
CREATE INDEX IF NOT EXISTS idx_crm_org_rel_created_by     ON crm_org_relationships (created_by);
