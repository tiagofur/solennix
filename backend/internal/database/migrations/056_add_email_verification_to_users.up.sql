ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_verification_token_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email_verification_token_hash
    ON users(email_verification_token_hash)
    WHERE email_verification_token_hash IS NOT NULL;
