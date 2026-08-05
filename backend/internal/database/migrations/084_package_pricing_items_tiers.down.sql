ALTER TABLE public_requests DROP COLUMN IF EXISTS package_quote;

DROP TABLE IF EXISTS organizer_public_package_discount_tiers;
DROP TABLE IF EXISTS organizer_public_package_items;

ALTER TABLE organizer_public_packages DROP COLUMN IF EXISTS min_guests;
