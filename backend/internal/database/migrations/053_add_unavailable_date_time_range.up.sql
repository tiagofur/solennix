ALTER TABLE unavailable_dates
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE unavailable_dates
  DROP CONSTRAINT IF EXISTS valid_time_window,
  ADD CONSTRAINT valid_time_window CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  );
