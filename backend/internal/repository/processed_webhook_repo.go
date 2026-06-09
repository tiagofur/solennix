package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ProcessedWebhookRepo tracks webhook events that have already been processed
// to provide idempotency guarantees.
type ProcessedWebhookRepo struct {
	pool *pgxpool.Pool
}

func NewProcessedWebhookRepo(pool *pgxpool.Pool) *ProcessedWebhookRepo {
	return &ProcessedWebhookRepo{pool: pool}
}

// TryInsert attempts to record a webhook event as processed.
// Returns (true, nil) on first insert, (false, nil) if already processed, or (false, err) on error.
func (r *ProcessedWebhookRepo) TryInsert(ctx context.Context, eventID, provider, eventType string) (bool, error) {
	tag, err := r.pool.Exec(ctx,
		`INSERT INTO processed_webhook_events (event_id, provider, event_type)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (event_id) DO NOTHING`,
		eventID, provider, eventType)
	if err != nil {
		return false, fmt.Errorf("processed_webhook_repo: TryInsert: %w", err)
	}
	return tag.RowsAffected() > 0, nil
}
