-- 081 Platform marketing page views + coarse device/country on profile views.
-- Privacy-safe: visitor_hash only (no raw IP/UA). Country only from edge headers.

CREATE TABLE IF NOT EXISTS site_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key VARCHAR(64) NOT NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    device_class VARCHAR(20) NOT NULL DEFAULT 'unknown',
    country_code VARCHAR(2),
    referrer TEXT,
    source VARCHAR(40),
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_page_views_page_time
    ON site_page_views (page_key, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_page_views_time
    ON site_page_views (viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_site_page_views_device_time
    ON site_page_views (device_class, viewed_at DESC);

ALTER TABLE public_profile_views
    ADD COLUMN IF NOT EXISTS device_class VARCHAR(20) NOT NULL DEFAULT 'unknown';

ALTER TABLE public_profile_views
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
