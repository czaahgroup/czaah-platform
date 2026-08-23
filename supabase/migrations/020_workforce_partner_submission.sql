-- Lets a CZAAH Partner submit workforce candidates directly (no login
-- account for the candidate — the partner is introducing them, not the
-- candidate self-registering). Reviewed through the same admin
-- workforce pipeline as any other candidate.

ALTER TABLE workforce_registry ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX idx_workforce_partner ON workforce_registry(partner_id);

-- A partner can see the candidates they submitted (admin already can, via workforce_select)
CREATE POLICY workforce_select_partner ON workforce_registry FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE profile_id = auth.uid()));
