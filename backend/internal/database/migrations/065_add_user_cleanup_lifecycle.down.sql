DROP INDEX IF EXISTS idx_users_inactivity_cleanup;

ALTER TABLE users
    DROP COLUMN IF EXISTS inactivity_warning_sent_at,
    DROP COLUMN IF EXISTS inactivity_stage;
