ALTER TABLE organizer_public_profiles
  DROP COLUMN IF EXISTS about,
  DROP COLUMN IF EXISTS service_areas,
  DROP COLUMN IF EXISTS min_guests,
  DROP COLUMN IF EXISTS max_guests,
  DROP COLUMN IF EXISTS event_types,
  DROP COLUMN IF EXISTS response_time,
  DROP COLUMN IF EXISTS languages;
