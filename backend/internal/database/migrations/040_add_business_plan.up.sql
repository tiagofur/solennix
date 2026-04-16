-- 040 Add 'business' to the users.plan constraint.
--
-- Migration 013 locked plan ∈ ('basic', 'pro', 'premium'). PRD/04 adds a
-- third paying tier (Business) with its own Stripe price and feature set, so
-- any INSERT/UPDATE with plan='business' was failing at the DB layer even
-- though the webhook + handler code is ready to set it.
--
-- 'premium' is kept here purely for backward compatibility with historical
-- rows and the debug upgrade handler; new signups won't land on it.
-- Migration 037 previously reset all rows that were 'pro' or 'business'
-- back to 'basic', so widening the allowlist cannot violate existing data.

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE users
    ADD CONSTRAINT users_plan_check CHECK (plan IN ('basic', 'pro', 'business', 'premium'));
