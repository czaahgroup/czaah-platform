CREATE TABLE IF NOT EXISTS oep_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  license_number TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  head_office_location TEXT NOT NULL,
  years_in_operation INT NOT NULL DEFAULT 0,
  sectors_specialization TEXT[] DEFAULT '{}',
  destination_countries TEXT[] DEFAULT '{}',
  monthly_placement_capacity INT,
  company_website TEXT,
  identity_document_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'contacted', 'verified', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oep_status ON oep_registry(status);
CREATE INDEX idx_oep_created ON oep_registry(created_at);

ALTER TABLE oep_registry ENABLE ROW LEVEL SECURITY;

-- Only admins/super_admin can read
CREATE POLICY oep_select ON oep_registry FOR SELECT
  USING (is_super_admin() OR is_admin());

-- Public can insert (registration is open)
CREATE POLICY oep_insert ON oep_registry FOR INSERT
  WITH CHECK (TRUE);

-- Only admins can update
CREATE POLICY oep_update ON oep_registry FOR UPDATE
  USING (is_super_admin() OR is_admin());

GRANT ALL ON oep_registry TO authenticated;
GRANT ALL ON oep_registry TO service_role;
GRANT INSERT ON oep_registry TO anon;
