ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
    ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_eligible_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
    ADD CONSTRAINT users_account_status_check
    CHECK (account_status IN ('active', 'blocked', 'deleted'));

CREATE INDEX IF NOT EXISTS idx_users_account_status
    ON users(account_status);

CREATE INDEX IF NOT EXISTS idx_users_deletion_eligible_at
    ON users(deletion_eligible_at)
    WHERE account_status = 'blocked';
