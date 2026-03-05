package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type SubscriptionRepo struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepo(pool *pgxpool.Pool) *SubscriptionRepo {
	return &SubscriptionRepo{pool: pool}
}

// Upsert inserts or updates a subscription record keyed on (user_id, provider).
func (r *SubscriptionRepo) Upsert(ctx context.Context, sub *models.Subscription) error {
	query := `
		INSERT INTO subscriptions (user_id, provider, provider_subscription_id, plan, status, current_period_start, current_period_end)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (user_id, provider)
		DO UPDATE SET
			provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id),
			plan = EXCLUDED.plan,
			status = EXCLUDED.status,
			current_period_start = COALESCE(EXCLUDED.current_period_start, subscriptions.current_period_start),
			current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
			updated_at = NOW()
		RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		sub.UserID, sub.Provider, sub.ProviderSubID, sub.Plan, sub.Status,
		sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
	).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
}

// GetByUserID returns the active subscription for a user (prefers stripe, then apple/google).
func (r *SubscriptionRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Subscription, error) {
	sub := &models.Subscription{}
	query := `
		SELECT id, user_id, provider, provider_subscription_id, plan, status,
			current_period_start, current_period_end, created_at, updated_at
		FROM subscriptions
		WHERE user_id = $1
		ORDER BY
			CASE provider WHEN 'stripe' THEN 1 WHEN 'apple' THEN 2 WHEN 'google' THEN 3 ELSE 4 END,
			updated_at DESC
		LIMIT 1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&sub.ID, &sub.UserID, &sub.Provider, &sub.ProviderSubID, &sub.Plan, &sub.Status,
		&sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("subscription not found: %w", err)
	}
	return sub, nil
}

// UpdateStatusByProviderSubID updates subscription status and period dates by provider subscription ID.
func (r *SubscriptionRepo) UpdateStatusByProviderSubID(ctx context.Context, providerSubID string, status string, periodStart, periodEnd *time.Time) error {
	query := `
		UPDATE subscriptions SET
			status = $2,
			current_period_start = COALESCE($3, current_period_start),
			current_period_end = COALESCE($4, current_period_end),
			updated_at = NOW()
		WHERE provider_subscription_id = $1`
	tag, err := r.pool.Exec(ctx, query, providerSubID, status, periodStart, periodEnd)
	if err != nil {
		return fmt.Errorf("failed to update subscription by provider sub id: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("no subscription found with provider_subscription_id: %s", providerSubID)
	}
	return nil
}

// UpdateStatusByUserID updates subscription status for a user (all providers).
func (r *SubscriptionRepo) UpdateStatusByUserID(ctx context.Context, userID uuid.UUID, status string) error {
	query := `
		UPDATE subscriptions SET
			status = $2,
			updated_at = NOW()
		WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID, status)
	return err
}
