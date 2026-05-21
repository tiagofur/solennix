DROP INDEX IF EXISTS idx_events_location_trgm;
DROP INDEX IF EXISTS idx_events_service_type_trgm;

DROP INDEX IF EXISTS idx_inventory_type_trgm;
DROP INDEX IF EXISTS idx_inventory_unit_trgm;
DROP INDEX IF EXISTS idx_inventory_ingredient_name_trgm;

DROP INDEX IF EXISTS idx_products_category_trgm;
DROP INDEX IF EXISTS idx_products_name_trgm;

DROP INDEX IF EXISTS idx_clients_city_trgm;
DROP INDEX IF EXISTS idx_clients_phone_trgm;
DROP INDEX IF EXISTS idx_clients_email_trgm;
DROP INDEX IF EXISTS idx_clients_name_trgm;

-- Restore legacy concatenated trigram indexes from migration 033
CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING GIN (
	(COALESCE(name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(city, '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_events_search ON events USING GIN (
	(COALESCE(service_type, '') || ' ' || COALESCE(location, '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (
	(COALESCE(name, '') || ' ' || COALESCE(category, '')) gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory USING GIN (
	(COALESCE(ingredient_name, '') || ' ' || COALESCE(type, '')) gin_trgm_ops
);
