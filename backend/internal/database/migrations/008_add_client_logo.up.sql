-- 008 Add client logo column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
