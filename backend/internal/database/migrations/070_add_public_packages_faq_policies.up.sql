-- 070 Public profile packages, FAQ, and policy toggles (Issue #1081)

-- Curated packages/combos shown on the public profile (max 6 per organizer).
CREATE TABLE IF NOT EXISTS organizer_public_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    from_price NUMERIC(12, 2),
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    image_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 9),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_packages_user
    ON organizer_public_packages (user_id, sort_order);

-- Organizer-authored FAQ entries shown on the public profile (max 12).
CREATE TABLE IF NOT EXISTS organizer_public_faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question VARCHAR(280) NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 19),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_faq_user
    ON organizer_public_faq (user_id, sort_order);

-- Visibility toggles for the new sections.
ALTER TABLE organizer_public_profiles
    ADD COLUMN IF NOT EXISTS show_packages BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_faq BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_policies BOOLEAN NOT NULL DEFAULT false;
