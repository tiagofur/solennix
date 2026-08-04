-- 083 down: cannot restore previous (incorrect) denormalized values.
-- No-op intentionally; recompute again after rollback of application code if needed.
SELECT 1;
