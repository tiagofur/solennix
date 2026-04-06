-- Pagination & performance indexes

-- Events: common listing and filtering patterns
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_user_status ON events(user_id, status);

-- Clients: listing and alphabetical sorting
CREATE INDEX IF NOT EXISTS idx_clients_user_name ON clients(user_id, name);
CREATE INDEX IF NOT EXISTS idx_clients_user_created ON clients(user_id, created_at DESC);

-- Products: listing by name and creation date
CREATE INDEX IF NOT EXISTS idx_products_user_created ON products(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_name ON products(user_id, name);

-- Inventory: listing by name
CREATE INDEX IF NOT EXISTS idx_inventory_user_name ON inventory(user_id, ingredient_name);

-- Payments: lookups by event and date range
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_date ON payments(user_id, payment_date DESC);

-- Product ingredients: batch lookups
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_inventory ON product_ingredients(inventory_id);
