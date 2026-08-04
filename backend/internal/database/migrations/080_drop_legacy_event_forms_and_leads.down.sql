-- 080 down: recreate minimal legacy tables from 038 + 068 for test rollback.
CREATE TABLE IF NOT EXISTS event_form_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    submitted_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    submitted_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_form_links_token ON event_form_links(token);
CREATE INDEX IF NOT EXISTS idx_event_form_links_user_id ON event_form_links(user_id);
CREATE INDEX IF NOT EXISTS idx_event_form_links_expires_at ON event_form_links(expires_at) WHERE status = 'active';

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
