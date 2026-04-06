-- Notification tracking to prevent duplicate sends
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, notification_type)
);

CREATE INDEX idx_notification_log_event ON notification_log(event_id, notification_type);
CREATE INDEX idx_notification_log_user ON notification_log(user_id, sent_at DESC);
