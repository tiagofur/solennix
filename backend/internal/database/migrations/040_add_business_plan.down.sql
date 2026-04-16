-- Rollback 040: restore the pre-Business constraint.
--
-- Reverse order: demote any existing 'business' rows to 'basic' (the
-- safe landing value) BEFORE reinstating the stricter constraint, else the
-- ADD CONSTRAINT would fail.

UPDATE users SET plan = 'basic' WHERE plan = 'business';

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_plan_check;

ALTER TABLE users
    ADD CONSTRAINT users_plan_check CHECK (plan IN ('basic', 'pro', 'premium'));
