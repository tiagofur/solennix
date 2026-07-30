-- 071 Add is_featured to products
-- is_featured is orthogonal to show_on_public_profile: visibility (show_on_public_profile)
-- vs. hierarchy/priority (is_featured). Featured services sort first on the public profile.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
