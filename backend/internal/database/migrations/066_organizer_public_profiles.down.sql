ALTER TABLE products
    DROP COLUMN IF EXISTS show_on_public_profile;

DROP INDEX IF EXISTS idx_public_portfolio_user;

DROP TABLE IF EXISTS organizer_public_portfolio_items;

DROP TABLE IF EXISTS organizer_public_profiles;
