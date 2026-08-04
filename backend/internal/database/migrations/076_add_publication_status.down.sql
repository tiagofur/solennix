DROP INDEX IF EXISTS idx_opp_publication_status;

ALTER TABLE organizer_public_profiles
    DROP CONSTRAINT IF EXISTS organizer_public_profiles_publication_status_check;

ALTER TABLE organizer_public_profiles
    DROP COLUMN IF EXISTS publication_spam_flag,
    DROP COLUMN IF EXISTS publication_submitted_at,
    DROP COLUMN IF EXISTS publication_reviewed_by,
    DROP COLUMN IF EXISTS publication_reviewed_at,
    DROP COLUMN IF EXISTS publication_rejection_reason,
    DROP COLUMN IF EXISTS publication_status;
