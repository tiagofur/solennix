-- 085 Normalize user and entity emails to lowercase and enforce unique lower email index
UPDATE users SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE clients SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE staff SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE staff_invites SET email = LOWER(TRIM(email)) WHERE email IS NOT NULL;
UPDATE event_review_requests SET client_email = LOWER(TRIM(client_email)) WHERE client_email IS NOT NULL;
UPDATE public_requests SET contact_email = LOWER(TRIM(contact_email)) WHERE contact_email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
