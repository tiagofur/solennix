-- 073 Public request flow (Solicitudes de cotización estructuradas) — Issue #1115
-- PRD: docs/PRD/15_MARKETPLACE_V2.md §3 · SDD: openspec/changes/add-public-request-flow/
--
-- Adds structured quote requests (public_requests) and organizer responses
-- (public_responses). The public_leads table is kept untouched and soft-deprecated
-- (the /leads endpoint stays until web migrates to /requests in #1118).
--
-- NG1 (ratified): the requester is a visitor with a contact email, NOT a Solennix
-- user. client_token lets the visitor act on their own request without an account.

CREATE TABLE IF NOT EXISTS public_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_token UUID NOT NULL DEFAULT gen_random_uuid(),
    contact_email VARCHAR(320) NOT NULL,
    contact_name VARCHAR(160),
    event_type VARCHAR(80),
    event_date DATE,
    location TEXT,
    guest_count INT CHECK (guest_count IS NULL OR guest_count >= 0),
    budget NUMERIC(12, 2) CHECK (budget IS NULL OR budget >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    services JSONB NOT NULL DEFAULT '[]'::jsonb,
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'info_requested', 'responded',
                          'accepted_by_client', 'declined_provider',
                          'declined_client', 'booked', 'expired')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    event_id UUID,
    declined_reason TEXT,
    last_status_change TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_requests_organizer
    ON public_requests (organizer_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_requests_expiry
    ON public_requests (last_status_change)
    WHERE status IN ('pending', 'info_requested', 'responded');
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_requests_token
    ON public_requests (client_token);

CREATE TABLE IF NOT EXISTS public_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public_requests(id) ON DELETE CASCADE,
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quote_amount NUMERIC(12, 2) NOT NULL CHECK (quote_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_until DATE,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_responses_request
    ON public_responses (request_id);
CREATE INDEX IF NOT EXISTS idx_public_responses_organizer
    ON public_responses (organizer_user_id, created_at DESC);
