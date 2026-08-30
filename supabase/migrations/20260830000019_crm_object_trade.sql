-- P3-E — add 'commodity_trade' to the crm_object enum so notes, tasks,
-- documents and the timeline can attach to a commodity trade. Own file:
-- a new enum value cannot be used in the transaction that adds it.

ALTER TYPE crm_object ADD VALUE IF NOT EXISTS 'commodity_trade';
