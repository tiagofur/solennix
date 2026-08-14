-- 085 Normalize user and entity emails to lowercase and enforce unique lower email index

-- 1. Handle any existing case-insensitive duplicate emails in `users` before enforcing uniqueness.
-- The prioritized row (preferring exact lowercase match, then most recently updated) keeps the clean email;
-- duplicate collision rows are suffixed with "+dup_<id>" to preserve referential integrity and resolve constraint collision.
WITH ranked_users AS (
    SELECT 
        id, 
        email,
        ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(email))
            ORDER BY 
                CASE WHEN email = LOWER(TRIM(email)) THEN 0 ELSE 1 END,
                updated_at DESC,
                created_at ASC,
                id
        ) AS rn
    FROM users
    WHERE email IS NOT NULL AND TRIM(email) != ''
)
UPDATE users u
SET email = CASE 
    WHEN r.rn = 1 THEN LOWER(TRIM(u.email))
    WHEN POSITION('@' IN u.email) > 0 THEN 
        split_part(LOWER(TRIM(u.email)), '@', 1) || '+dup_' || SUBSTRING(REPLACE(u.id::text, '-', '') FROM 1 FOR 8) || '@' || split_part(LOWER(TRIM(u.email)), '@', 2)
    ELSE 
        LOWER(TRIM(u.email)) || '_dup_' || SUBSTRING(REPLACE(u.id::text, '-', '') FROM 1 FOR 8)
END
FROM ranked_users r
WHERE u.id = r.id;

-- 2. Normalize emails in other entity tables
UPDATE clients SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != LOWER(TRIM(email));
UPDATE staff SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != LOWER(TRIM(email));
UPDATE staff_invites SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL AND email != LOWER(TRIM(email));
UPDATE event_review_requests SET client_email = LOWER(TRIM(client_email)) WHERE client_email IS NOT NULL AND client_email != LOWER(TRIM(client_email));
UPDATE public_requests SET contact_email = LOWER(TRIM(contact_email)) WHERE contact_email IS NOT NULL AND contact_email != LOWER(TRIM(contact_email));

-- 3. Create unique index on LOWER(email) for users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
