ALTER TABLE users ADD COLUMN registration_platform VARCHAR(20) DEFAULT 'unknown';

CREATE TABLE user_platforms (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL,
    interaction_count INT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, platform)
);

-- Infer registration platform for existing users based on device tokens
UPDATE users u
SET registration_platform = (
    SELECT platform
    FROM device_tokens dt
    WHERE dt.user_id = u.id
    ORDER BY dt.created_at ASC
    LIMIT 1
)
WHERE u.registration_platform = 'unknown'
  AND EXISTS (
      SELECT 1
      FROM device_tokens dt
      WHERE dt.user_id = u.id
  );
