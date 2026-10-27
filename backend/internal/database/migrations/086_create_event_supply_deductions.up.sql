-- S6 (audit): per-event stock deduction ledger. The unique
-- (event_id, inventory_id) key is the idempotency guard — re-confirming an
-- event must never deduct the same inventory item twice.
CREATE TABLE event_supply_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_event_supply_deductions_unique ON event_supply_deductions(event_id, inventory_id);
CREATE INDEX idx_event_supply_deductions_event_id ON event_supply_deductions(event_id);
