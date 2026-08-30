-- ============================================================
-- P1A index audit
-- ============================================================
-- Result: the schema is already well indexed. Every foreign key that is
-- joined or used inside an RLS policy already has an index, and the hot
-- single-column filters (enquiries.status, notifications(user_id,is_read),
-- partner_opportunities.partner_id/status, mailbox_threads active-partial)
-- are covered.
--
-- The only real gaps are a handful of audit-trail FK columns
-- (created_by / reviewed_by / assigned_by / sender_id) that are never
-- filtered on — not worth indexing — and these few composites that will
-- back the CRM list/board views added in later phases.
-- ============================================================

-- admin enquiry queue: "open enquiries, newest first" and status tabs
CREATE INDEX IF NOT EXISTS idx_enquiries_status_created
  ON enquiries(status, created_at DESC);

-- an admin's own queue, filtered by status
CREATE INDEX IF NOT EXISTS idx_enquiries_assigned_status
  ON enquiries(assigned_admin_id, status)
  WHERE assigned_admin_id IS NOT NULL;

-- partner opportunity pipeline board: a partner's deals grouped by stage
CREATE INDEX IF NOT EXISTS idx_partner_opportunities_partner_status
  ON partner_opportunities(partner_id, status);

-- enquiry filtering by product / service in the admin views (only FK gaps
-- with a plausible query behind them)
CREATE INDEX IF NOT EXISTS idx_enquiries_product ON enquiries(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enquiries_service ON enquiries(service_id) WHERE service_id IS NOT NULL;
