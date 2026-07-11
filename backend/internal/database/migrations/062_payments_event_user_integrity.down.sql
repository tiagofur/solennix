ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_event_user_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_id_user_id_unique;