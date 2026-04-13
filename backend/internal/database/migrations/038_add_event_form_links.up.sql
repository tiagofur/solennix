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
