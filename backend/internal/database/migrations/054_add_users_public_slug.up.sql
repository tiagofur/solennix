ALTER TABLE users
    ADD COLUMN IF NOT EXISTS public_slug VARCHAR(140);

-- Backfill existing users with a deterministic readable slug plus short id suffix.
UPDATE users
SET public_slug = LOWER(
    REGEXP_REPLACE(
        COALESCE(NULLIF(business_name, ''), NULLIF(name, ''), SPLIT_PART(email, '@', 1)),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
    ) || '-' || SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 8)
)
WHERE public_slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_slug_unique
    ON users(public_slug)
    WHERE public_slug IS NOT NULL;
