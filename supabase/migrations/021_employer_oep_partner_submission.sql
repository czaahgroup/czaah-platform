-- Same pattern as workforce_registry: lets a workforce-authorised
-- CZAAH Partner recommend an Employer or Employment Promoter (OEP)
-- directly, no login account for the recommended company, reviewed
-- through the same existing admin pipelines.

ALTER TABLE employer_registry ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;
ALTER TABLE oep_registry ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_employer_registry_partner ON employer_registry(partner_id);
CREATE INDEX idx_oep_registry_partner ON oep_registry(partner_id);

CREATE POLICY employer_registry_select_partner ON employer_registry FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));

CREATE POLICY oep_select_partner ON oep_registry FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));
