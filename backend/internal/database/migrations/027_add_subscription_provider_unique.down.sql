-- 027 Revert unique constraint on (user_id, provider)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_provider_unique;
