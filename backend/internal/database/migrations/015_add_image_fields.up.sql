-- Add image fields to products, clients, and events
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
