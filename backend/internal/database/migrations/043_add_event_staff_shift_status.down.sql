ALTER TABLE event_staff
    DROP CONSTRAINT IF EXISTS event_staff_shift_window_valid;

ALTER TABLE event_staff
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS shift_end,
    DROP COLUMN IF EXISTS shift_start;
