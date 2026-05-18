package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type EventReviewRepo struct {
	pool *pgxpool.Pool
}

func NewEventReviewRepo(pool *pgxpool.Pool) *EventReviewRepo {
	return &EventReviewRepo{pool: pool}
}

const reviewRequestFields = `
	rr.id, rr.event_id, rr.user_id, rr.client_id, rr.token,
	rr.client_name, rr.client_email, rr.sent_at, rr.expires_at,
	rr.submitted_at, rr.created_at, rr.updated_at,
	e.event_date, e.service_type,
	COALESCE(u.business_name, u.name) AS organizer_name`

const reviewFields = `
	er.id, er.event_id, er.user_id, er.client_id, er.review_request_id,
	er.rating, er.comment, er.visibility, er.organizer_response,
	er.responded_at, er.submitted_at, er.created_at, er.updated_at,
	c.name AS client_name,
	e.service_type AS event_label,
	COALESCE(u.business_name, u.name) AS organizer_name,
	u.public_slug`

func scanReviewRequest(row pgx.Row) (*models.EventReviewRequest, error) {
	var rr models.EventReviewRequest
	err := row.Scan(
		&rr.ID,
		&rr.EventID,
		&rr.UserID,
		&rr.ClientID,
		&rr.Token,
		&rr.ClientName,
		&rr.ClientEmail,
		&rr.SentAt,
		&rr.ExpiresAt,
		&rr.SubmittedAt,
		&rr.CreatedAt,
		&rr.UpdatedAt,
		&rr.EventDate,
		&rr.EventLabel,
		&rr.OrganizerName,
	)
	if err != nil {
		return nil, err
	}
	return &rr, nil
}

func scanReview(row pgx.Row) (*models.EventReview, error) {
	var r models.EventReview
	err := row.Scan(
		&r.ID,
		&r.EventID,
		&r.UserID,
		&r.ClientID,
		&r.ReviewRequestID,
		&r.Rating,
		&r.Comment,
		&r.Visibility,
		&r.OrganizerResponse,
		&r.RespondedAt,
		&r.SubmittedAt,
		&r.CreatedAt,
		&r.UpdatedAt,
		&r.ClientName,
		&r.EventLabel,
		&r.OrganizerName,
		&r.PublicSlug,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// ReviewEmailCandidate is an event eligible for the 48h post-event review request email.
type ReviewEmailCandidate struct {
	EventID       uuid.UUID
	UserID        uuid.UUID
	ClientID      uuid.UUID
	ClientName    string
	ClientEmail   string
	EventDate     string
	EventLabel    string
	OrganizerName string
	OrganizerPlan string
}

func (r *EventReviewRepo) ListPendingEmailCandidates(ctx context.Context, limit int) ([]ReviewEmailCandidate, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.pool.Query(ctx, `
		SELECT
			e.id,
			e.user_id,
			e.client_id,
			COALESCE(c.name, '') AS client_name,
			COALESCE(c.email, '') AS client_email,
			e.event_date,
			COALESCE(e.service_type, 'Evento') AS event_label,
			COALESCE(u.business_name, u.name) AS organizer_name,
			u.plan
		FROM events e
		JOIN clients c ON c.id = e.client_id AND c.user_id = e.user_id
		JOIN users u ON u.id = e.user_id
		LEFT JOIN event_review_requests rr ON rr.event_id = e.id
		WHERE rr.id IS NULL
		  AND c.email IS NOT NULL
		  AND c.email <> ''
		  AND e.event_date::date <= (CURRENT_DATE - INTERVAL '2 days')
		ORDER BY e.event_date DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list pending review email candidates: %w", err)
	}
	defer rows.Close()

	result := make([]ReviewEmailCandidate, 0)
	for rows.Next() {
		var c ReviewEmailCandidate
		if err := rows.Scan(
			&c.EventID,
			&c.UserID,
			&c.ClientID,
			&c.ClientName,
			&c.ClientEmail,
			&c.EventDate,
			&c.EventLabel,
			&c.OrganizerName,
			&c.OrganizerPlan,
		); err != nil {
			return nil, fmt.Errorf("scan review email candidate: %w", err)
		}
		result = append(result, c)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate review email candidates: %w", err)
	}

	return result, nil
}

func (r *EventReviewRepo) CreateRequest(ctx context.Context, req *models.EventReviewRequest) error {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO event_review_requests
			(event_id, user_id, client_id, token, client_name, client_email, expires_at)
		VALUES
			($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`,
		req.EventID,
		req.UserID,
		req.ClientID,
		req.Token,
		req.ClientName,
		req.ClientEmail,
		req.ExpiresAt,
	).Scan(&req.ID)
	if err != nil {
		return fmt.Errorf("create review request: %w", err)
	}

	stored, err := r.GetRequestByToken(ctx, req.Token)
	if err != nil {
		return fmt.Errorf("load created review request: %w", err)
	}

	*req = *stored
	return nil
}

func (r *EventReviewRepo) GetRequestByToken(ctx context.Context, token string) (*models.EventReviewRequest, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+reviewRequestFields+`
		FROM event_review_requests rr
		JOIN events e ON e.id = rr.event_id
		JOIN users u ON u.id = rr.user_id
		WHERE rr.token = $1`, token)

	req, err := scanReviewRequest(row)
	if err != nil {
		return nil, fmt.Errorf("get review request by token: %w", err)
	}

	return req, nil
}

func (r *EventReviewRepo) CreateReview(ctx context.Context, review *models.EventReview) error {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `
		INSERT INTO event_reviews
			(event_id, user_id, client_id, review_request_id, rating, comment, visibility)
		VALUES
			($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`,
		review.EventID,
		review.UserID,
		review.ClientID,
		review.ReviewRequestID,
		review.Rating,
		review.Comment,
		review.Visibility,
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("create review: %w", err)
	}

	stored, err := r.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("load created review: %w", err)
	}

	*review = *stored
	return nil
}

func (r *EventReviewRepo) MarkRequestSubmitted(ctx context.Context, requestID uuid.UUID, submittedAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE event_review_requests
		SET submitted_at = $2, updated_at = NOW()
		WHERE id = $1`, requestID, submittedAt)
	if err != nil {
		return fmt.Errorf("mark review request submitted: %w", err)
	}
	return nil
}

func (r *EventReviewRepo) ListByOrganizer(ctx context.Context, organizerID uuid.UUID) ([]*models.EventReview, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+reviewFields+`
		FROM event_reviews er
		LEFT JOIN clients c ON c.id = er.client_id
		LEFT JOIN events e ON e.id = er.event_id
		LEFT JOIN users u ON u.id = er.user_id
		WHERE er.user_id = $1
		ORDER BY er.submitted_at DESC
		LIMIT $2`, organizerID, GetAllSafetyLimit)
	if err != nil {
		return nil, fmt.Errorf("list reviews by organizer: %w", err)
	}
	defer rows.Close()

	result := make([]*models.EventReview, 0)
	for rows.Next() {
		review, scanErr := scanReview(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan organizer review: %w", scanErr)
		}
		result = append(result, review)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate organizer reviews: %w", err)
	}
	return result, nil
}

func (r *EventReviewRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.EventReview, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+reviewFields+`
		FROM event_reviews er
		LEFT JOIN clients c ON c.id = er.client_id
		LEFT JOIN events e ON e.id = er.event_id
		LEFT JOIN users u ON u.id = er.user_id
		WHERE er.id = $1`, id)

	review, err := scanReview(row)
	if err != nil {
		return nil, fmt.Errorf("get review by id: %w", err)
	}
	return review, nil
}

func (r *EventReviewRepo) UpdateOrganizerReply(ctx context.Context, reviewID uuid.UUID, response *string) (*models.EventReview, error) {
	now := time.Now().UTC()
	_, err := r.pool.Exec(ctx, `
		UPDATE event_reviews
		SET organizer_response = $2,
			responded_at = CASE WHEN $2 IS NULL OR $2 = '' THEN NULL ELSE $3 END,
			updated_at = NOW()
		WHERE id = $1`, reviewID, response, now)
	if err != nil {
		return nil, fmt.Errorf("update organizer review response: %w", err)
	}

	review, err := r.GetByID(ctx, reviewID)
	if err != nil {
		return nil, fmt.Errorf("load updated review response: %w", err)
	}

	return review, nil
}

func (r *EventReviewRepo) UpdateVisibility(ctx context.Context, reviewID uuid.UUID, visibility string) (*models.EventReview, error) {
	_, err := r.pool.Exec(ctx, `
		UPDATE event_reviews
		SET visibility = $2, updated_at = NOW()
		WHERE id = $1`, reviewID, visibility)
	if err != nil {
		return nil, fmt.Errorf("update review visibility: %w", err)
	}

	review, err := r.GetByID(ctx, reviewID)
	if err != nil {
		return nil, fmt.Errorf("load updated review visibility: %w", err)
	}

	return review, nil
}

func (r *EventReviewRepo) ListPublicByOrganizerSlug(ctx context.Context, slug string) ([]*models.EventReview, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+reviewFields+`
		FROM event_reviews er
		LEFT JOIN clients c ON c.id = er.client_id
		LEFT JOIN events e ON e.id = er.event_id
		LEFT JOIN users u ON u.id = er.user_id
		WHERE u.public_slug = $1
		  AND er.visibility = 'public'
		ORDER BY er.submitted_at DESC
		LIMIT $2`, slug, GetAllSafetyLimit)
	if err != nil {
		return nil, fmt.Errorf("list public reviews by slug: %w", err)
	}
	defer rows.Close()

	result := make([]*models.EventReview, 0)
	for rows.Next() {
		review, scanErr := scanReview(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan public review: %w", scanErr)
		}
		result = append(result, review)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public reviews: %w", err)
	}

	return result, nil
}
