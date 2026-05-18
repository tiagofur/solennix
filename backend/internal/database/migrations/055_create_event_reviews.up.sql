CREATE TABLE IF NOT EXISTS event_review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    client_name VARCHAR(255),
    client_email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_event_review_requests_event_unique
    ON event_review_requests(event_id);

CREATE INDEX IF NOT EXISTS idx_event_review_requests_user_id
    ON event_review_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_event_review_requests_token
    ON event_review_requests(token);

CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    review_request_id UUID REFERENCES event_review_requests(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    organizer_response TEXT,
    responded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uidx_event_reviews_event_client UNIQUE (event_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_user_id
    ON event_reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id
    ON event_reviews(event_id);

CREATE INDEX IF NOT EXISTS idx_event_reviews_visibility
    ON event_reviews(visibility);
