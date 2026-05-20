DROP INDEX IF EXISTS idx_users_deletion_eligible_at;
DROP INDEX IF EXISTS idx_users_account_status;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS deletion_eligible_at,
    DROP COLUMN IF EXISTS blocked_by,
    DROP COLUMN IF EXISTS blocked_reason,
    DROP COLUMN IF EXISTS blocked_at,
    DROP COLUMN IF EXISTS account_status;
