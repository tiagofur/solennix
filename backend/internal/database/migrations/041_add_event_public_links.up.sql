-- 041 Event public links — tokenized URLs the organizer can share with
-- the end client so they can see a read-only portal for their event.
--
-- Relationship model:
--   One event can have MANY rows here (history of rotated tokens), but
--   only ONE with status='active' at a time. Application layer enforces
--   the "only one active" invariant by revoking the previous active row
--   inside a transaction before inserting a new one (see
--   EventPublicLinkRepo.Create).
--
--   Partial unique indexes in Postgres can't be expressed with a simple
--   CHECK constraint, so the invariant lives in code + a partial unique
--   index below as belt-and-suspenders.
--
-- user_id is stored redundantly (could be looked up through the event)
-- to enable a fast multi-tenant guard in GetByEventID without a join,
-- and to match the authorship column present on sibling tables.

CREATE TABLE IF NOT EXISTS event_public_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup on the public endpoint: GET /api/public/events/{token}
CREATE INDEX IF NOT EXISTS idx_event_public_links_token ON event_public_links(token);

-- Per-event queries: "does this event already have an active link?"
CREATE INDEX IF NOT EXISTS idx_event_public_links_event_id ON event_public_links(event_id);

-- Per-user listing (organizer viewing all portals they've shared).
CREATE INDEX IF NOT EXISTS idx_event_public_links_user_id ON event_public_links(user_id);

-- Enforces "at most one active link per event" at the DB level — the
-- partial unique index only applies to rows where status='active', so
-- older revoked rows do not conflict when a new active row is inserted.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_event_public_links_one_active_per_event
    ON event_public_links(event_id) WHERE status = 'active';
