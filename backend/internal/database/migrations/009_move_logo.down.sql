-- 009 Revert move logo from clients to users
ALTER TABLE users DROP COLUMN IF EXISTS logo_url;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
