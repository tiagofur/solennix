-- 074 Geo-data: service_radius_km + geo index (Issue #1127)
-- PRD: docs/PRD/15_MARKETPLACE_V2.md §4.3
--
-- latitude/longitude already exist (migration 066, reserved "directory-ready;
-- unused in public JSON v1"). This migration adds the service radius column and
-- a partial index on (latitude, longitude) for bounding-box queries (#1116).

ALTER TABLE organizer_public_profiles
    ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(6, 2);

CREATE INDEX IF NOT EXISTS idx_public_profiles_geo
    ON organizer_public_profiles (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
