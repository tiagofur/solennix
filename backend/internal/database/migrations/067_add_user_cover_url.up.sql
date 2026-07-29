-- 067 Add user cover image url (public profile hero banner)
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;
