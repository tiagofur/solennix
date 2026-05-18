DROP INDEX IF EXISTS idx_event_reviews_visibility;
DROP INDEX IF EXISTS idx_event_reviews_event_id;
DROP INDEX IF EXISTS idx_event_reviews_user_id;
DROP TABLE IF EXISTS event_reviews;

DROP INDEX IF EXISTS idx_event_review_requests_token;
DROP INDEX IF EXISTS idx_event_review_requests_user_id;
DROP INDEX IF EXISTS idx_event_review_requests_event_unique;
DROP TABLE IF EXISTS event_review_requests;
