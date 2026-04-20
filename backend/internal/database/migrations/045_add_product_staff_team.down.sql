DROP INDEX IF EXISTS idx_products_staff_team_id;

ALTER TABLE products
    DROP COLUMN IF EXISTS staff_team_id;
