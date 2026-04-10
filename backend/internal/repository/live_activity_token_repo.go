package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// LiveActivityTokenRepo persists iOS Live Activity push tokens bound to events.
type LiveActivityTokenRepo struct {
	pool *pgxpool.Pool
}

func NewLiveActivityTokenRepo(pool *pgxpool.Pool) *LiveActivityTokenRepo {
	return &LiveActivityTokenRepo{pool: pool}
}

// Register upserts a (event_id, push_token) pair for a user.
func (r *LiveActivityTokenRepo) Register(ctx context.Context, userID, eventID uuid.UUID, pushToken string) (*models.LiveActivityToken, error) {
	query := `
		INSERT INTO live_activity_tokens (user_id, event_id, push_token)
		VALUES ($1, $2, $3)
		ON CONFLICT (event_id, push_token) DO UPDATE SET
			user_id = EXCLUDED.user_id,
			created_at = NOW()
		RETURNING id, user_id, event_id, push_token, created_at, expires_at`

	t := &models.LiveActivityToken{}
	err := r.pool.QueryRow(ctx, query, userID, eventID, pushToken).Scan(
		&t.ID, &t.UserID, &t.EventID, &t.PushToken, &t.CreatedAt, &t.ExpiresAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register live activity token: %w", err)
	}
	return t, nil
}

// GetByEventID returns all live activity tokens registered for an event.
// Used by the service to broadcast updates.
func (r *LiveActivityTokenRepo) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]models.LiveActivityToken, error) {
	query := `
		SELECT id, user_id, event_id, push_token, created_at, expires_at
		FROM live_activity_tokens
		WHERE event_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("failed to get live activity tokens: %w", err)
	}
	defer rows.Close()

	tokens := make([]models.LiveActivityToken, 0)
	for rows.Next() {
		var t models.LiveActivityToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.EventID, &t.PushToken, &t.CreatedAt, &t.ExpiresAt); err != nil {
			return nil, fmt.Errorf("failed to scan live activity token: %w", err)
		}
		tokens = append(tokens, t)
	}
	return tokens, nil
}

// DeleteByEventID removes all tokens for an event (called when activity ends or event is deleted).
// Scoped by user to prevent cross-tenant deletion.
func (r *LiveActivityTokenRepo) DeleteByEventID(ctx context.Context, userID, eventID uuid.UUID) error {
	query := `DELETE FROM live_activity_tokens WHERE user_id = $1 AND event_id = $2`
	_, err := r.pool.Exec(ctx, query, userID, eventID)
	if err != nil {
		return fmt.Errorf("failed to delete live activity tokens: %w", err)
	}
	return nil
}

// DeleteByToken removes a specific push token (used when APNs reports the token expired).
func (r *LiveActivityTokenRepo) DeleteByToken(ctx context.Context, pushToken string) error {
	query := `DELETE FROM live_activity_tokens WHERE push_token = $1`
	_, err := r.pool.Exec(ctx, query, pushToken)
	if err != nil {
		return fmt.Errorf("failed to delete live activity token: %w", err)
	}
	return nil
}
