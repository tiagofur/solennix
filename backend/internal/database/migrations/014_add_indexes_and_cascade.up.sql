-- 014 Add composite indexes for common query patterns and fix payments CASCADE

-- Composite indexes for events (calendar queries, dashboard filters)
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_user_status ON events(user_id, status);

-- Composite index for payments (lookups by user + event)
CREATE INDEX IF NOT EXISTS idx_payments_user_event ON payments(user_id, event_id);

-- Unique constraint on product_ingredients to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredients_unique
    ON product_ingredients(product_id, inventory_id);

-- Fix payments.user_id FK: add ON DELETE CASCADE
-- Drop existing constraint and re-add with CASCADE
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments
    ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
