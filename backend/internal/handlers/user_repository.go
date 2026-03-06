package handlers

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// UserRepository defines the interface for user repository operations.
// This interface allows us to use mocks in tests while using the real repository in production.
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	UpdatePlanAndStripeID(ctx context.Context, id uuid.UUID, plan string, stripeCustomerID *string) error
	UpdatePlanByStripeCustomerID(ctx context.Context, stripeCustomerID string, plan string) error
}

// SubscriptionRepository defines the interface for subscription data access.
type SubscriptionRepository interface {
	Upsert(ctx context.Context, sub *models.Subscription) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Subscription, error)
	UpdateStatusByProviderSubID(ctx context.Context, providerSubID string, status string, periodStart, periodEnd *time.Time) error
	UpdateStatusByUserID(ctx context.Context, userID uuid.UUID, status string) error
}

// EventRepository defines methods for event data access (used by SubscriptionHandler).
type EventRepository interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error)
	Update(ctx context.Context, e *models.Event) error
}

// PaymentRepository defines methods for payment data access (used by SubscriptionHandler).
type PaymentRepository interface {
	Create(ctx context.Context, p *models.Payment) error
}
