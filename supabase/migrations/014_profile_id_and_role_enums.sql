-- Documents schema changes that were already applied directly via the SQL
-- Editor while unifying Worker/Employer/Employment Promoter registration
-- into the account system. Written after the fact for reproducibility —
-- safe to re-run (all statements are idempotent) and is a no-op on the
-- live database, which already has all of this.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'worker';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'oep_partner';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'identity_document';

ALTER TABLE workforce_registry ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE employer_registry ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE oep_registry      ADD COLUMN IF NOT EXISTS profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workforce_registry_profile ON workforce_registry(profile_id);
CREATE INDEX IF NOT EXISTS idx_employer_registry_profile  ON employer_registry(profile_id);
CREATE INDEX IF NOT EXISTS idx_oep_registry_profile        ON oep_registry(profile_id);
