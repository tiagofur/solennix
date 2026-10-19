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

// Delete releases an idempotency claim, typically because applying the event
// failed and the provider must be allowed to retry it. Deleting a key that
// was never claimed is a no-op success.
func (r *ProcessedWebhookRepo) Delete(ctx context.Context, eventID string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM processed_webhook_events WHERE event_id = $1`,
		eventID)
	if err != nil {
		return fmt.Errorf("processed_webhook_repo: Delete: %w", err)
	}
	return nil
}
