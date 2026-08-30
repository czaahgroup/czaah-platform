-- CRM notification types (P1F). ADD VALUE is transaction-safe as long as the
-- value is not used in the same migration — it isn't.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_assigned';
