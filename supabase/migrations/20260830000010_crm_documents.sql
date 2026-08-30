-- ============================================================
-- CRM documents (P1) — files attached to a contact or company
-- ============================================================
-- Metadata table; bytes live in the private 'crm-documents' storage bucket.
-- All access is via server-generated signed URLs (service role), so no
-- storage.objects policies are needed. Same security shape as the other
-- crm_* tables.

INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-documents', 'crm-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS crm_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  related_type crm_object NOT NULL,
  related_id   UUID NOT NULL,
  filename     TEXT NOT NULL,
  content_type TEXT,
  size_bytes   BIGINT,
  storage_path TEXT NOT NULL,
  label        TEXT,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_documents_related ON crm_documents (related_type, related_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_documents_uploader ON crm_documents (uploaded_by);

ALTER TABLE crm_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_documents_select ON crm_documents;
CREATE POLICY crm_documents_select ON crm_documents FOR SELECT
  USING (is_super_admin() OR is_admin() OR uploaded_by = auth.uid());
DROP POLICY IF EXISTS crm_documents_write ON crm_documents;
CREATE POLICY crm_documents_write ON crm_documents FOR ALL
  USING (is_super_admin() OR is_admin()) WITH CHECK (is_super_admin() OR is_admin());

REVOKE ALL ON crm_documents FROM anon, authenticated;
GRANT SELECT ON crm_documents TO authenticated;
GRANT ALL ON crm_documents TO service_role;
