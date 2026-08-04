-- 078 Distinct last successful login (auth) vs last_active_at (any authenticated API).
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users (last_login_at DESC NULLS LAST);
