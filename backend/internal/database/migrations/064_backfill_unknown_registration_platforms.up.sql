-- Infer registration platform for existing users with 'unknown' platform based on device tokens
UPDATE users u
SET registration_platform = (
    SELECT platform
    FROM device_tokens dt
    WHERE dt.user_id = u.id
    ORDER BY dt.created_at ASC
    LIMIT 1
)
WHERE (u.registration_platform = 'unknown' OR u.registration_platform = '' OR u.registration_platform IS NULL)
  AND EXISTS (
      SELECT 1
      FROM device_tokens dt
      WHERE dt.user_id = u.id
  );

-- Infer registration platform for existing users based on recorded platform interactions in user_platforms
UPDATE users u
SET registration_platform = (
    SELECT platform
    FROM user_platforms up
    WHERE up.user_id = u.id
    ORDER BY up.interaction_count DESC, up.last_used_at DESC
    LIMIT 1
)
WHERE (u.registration_platform = 'unknown' OR u.registration_platform = '' OR u.registration_platform IS NULL)
  AND EXISTS (
      SELECT 1
      FROM user_platforms up
      WHERE up.user_id = u.id
  );
