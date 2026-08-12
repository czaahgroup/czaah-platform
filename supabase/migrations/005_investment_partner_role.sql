-- Add investment_partner to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'investment_partner';

-- Add submitted_by and approval fields to investment_opportunities
ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id);
ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));
ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS approval_notes TEXT;
ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id);
ALTER TABLE investment_opportunities ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- RLS policy: investment partners can see their own submissions
CREATE POLICY investments_select_partner ON investment_opportunities FOR SELECT
  USING (submitted_by = auth.uid());

-- RLS policy: investment partners can insert their own deals
CREATE POLICY investments_insert_partner ON investment_opportunities FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- RLS policy: investment partners can update their own pending deals
CREATE POLICY investments_update_partner ON investment_opportunities FOR UPDATE
  USING (submitted_by = auth.uid() AND approval_status = 'pending_approval');

-- Investment partners can manage documents on their own deals
CREATE POLICY inv_docs_select_partner ON investment_documents FOR SELECT
  USING (
    opportunity_id IN (
      SELECT id FROM investment_opportunities WHERE submitted_by = auth.uid()
    )
  );

CREATE POLICY inv_docs_insert_partner ON investment_documents FOR INSERT
  WITH CHECK (
    opportunity_id IN (
      SELECT id FROM investment_opportunities WHERE submitted_by = auth.uid()
    )
  );
