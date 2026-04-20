-- Ola 2 of Personal expansion: staff teams (crews).
-- Lets the organizer group staff into named teams (e.g. "Equipo de meseros
-- Plata", "Cuadrilla de montaje") so they can be assigned to an event in one
-- click — the UI expands the team into N rows in event_staff on save.
--
-- Ownership is per user (multi-tenant). Members reference `staff` rows; both
-- sides cascade on delete. The team/member tables intentionally carry NO fee
-- or status — those still live on the per-assignment row in event_staff so the
-- same team can be used in multiple events with different costs/RSVPs.
CREATE TABLE staff_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- role_label is the default role applied to each member on expansion
    -- when event_staff.role_override is left blank (e.g. team "Meseros Plata"
    -- with role_label = "Mesero" means each assignment defaults to "Mesero").
    role_label TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_teams_user_id ON staff_teams(user_id);

-- staff_team_members is a composite-PK junction.
-- is_lead is a visual/semantic flag only — not a permission (Phase 3 may wire
-- it to the invited-user flow). position controls display order in the team.
CREATE TABLE staff_team_members (
    team_id UUID NOT NULL REFERENCES staff_teams(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    is_lead BOOLEAN NOT NULL DEFAULT false,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, staff_id)
);

CREATE INDEX idx_staff_team_members_staff_id ON staff_team_members(staff_id);
