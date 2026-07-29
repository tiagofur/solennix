-- Add 'About', coverage areas, capacity range, event types, response time, and languages to organizer_public_profiles
ALTER TABLE organizer_public_profiles
  ADD COLUMN IF NOT EXISTS about TEXT,
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS min_guests INTEGER,
  ADD COLUMN IF NOT EXISTS max_guests INTEGER,
  ADD COLUMN IF NOT EXISTS event_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_time VARCHAR(100),
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
