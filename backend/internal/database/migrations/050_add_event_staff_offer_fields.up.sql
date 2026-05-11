-- Team-member assignment offers: allow sending the same slot opportunity to
-- multiple collaborators and resolving by first acceptance.
--
-- offer_group_id: groups competing assignments for the same event slot.
-- offer_slots: how many winners are allowed in that group (default behavior
-- remains 1 when omitted).

ALTER TABLE event_staff
    ADD COLUMN offer_group_id UUID,
    ADD COLUMN offer_slots INT;

ALTER TABLE event_staff
    ADD CONSTRAINT event_staff_offer_slots_valid CHECK (offer_slots IS NULL OR offer_slots >= 1);

CREATE INDEX idx_event_staff_offer_group ON event_staff(event_id, offer_group_id);