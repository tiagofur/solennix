DROP INDEX IF EXISTS uidx_event_public_links_one_active_per_event;
DROP INDEX IF EXISTS idx_event_public_links_user_id;
DROP INDEX IF EXISTS idx_event_public_links_event_id;
DROP INDEX IF EXISTS idx_event_public_links_token;

DROP TABLE IF EXISTS event_public_links;
