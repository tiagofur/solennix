-- 084 Package pricing: catalog items, guest discount tiers, request snapshot
-- Browse = live catalog prices; request package_quote = frozen quote at submit.

ALTER TABLE organizer_public_packages
    ADD COLUMN IF NOT EXISTS min_guests INT
        CHECK (min_guests IS NULL OR min_guests >= 1);

-- Line items linked to catalog products (pricing unit chosen at package build time).
CREATE TABLE IF NOT EXISTS organizer_public_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES organizer_public_packages(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    pricing_unit VARCHAR(20) NOT NULL
        CHECK (pricing_unit IN ('per_guest', 'per_event')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (package_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_public_package_items_package
    ON organizer_public_package_items (package_id, sort_order);

-- Up to 3 guest-count % discount tiers per package (enforced in app; unique from_guests).
CREATE TABLE IF NOT EXISTS organizer_public_package_discount_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES organizer_public_packages(id) ON DELETE CASCADE,
    from_guests INT NOT NULL CHECK (from_guests >= 1),
    discount_percent NUMERIC(5, 2) NOT NULL
        CHECK (discount_percent >= 0 AND discount_percent <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (package_id, from_guests)
);
CREATE INDEX IF NOT EXISTS idx_public_package_tiers_package
    ON organizer_public_package_discount_tiers (package_id, from_guests);

-- Frozen quote when visitor requests a package (items, unit prices, guests, totals).
ALTER TABLE public_requests
    ADD COLUMN IF NOT EXISTS package_quote JSONB;
