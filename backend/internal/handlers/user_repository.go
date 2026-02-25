package handlers

import (
	"context"

	"github.com/google/uuid"
	"github.com/tiagofur/eventosapp-backend/internal/models"
)

// UserRepository defines the interface for user repository operations.
// This interface allows us to use mocks in tests while using the real repository in production.
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	UpdatePlanAndStripeID(ctx context.Context, id uuid.UUID, plan string, stripeCustomerID *string) error
	UpdatePlanByStripeCustomerID(ctx context.Context, stripeCustomerID string, plan string) error
}
