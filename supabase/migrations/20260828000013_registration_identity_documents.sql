-- Identity document required for a registration to be approved (Worker/Employer),
-- storage path in the private 'registration-documents' bucket.
ALTER TABLE workforce_registry ADD COLUMN IF NOT EXISTS identity_document_url TEXT;
ALTER TABLE employer_registry ADD COLUMN IF NOT EXISTS identity_document_url TEXT;
