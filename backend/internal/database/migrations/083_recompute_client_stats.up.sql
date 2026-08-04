-- 083 Recompute denormalized client metrics.
-- Fixes clients stuck at 0 when events are confirmed/quoted (not only completed).
-- Rules match EventRepo.UpdateClientStats:
--   total_events = non-cancelled events
--   total_spent  = confirmed + completed totals

UPDATE clients c
SET
    total_events = COALESCE((
        SELECT COUNT(*)::int
        FROM events e
        WHERE e.client_id = c.id AND e.status <> 'cancelled'
    ), 0),
    total_spent = COALESCE((
        SELECT SUM(e.total_amount)
        FROM events e
        WHERE e.client_id = c.id AND e.status IN ('confirmed', 'completed')
    ), 0),
    updated_at = NOW();
