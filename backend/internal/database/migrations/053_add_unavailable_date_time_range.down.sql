ALTER TABLE unavailable_dates
  DROP CONSTRAINT IF EXISTS valid_time_window,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time;
