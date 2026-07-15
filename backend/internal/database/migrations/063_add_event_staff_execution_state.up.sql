-- Team-member execution state (#875): the per-assignment checklist
-- (arrival / materials / closing) and a free-text quick note used to be
-- device-only (localStorage / UserDefaults / SharedPreferences). This
-- column lifts that state server-side so it survives device changes.
--
-- Stored as JSONB to mirror the client shape
-- { "checklist": { "arrival": bool, "materials": bool, "closing": bool },
--   "quick_note": string }
-- and stay extensible without future migrations. Nullable + no default: an
-- assignment with no execution state yet reads back as empty defaults
-- (handled in the repository layer), preserving current behavior for rows
-- created before this migration.
ALTER TABLE event_staff
    ADD COLUMN execution_state JSONB;
