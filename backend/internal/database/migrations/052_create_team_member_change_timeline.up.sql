CREATE TABLE IF NOT EXISTS team_member_assignment_snapshots (
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_staff_id UUID NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    location TEXT,
    city TEXT,
    role_override TEXT,
    shift_start TIMESTAMPTZ,
    shift_end TIMESTAMPTZ,
    status TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (invited_user_id, event_staff_id)
);

CREATE INDEX IF NOT EXISTS idx_team_member_assignment_snapshots_invited_user
    ON team_member_assignment_snapshots(invited_user_id);

CREATE TABLE IF NOT EXISTS team_member_change_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    event_staff_id UUID NOT NULL REFERENCES event_staff(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    source_hash TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (invited_user_id, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_team_member_change_events_feed
    ON team_member_change_events(invited_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_member_change_events_unread
    ON team_member_change_events(invited_user_id, read_at)
    WHERE read_at IS NULL;
