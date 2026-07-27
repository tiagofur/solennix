-- Public professional profile foundation (Issue #787 / PR1).
-- users.public_slug already exists (054). This adds profile config, portfolio, and product flag.

CREATE TABLE IF NOT EXISTS organizer_public_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    headline VARCHAR(200),
    contact_type VARCHAR(20),
    contact_value VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    show_prices BOOLEAN NOT NULL DEFAULT false,
    show_services BOOLEAN NOT NULL DEFAULT true,
    show_reviews BOOLEAN NOT NULL DEFAULT true,
    show_portfolio BOOLEAN NOT NULL DEFAULT true,
    show_contact BOOLEAN NOT NULL DEFAULT true,
    socials JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_organizer_public_profiles_contact_type
        CHECK (contact_type IS NULL OR contact_type IN ('phone', 'whatsapp', 'email', 'url'))
);

CREATE TABLE IF NOT EXISTS organizer_public_portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    title VARCHAR(160) NOT NULL,
    event_date DATE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INT NOT NULL CHECK (sort_order BETWEEN 0 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uidx_public_portfolio_user_sort UNIQUE (user_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_public_portfolio_user
    ON organizer_public_portfolio_items(user_id);

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS show_on_public_profile BOOLEAN NOT NULL DEFAULT false;
