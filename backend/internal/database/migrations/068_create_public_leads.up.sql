-- 068 Public profile lead capture (Issue #1076)
-- Unauthenticated visitors submit inquiries to an organizer's public profile.
CREATE TABLE IF NOT EXISTS public_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    event_date DATE,
    event_type VARCHAR(80),
    num_guests INTEGER,
    message TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'form',
    submitted_from_ip VARCHAR(64),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_leads_organizer
    ON public_leads (organizer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_leads_unread
    ON public_leads (organizer_user_id) WHERE is_read = false;
