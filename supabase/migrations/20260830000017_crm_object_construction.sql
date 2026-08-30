-- P3-D — add 'construction_project' to the crm_object enum so notes, tasks,
-- documents and the timeline can attach to a construction project. Own file:
-- a new enum value cannot be used in the transaction that adds it.

ALTER TYPE crm_object ADD VALUE IF NOT EXISTS 'construction_project';
