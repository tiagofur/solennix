ALTER TABLE organizer_public_profiles
    DROP COLUMN IF EXISTS show_policies,
    DROP COLUMN IF EXISTS show_faq,
    DROP COLUMN IF EXISTS show_packages;

DROP TABLE IF EXISTS organizer_public_faq;
DROP TABLE IF EXISTS organizer_public_packages;
