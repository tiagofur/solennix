-- 012 Extend subscriptions table to support multi-provider (Stripe, Apple, Google via RevenueCat)

-- Make stripe_subscription_id optional (it's now provider_subscription_id)
ALTER TABLE subscriptions
    ALTER COLUMN stripe_subscription_id DROP NOT NULL;

ALTER TABLE subscriptions
    RENAME COLUMN stripe_subscription_id TO provider_subscription_id;

-- Add provider column: 'stripe' | 'apple' | 'google'
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS provider VARCHAR(50) NOT NULL DEFAULT 'stripe';

-- Add plan level column: 'basic' | 'pro' (aligns with users.plan)
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS plan VARCHAR(50) NOT NULL DEFAULT 'pro';

-- Add RevenueCat subscriber ID (used to link a subscriber across platforms)
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS revenuecat_app_user_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_id ON subscriptions(revenuecat_app_user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider);
