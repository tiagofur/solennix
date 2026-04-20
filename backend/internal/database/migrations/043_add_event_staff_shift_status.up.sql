-- Ola 1 of Personal expansion: operational layer on event_staff.
-- Adds shift window (for waiter teams / late-night gigs that may cross midnight)
-- and an assignment status so the organizer can track pending/confirmed/declined
-- without losing historical rows.
--
-- All columns are additive and defaulted so existing rows remain valid:
--   shift_start / shift_end NULL  = no shift defined (current behavior preserved)
--   status = 'confirmed'          = current behavior preserved (no pending step)
--
-- TIMESTAMPTZ (not TIME) because shifts may span midnight. The UI converts to
-- local time on display; backend stores UTC.
ALTER TABLE event_staff
    ADD COLUMN shift_start TIMESTAMPTZ,
    ADD COLUMN shift_end TIMESTAMPTZ,
    ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'
        CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled'));

-- Sanity: if both are set, end must be after start.
ALTER TABLE event_staff
    ADD CONSTRAINT event_staff_shift_window_valid
    CHECK (shift_start IS NULL OR shift_end IS NULL OR shift_end > shift_start);
