-- Services visible on the public profile by default. The Free-plan cap of 3
-- is removed (see 072 changelog), so existing active products are backfilled to
-- visible=true to match the new default behaviour. Inactive products stay
-- hidden — they are filtered out of the public projection regardless.
ALTER TABLE products
    ALTER COLUMN show_on_public_profile SET DEFAULT true;

UPDATE products
SET show_on_public_profile = true, updated_at = NOW()
WHERE is_active = true AND show_on_public_profile = false;
