-- 077 down: remove link support; keep public_requests rows (data-safe).

DROP INDEX IF EXISTS idx_public_requests_link_id;

ALTER TABLE public_requests
    DROP CONSTRAINT IF EXISTS public_requests_source_check;
ALTER TABLE public_requests
    DROP CONSTRAINT IF EXISTS public_requests_submit_mode_check;

ALTER TABLE public_requests
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS link_id,
    DROP COLUMN IF EXISTS submit_mode,
    DROP COLUMN IF EXISTS contact_phone,
    DROP COLUMN IF EXISTS city;

DROP INDEX IF EXISTS idx_prl_token;
DROP INDEX IF EXISTS idx_prl_expires;
DROP INDEX IF EXISTS idx_prl_organizer;
DROP TABLE IF EXISTS public_request_links;
