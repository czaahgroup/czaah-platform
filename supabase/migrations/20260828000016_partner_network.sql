-- ============================================
-- CZAAH PARTNER NETWORK
-- ============================================

-- Enums
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';
CREATE TYPE partner_opportunity_type AS ENUM (
  'buyer_required', 'seller_supplier_available', 'investor_required',
  'investment_available', 'project_available', 'joint_venture',
  'property_opportunity', 'recruitment_requirement', 'other'
);
CREATE TYPE partner_opportunity_status AS ENUM (
  'draft', 'submitted', 'more_info_required', 'approved',
  'in_progress', 'completed', 'rejected', 'archived'
);
CREATE TYPE confidentiality_level AS ENUM ('standard', 'confidential', 'highly_confidential');

-- Sequences (for human-readable Partner ID / opportunity reference numbers)
CREATE SEQUENCE partner_id_seq;
CREATE SEQUENCE partner_opportunity_ref_seq;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL UNIQUE DEFAULT 'CZP-' || LPAD(NEXTVAL('partner_id_seq')::TEXT, 5, '0'),
  referral_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_sector_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, sector_id)
);

CREATE TABLE partner_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL UNIQUE DEFAULT 'OPP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('partner_opportunity_ref_seq')::TEXT, 4, '0'),
  title TEXT NOT NULL,
  sector_id UUID REFERENCES sectors(id),
  country TEXT,
  opportunity_type partner_opportunity_type NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  estimated_value TEXT,
  contact_or_company TEXT,
  partner_role TEXT,
  confidentiality_level confidentiality_level NOT NULL DEFAULT 'standard',
  status partner_opportunity_status NOT NULL DEFAULT 'draft',
  visibility_scope TEXT NOT NULL DEFAULT 'private' CHECK (visibility_scope IN ('private', 'selective', 'published')),
  admin_notes TEXT,
  commission_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_opportunity_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID NOT NULL REFERENCES partner_opportunities(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL UNIQUE REFERENCES partners(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

CREATE TABLE partner_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES partner_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  related_opportunity_id UUID REFERENCES partner_opportunities(id),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  referred_profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  connected_via TEXT NOT NULL CHECK (connected_via IN ('partner_id', 'referral_code')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_partners_profile ON partners(profile_id);
CREATE INDEX idx_partner_sector_access_partner ON partner_sector_access(partner_id);
CREATE INDEX idx_partner_opportunities_partner ON partner_opportunities(partner_id);
CREATE INDEX idx_partner_opportunities_status ON partner_opportunities(status);
CREATE INDEX idx_partner_opp_documents_opportunity ON partner_opportunity_documents(opportunity_id);
CREATE INDEX idx_partner_messages_chat ON partner_messages(chat_id);
CREATE INDEX idx_partner_referrals_partner ON partner_referrals(partner_id);

-- ============================================
-- HELPER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION is_partner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'partner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_sector_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_opportunity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;

-- partners: a partner can read their own record; super_admin sees/manages all
CREATE POLICY partners_select_own ON partners FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY partners_select_admin ON partners FOR SELECT USING (is_super_admin());
CREATE POLICY partners_all_admin ON partners FOR ALL USING (is_super_admin());

-- partner_sector_access: partner reads own assignments; super_admin manages all
CREATE POLICY psa_select_own ON partner_sector_access FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
);
CREATE POLICY psa_all_admin ON partner_sector_access FOR ALL USING (is_super_admin());

-- partner_opportunities: partner sees/creates/edits own (edit only while draft/more_info_required); super_admin all
CREATE POLICY po_select_own ON partner_opportunities FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
);
CREATE POLICY po_select_admin ON partner_opportunities FOR SELECT USING (is_super_admin());
CREATE POLICY po_insert_own ON partner_opportunities FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
);
CREATE POLICY po_update_own ON partner_opportunities FOR UPDATE USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid())
  AND status IN ('draft', 'more_info_required')
);
CREATE POLICY po_all_admin ON partner_opportunities FOR ALL USING (is_super_admin());

-- partner_opportunity_documents: visible to the owning partner + super_admin
CREATE POLICY pod_select ON partner_opportunity_documents FOR SELECT USING (
  opportunity_id IN (SELECT id FROM partner_opportunities WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY pod_insert_own ON partner_opportunity_documents FOR INSERT WITH CHECK (
  opportunity_id IN (SELECT id FROM partner_opportunities WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
);
CREATE POLICY pod_all_admin ON partner_opportunity_documents FOR ALL USING (is_super_admin());

-- partner_chats: visible to the owning partner + super_admin
CREATE POLICY pc_select ON partner_chats FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()) OR is_super_admin()
);
CREATE POLICY pc_all_admin ON partner_chats FOR ALL USING (is_super_admin());

-- partner_messages: visible to participants of that chat (the owning partner) + super_admin
CREATE POLICY pm_select ON partner_messages FOR SELECT USING (
  chat_id IN (SELECT id FROM partner_chats WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);
CREATE POLICY pm_insert ON partner_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND (
    chat_id IN (SELECT id FROM partner_chats WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
    OR is_super_admin()
  )
);
CREATE POLICY pm_update ON partner_messages FOR UPDATE USING (
  chat_id IN (SELECT id FROM partner_chats WHERE partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()))
  OR is_super_admin()
);

-- partner_referrals: super_admin only (no partner-facing policy at all — partners never see or touch this table directly)
CREATE POLICY pr_all_admin ON partner_referrals FOR ALL USING (is_super_admin());

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON partners TO authenticated;
GRANT ALL ON partners TO service_role;
GRANT ALL ON partner_sector_access TO authenticated;
GRANT ALL ON partner_sector_access TO service_role;
GRANT ALL ON partner_opportunities TO authenticated;
GRANT ALL ON partner_opportunities TO service_role;
GRANT ALL ON partner_opportunity_documents TO authenticated;
GRANT ALL ON partner_opportunity_documents TO service_role;
GRANT ALL ON partner_chats TO authenticated;
GRANT ALL ON partner_chats TO service_role;
GRANT ALL ON partner_messages TO authenticated;
GRANT ALL ON partner_messages TO service_role;
GRANT ALL ON partner_referrals TO authenticated;
GRANT ALL ON partner_referrals TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE partner_messages;
