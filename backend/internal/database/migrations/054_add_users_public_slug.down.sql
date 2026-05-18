DROP INDEX IF EXISTS idx_users_public_slug_unique;

ALTER TABLE users
    DROP COLUMN IF EXISTS public_slug;
