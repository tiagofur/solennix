-- Rollback 012
DROP INDEX IF EXISTS idx_subscriptions_revenuecat_id;
DROP INDEX IF EXISTS idx_subscriptions_provider;

ALTER TABLE subscriptions DROP COLUMN IF EXISTS revenuecat_app_user_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS provider;

ALTER TABLE subscriptions RENAME COLUMN provider_subscription_id TO stripe_subscription_id;
ALTER TABLE subscriptions ALTER COLUMN stripe_subscription_id SET NOT NULL;
