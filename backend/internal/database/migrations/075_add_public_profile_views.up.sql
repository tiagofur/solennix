-- 075 Public profile view tracking for inbound analytics (#1131).
-- Privacy-safe: visitor_hash is a one-way digest (no raw IP/UA stored).
CREATE TABLE IF NOT EXISTS public_profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(80) NOT NULL,
    visitor_hash VARCHAR(64) NOT NULL,
    referrer TEXT,
    source VARCHAR(40), -- directory | share | direct | other (derived)
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_profile_views_organizer_time
    ON public_profile_views (organizer_user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_profile_views_slug_time
    ON public_profile_views (slug, viewed_at DESC);

-- Composite for unique-visitor style queries (range on viewed_at + hash).
-- Avoid expression indexes on viewed_at::date — not IMMUTABLE in Postgres.
CREATE INDEX IF NOT EXISTS idx_public_profile_views_organizer_hash_time
    ON public_profile_views (organizer_user_id, visitor_hash, viewed_at DESC);
