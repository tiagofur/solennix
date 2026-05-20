DROP INDEX IF EXISTS idx_users_email_verification_token_hash;

ALTER TABLE users
    DROP COLUMN IF EXISTS email_verified_at,
    DROP COLUMN IF EXISTS email_verification_token_hash,
    DROP COLUMN IF EXISTS email_verification_sent_at,
    DROP COLUMN IF EXISTS email_verification_expires_at;
