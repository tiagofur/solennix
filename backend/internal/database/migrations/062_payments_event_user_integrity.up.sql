-- Ensure payments.user_id always matches the owning organizer on the referenced event.
ALTER TABLE events
    ADD CONSTRAINT events_id_user_id_unique UNIQUE (id, user_id);

ALTER TABLE payments
    ADD CONSTRAINT payments_event_user_fkey
    FOREIGN KEY (event_id, user_id) REFERENCES events(id, user_id);