DROP INDEX IF EXISTS idx_event_staff_offer_group;

ALTER TABLE event_staff
    DROP CONSTRAINT IF EXISTS event_staff_offer_slots_valid;

ALTER TABLE event_staff
    DROP COLUMN IF EXISTS offer_slots,
    DROP COLUMN IF EXISTS offer_group_id;