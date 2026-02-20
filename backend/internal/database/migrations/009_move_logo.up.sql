-- 009 Move logo from clients to users
ALTER TABLE clients DROP COLUMN IF EXISTS logo_url;
ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url TEXT;
