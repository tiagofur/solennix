-- Staff catalog: collaborators (photographer, DJ, waiter, coordinator, etc.)
-- that the organizer assigns to events. Ownership is per user (multi-tenant).
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_label TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,

    -- Phase 2 hook: email notifications to the collaborator when assigned.
    -- Column ships in Phase 1 so Phase 2 is a pure code hook (no migration).
    notification_email_opt_in BOOLEAN NOT NULL DEFAULT false,

    -- Phase 3 hook: link to a `users` row when the Business-tier organizer
    -- invites this staff to log in and see their assigned events.
    -- NULL until invitation is accepted.
    invited_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_user_id ON staff(user_id);
CREATE INDEX idx_staff_invited_user_id ON staff(invited_user_id) WHERE invited_user_id IS NOT NULL;

-- event_staff: junction table assigning staff to events. Mirror of event_equipment.
CREATE TABLE event_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

    -- Assignment-level fields (cost may vary per event)
    fee_amount NUMERIC(12,2),
    role_override TEXT,
    notes TEXT,

    -- Phase 2 hooks: dedup + outcome tracking of assignment notifications.
    notification_sent_at TIMESTAMPTZ,
    notification_last_result TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (event_id, staff_id)
);

CREATE INDEX idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX idx_event_staff_staff_id ON event_staff(staff_id);
