-- Ola 3 of Personal expansion: products can optionally reference a staff_team.
-- When a product with a staff_team_id is added to an event, the UI expands
-- the team's members into event_staff rows (client-orchestrated — backend
-- stays a dumb store for this relationship).
--
-- ON DELETE SET NULL so deleting the team keeps the product (the product
-- just loses its team association; the price/ingredients stay intact).
--
-- Nullable so existing products are untouched — this is an additive feature.
ALTER TABLE products
    ADD COLUMN staff_team_id UUID REFERENCES staff_teams(id) ON DELETE SET NULL;

-- Partial index: useful when we filter products by "has a team" for future
-- reports or the "servicio de meseros" catalog shortcut in the UI. Ignored
-- by queries that don't touch the column.
CREATE INDEX idx_products_staff_team_id ON products(staff_team_id)
    WHERE staff_team_id IS NOT NULL;
