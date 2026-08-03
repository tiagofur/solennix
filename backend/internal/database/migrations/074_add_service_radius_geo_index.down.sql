-- 074 down: remove geo index + service_radius_km.
-- Safe: latitude/longitude (migration 066) are NOT touched.

DROP INDEX IF EXISTS idx_public_profiles_geo;
ALTER TABLE organizer_public_profiles
    DROP COLUMN IF EXISTS service_radius_km;
