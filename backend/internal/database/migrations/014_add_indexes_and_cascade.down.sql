-- 014 Revert composite indexes and CASCADE change

DROP INDEX IF EXISTS idx_events_user_date;
DROP INDEX IF EXISTS idx_events_user_status;
DROP INDEX IF EXISTS idx_payments_user_event;
DROP INDEX IF EXISTS idx_product_ingredients_unique;

-- Revert payments.user_id FK to without CASCADE
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE payments
    ADD CONSTRAINT payments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);
