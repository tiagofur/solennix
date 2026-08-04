-- 082 Registration funnel events (product analytics slice 3).
-- Steps: register_view (client beacon) | registered | email_verified | first_login.
-- Privacy-safe visitor_hash for anonymous steps; durable steps keyed by user_id once.

CREATE TABLE IF NOT EXISTS registration_funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step VARCHAR(40) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'unknown', -- email|google|apple|unknown
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown', -- web|ios|android|unknown
    visitor_hash VARCHAR(64),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_class VARCHAR(20) NOT NULL DEFAULT 'unknown',
    country_code VARCHAR(2),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_funnel_step_time
    ON registration_funnel_events (step, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_reg_funnel_time
    ON registration_funnel_events (occurred_at DESC);

-- Once-per-user for durable conversion steps.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_funnel_registered_once
    ON registration_funnel_events (user_id)
    WHERE step = 'registered' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_funnel_verified_once
    ON registration_funnel_events (user_id)
    WHERE step = 'email_verified' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_funnel_first_login_once
    ON registration_funnel_events (user_id)
    WHERE step = 'first_login' AND user_id IS NOT NULL;
