-- 027 Add unique constraint on (user_id, provider) for subscription upserts.
-- This ensures one subscription record per provider per user.

-- Drop old unique constraint on provider_subscription_id if it exists
-- (from the original 007 migration that created subscriptions table)
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_stripe_subscription_id_key;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_subscription_id_key;

-- Add unique constraint on (user_id, provider)
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_provider_unique
    UNIQUE (user_id, provider);
