CREATE TABLE processed_webhook_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     TEXT NOT NULL,
    provider     VARCHAR(50) NOT NULL,
    event_type   TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id)
);
CREATE INDEX idx_processed_webhook_events_processed_at ON processed_webhook_events (processed_at);
