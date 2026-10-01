-- Partners can propose a developer from the Partner Network. Who proposed it
-- is recorded so the partner can see their own pending entries; it stays
-- inactive (not shown on the portal) until an admin switches it on.
ALTER TABLE property_developers
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
