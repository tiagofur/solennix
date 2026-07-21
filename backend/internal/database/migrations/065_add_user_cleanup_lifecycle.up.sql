ALTER TABLE users
    ADD COLUMN IF NOT EXISTS inactivity_stage INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inactivity_warning_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_inactivity_cleanup
    ON users (account_status, plan, inactivity_stage, last_active_at);
