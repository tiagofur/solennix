-- Ensure pg_trgm is available for trigram operator/index usage
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Replace legacy concatenated trigram indexes from migration 033 to avoid
-- duplicate index maintenance and planner ambiguity.
DROP INDEX IF EXISTS idx_clients_search;
DROP INDEX IF EXISTS idx_events_search;
DROP INDEX IF EXISTS idx_products_search;
DROP INDEX IF EXISTS idx_inventory_search;

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON clients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_email_trgm ON clients USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_phone_trgm ON clients USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_city_trgm ON clients USING GIN (city gin_trgm_ops);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_trgm ON products USING GIN (category gin_trgm_ops);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient_name_trgm ON inventory USING GIN (ingredient_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_unit_trgm ON inventory USING GIN (unit gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_type_trgm ON inventory USING GIN (type gin_trgm_ops);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_service_type_trgm ON events USING GIN (service_type gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_events_location_trgm ON events USING GIN (location gin_trgm_ops);
