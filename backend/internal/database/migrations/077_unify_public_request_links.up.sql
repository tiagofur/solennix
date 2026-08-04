-- 077 Unify Formularios + Solicitudes (PR1 backend)
-- Creates public_request_links and extends public_requests for source/link/submit_mode.
-- Refs: openspec/changes/unify-solicitudes-forms/design.md §4

CREATE TABLE IF NOT EXISTS public_request_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    submit_mode TEXT NOT NULL DEFAULT 'auto_event'
        CHECK (submit_mode IN ('standard', 'auto_quote', 'auto_event')),
    max_uses INT CHECK (max_uses IS NULL OR max_uses >= 1),
    use_count INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prl_organizer
    ON public_request_links (organizer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_prl_expires
    ON public_request_links (expires_at)
    WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prl_token
    ON public_request_links (token);

ALTER TABLE public_requests
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'public_profile',
    ADD COLUMN IF NOT EXISTS link_id UUID REFERENCES public_request_links(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS submit_mode TEXT NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(40),
    ADD COLUMN IF NOT EXISTS city TEXT;

-- Constraints may already exist on re-run; drop then re-add for idempotency.
ALTER TABLE public_requests
    DROP CONSTRAINT IF EXISTS public_requests_source_check;
ALTER TABLE public_requests
    ADD CONSTRAINT public_requests_source_check
    CHECK (source IN ('public_profile', 'shared_link'));

ALTER TABLE public_requests
    DROP CONSTRAINT IF EXISTS public_requests_submit_mode_check;
ALTER TABLE public_requests
    ADD CONSTRAINT public_requests_submit_mode_check
    CHECK (submit_mode IN ('standard', 'auto_quote', 'auto_event'));

CREATE INDEX IF NOT EXISTS idx_public_requests_link_id
    ON public_requests (link_id)
    WHERE link_id IS NOT NULL;

-- services JSONB may include qty per line item (app-layer; no DB constraint).
COMMENT ON COLUMN public_requests.services IS
    'JSONB array of {product_id, name, price, qty, is_featured} snapshots at submit time';
COMMENT ON COLUMN public_requests.source IS
    'public_profile | shared_link — how the visitor entered';
COMMENT ON COLUMN public_requests.submit_mode IS
    'standard | auto_quote | auto_event — outcome applied on create';
