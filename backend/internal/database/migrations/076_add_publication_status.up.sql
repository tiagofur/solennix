-- 076 Listing moderation workflow (#1130).
-- Profiles can be enabled for /u/:slug without appearing in the public directory
-- until an admin approves publication_status = 'published'.

ALTER TABLE organizer_public_profiles
    ADD COLUMN IF NOT EXISTS publication_status VARCHAR(20) NOT NULL DEFAULT 'unpublished',
    ADD COLUMN IF NOT EXISTS publication_rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS publication_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS publication_reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS publication_submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS publication_spam_flag BOOLEAN NOT NULL DEFAULT false;

-- Drop legacy check if re-run; add constraint for allowed statuses.
ALTER TABLE organizer_public_profiles
    DROP CONSTRAINT IF EXISTS organizer_public_profiles_publication_status_check;

ALTER TABLE organizer_public_profiles
    ADD CONSTRAINT organizer_public_profiles_publication_status_check
    CHECK (publication_status IN ('unpublished', 'pending_review', 'published', 'rejected'));

-- Grandfather existing enabled listings so the directory does not empty on deploy.
UPDATE organizer_public_profiles
SET publication_status = 'published'
WHERE is_enabled = true
  AND publication_status = 'unpublished';

CREATE INDEX IF NOT EXISTS idx_opp_publication_status
    ON organizer_public_profiles (publication_status)
    WHERE publication_status IN ('pending_review', 'published', 'rejected');
