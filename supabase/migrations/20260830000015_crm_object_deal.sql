-- P3-C — add 'deal' to the crm_object enum so notes, tasks, documents and
-- the activity timeline can attach to a deal. Split into its own migration:
-- a new enum value cannot be used in the same transaction that adds it, and
-- the CLI runs each migration file in its own transaction.

ALTER TYPE crm_object ADD VALUE IF NOT EXISTS 'deal';
