-- 071 Down: drop is_featured from products
ALTER TABLE products
    DROP COLUMN IF EXISTS is_featured;
