-- Recruitment-specific fields on partner_opportunities, shown only when
-- opportunity_type = 'recruitment_requirement'. Reuses the existing
-- `country` column as "Deployment Country" for that type.

ALTER TABLE partner_opportunities ADD COLUMN workers_needed INT;
ALTER TABLE partner_opportunities ADD COLUMN trade_skill TEXT;
