-- 073 down: remove public request flow.
-- Safe: no existing data (new tables). public_leads stays untouched.

DROP TABLE IF EXISTS public_responses;
DROP TABLE IF EXISTS public_requests;
