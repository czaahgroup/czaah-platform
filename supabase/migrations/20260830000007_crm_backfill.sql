-- ============================================================
-- CRM CORE BACKFILL (P1B)
-- ============================================================
-- Idempotent — every insert is guarded by NOT EXISTS and de-duped within
-- the batch. Split from 20260830000006 so a data bug here cannot block
-- the DDL, and so it can be re-run on its own.
-- ============================================================

-- 1. Companies from every distinct company name we already hold.
INSERT INTO crm_companies (name)
SELECT nm FROM (
  SELECT DISTINCT ON (lower(trim(nm))) trim(nm) AS nm
  FROM (
    SELECT company_name AS nm FROM profiles      WHERE company_name IS NOT NULL AND trim(company_name) <> ''
    UNION ALL
    SELECT company      AS nm FROM mail_contacts WHERE company      IS NOT NULL AND trim(company)      <> ''
  ) raw
  ORDER BY lower(trim(nm))
) d
WHERE NOT EXISTS (SELECT 1 FROM crm_companies c WHERE lower(c.name) = lower(d.nm));

-- 2. Contacts from the curated mail_contacts list (email is its primary key).
INSERT INTO crm_contacts (name, email, phone, title, notes, tags, type, source, company_id, created_by, created_at)
SELECT
  coalesce(nullif(trim(mc.name), ''), mc.email),
  lower(mc.email),
  mc.phone,
  mc.title,
  mc.notes,
  coalesce(mc.tags, '{}'::text[]),
  CASE mc.status
    WHEN 'client'   THEN 'client'::crm_contact_type
    WHEN 'vendor'   THEN 'vendor'::crm_contact_type
    WHEN 'lead'     THEN 'lead'::crm_contact_type
    WHEN 'archived' THEN 'other'::crm_contact_type
    ELSE 'prospect'::crm_contact_type
  END,
  'mail',
  (SELECT id FROM crm_companies c WHERE lower(c.name) = lower(trim(mc.company)) LIMIT 1),
  mc.created_by,
  mc.created_at
FROM mail_contacts mc
WHERE mc.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM crm_contacts x WHERE lower(x.email) = lower(mc.email));

-- 3. Contacts from platform users: partner accounts + approved members.
--    One CTE so partner/member classification and in-batch email de-dup
--    are handled together.
WITH candidates AS (
  SELECT
    p.id                              AS profile_id,
    p.full_name,
    lower(nullif(trim(p.email), ''))  AS email,
    p.phone,
    p.company_name,
    p.created_at,
    (pn.id IS NOT NULL)               AS is_partner
  FROM profiles p
  LEFT JOIN partners pn ON pn.profile_id = p.id
  WHERE pn.id IS NOT NULL
     OR (p.role = 'member' AND p.status = 'approved')
),
deduped AS (
  SELECT DISTINCT ON (coalesce(email, profile_id::text)) *
  FROM candidates
  ORDER BY coalesce(email, profile_id::text), is_partner DESC
)
INSERT INTO crm_contacts (profile_id, name, email, phone, title, type, stage, source, company_id, created_at)
SELECT
  d.profile_id,
  d.full_name,
  d.email,
  d.phone,
  CASE WHEN d.is_partner THEN 'Partner' ELSE NULL END,
  CASE WHEN d.is_partner THEN 'partner'::crm_contact_type ELSE 'client'::crm_contact_type END,
  CASE WHEN d.is_partner THEN 'new'::crm_lifecycle_stage  ELSE 'active'::crm_lifecycle_stage END,
  'platform',
  (SELECT id FROM crm_companies c WHERE lower(c.name) = lower(trim(d.company_name)) LIMIT 1),
  d.created_at
FROM deduped d
WHERE NOT EXISTS (SELECT 1 FROM crm_contacts x WHERE x.profile_id = d.profile_id)
  AND (d.email IS NULL OR NOT EXISTS (SELECT 1 FROM crm_contacts x WHERE lower(x.email) = d.email));

-- 4. Point contacts at their profile where email matches but profile_id
--    was not set (e.g. a mail_contact who later became a member).
UPDATE crm_contacts c
SET profile_id = p.id
FROM profiles p
WHERE c.profile_id IS NULL
  AND c.email IS NOT NULL
  AND lower(p.email) = c.email
  AND NOT EXISTS (SELECT 1 FROM crm_contacts x WHERE x.profile_id = p.id);
