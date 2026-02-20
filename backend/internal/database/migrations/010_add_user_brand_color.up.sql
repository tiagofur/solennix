-- 010 Add user brand color
ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_color VARCHAR(7);
