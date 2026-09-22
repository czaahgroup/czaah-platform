-- Editable content and settings for property.czaah.com.
--
-- One row per section rather than a table per section: the shapes are small,
-- nested and differ from each other, and five bespoke tables would mean five
-- migrations every time the copy grows a field.
--
-- Nothing here is required. Every consumer keeps its hardcoded value as the
-- default and merges a row over it, so an empty table, a missing key or a
-- failed request all render exactly what the site renders today.
CREATE TABLE IF NOT EXISTS portal_content (
  key         TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT portal_content_key_check
    CHECK (key IN ('settings', 'home', 'offices', 'destinations', 'insights'))
);

DROP TRIGGER IF EXISTS set_updated_at ON portal_content;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON portal_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE portal_content ENABLE ROW LEVEL SECURITY;

-- The portal is public, so its content is readable by anyone.
DROP POLICY IF EXISTS portal_content_read ON portal_content;
CREATE POLICY portal_content_read ON portal_content FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS portal_content_admin_write ON portal_content;
CREATE POLICY portal_content_admin_write ON portal_content
  FOR ALL USING (is_super_admin() OR is_admin())
  WITH CHECK (is_super_admin() OR is_admin());

GRANT SELECT ON portal_content TO anon, authenticated;
GRANT ALL ON portal_content TO service_role;
