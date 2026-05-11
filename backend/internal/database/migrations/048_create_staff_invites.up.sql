-- Phase 3 foundation: invitation lifecycle for "personal + usuario".
-- This table stores hashed one-time invite tokens that let a collaborator
-- activate a scoped team-member account in a future endpoint.

CREATE TABLE staff_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT staff_invites_status_check CHECK (status IN ('pending', 'accepted', 'revoked', 'expired'))
);

CREATE INDEX idx_staff_invites_staff_id ON staff_invites(staff_id);
CREATE INDEX idx_staff_invites_owner_user_id ON staff_invites(owner_user_id);
CREATE INDEX idx_staff_invites_pending_expires ON staff_invites(status, expires_at);

-- At most one pending invite per staff row.
CREATE UNIQUE INDEX idx_staff_invites_one_pending_per_staff
    ON staff_invites(staff_id)
    WHERE status = 'pending';