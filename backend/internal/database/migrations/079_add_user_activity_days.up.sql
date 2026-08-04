-- 079 Daily active user presence for admin DAU time series.
-- One row per user per UTC day per platform (filled from activity buffer flush).
CREATE TABLE IF NOT EXISTS user_activity_days (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
    PRIMARY KEY (user_id, activity_date, platform)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_days_date
    ON user_activity_days (activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_days_platform_date
    ON user_activity_days (platform, activity_date DESC);
