CREATE TABLE IF NOT EXISTS workforce_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  nationality TEXT NOT NULL,
  current_location TEXT NOT NULL,
  trade_category TEXT NOT NULL,
  specific_role TEXT NOT NULL,
  years_experience INT NOT NULL DEFAULT 0,
  certifications TEXT,
  preferred_destinations TEXT[] DEFAULT '{}',
  availability TEXT NOT NULL DEFAULT 'immediate',
  passport_status TEXT NOT NULL DEFAULT 'valid',
  medical_status TEXT NOT NULL DEFAULT 'not_done',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'shortlisted', 'placed', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workforce_trade ON workforce_registry(trade_category);
CREATE INDEX idx_workforce_status ON workforce_registry(status);
CREATE INDEX idx_workforce_created ON workforce_registry(created_at);

ALTER TABLE workforce_registry ENABLE ROW LEVEL SECURITY;

-- Only admins/super_admin can read
CREATE POLICY workforce_select ON workforce_registry FOR SELECT
  USING (is_super_admin() OR is_admin());

-- Public can insert (registration is open)
CREATE POLICY workforce_insert ON workforce_registry FOR INSERT
  WITH CHECK (TRUE);

-- Only admins can update
CREATE POLICY workforce_update ON workforce_registry FOR UPDATE
  USING (is_super_admin() OR is_admin());

GRANT ALL ON workforce_registry TO authenticated;
GRANT ALL ON workforce_registry TO service_role;
GRANT INSERT ON workforce_registry TO anon;
