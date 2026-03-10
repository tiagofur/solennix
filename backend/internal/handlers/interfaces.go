package handlers

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// FullUserRepository is the complete interface for user repo operations used across handlers.
type FullUserRepository interface {
	UserRepository // existing: GetByID, UpdatePlanAndStripeID, UpdatePlanByStripeCustomerID
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, id uuid.UUID, name, businessName, logoURL, brandColor *string, showBusinessNameInPdf *bool, depositPercent, cancellationDays, refundPercent *float64, contractTemplate *string) (*models.User, error)
	UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error
}

// FullEventRepository is the complete interface for event repo operations.
type FullEventRepository interface {
	EventRepository // existing: GetByID(id, userID), Update
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.Event, error)
	GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Event, error)
	GetByClientID(ctx context.Context, userID, clientID uuid.UUID) ([]models.Event, error)
	GetUpcoming(ctx context.Context, userID uuid.UUID, limit int) ([]models.Event, error)
	CountCurrentMonth(ctx context.Context, userID uuid.UUID) (int, error)
	Create(ctx context.Context, e *models.Event) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	UpdateClientStats(ctx context.Context, clientID uuid.UUID) error
	GetProducts(ctx context.Context, eventID uuid.UUID) ([]models.EventProduct, error)
	GetExtras(ctx context.Context, eventID uuid.UUID) ([]models.EventExtra, error)
	UpdateEventItems(ctx context.Context, eventID uuid.UUID, products []models.EventProduct, extras []models.EventExtra, equipment *[]models.EventEquipment, supplies *[]models.EventSupply) error
	GetEquipment(ctx context.Context, eventID uuid.UUID) ([]models.EventEquipment, error)
	CheckEquipmentConflicts(ctx context.Context, userID uuid.UUID, eventDate string, startTime, endTime *string, inventoryIDs []uuid.UUID, excludeEventID *uuid.UUID) ([]models.EquipmentConflict, error)
	GetEquipmentSuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []repository.ProductQuantity) ([]models.EquipmentSuggestion, error)
	GetSupplies(ctx context.Context, eventID uuid.UUID) ([]models.EventSupply, error)
	GetSupplySuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []repository.ProductQuantity) ([]models.SupplySuggestion, error)
	DeductSupplyStock(ctx context.Context, eventID uuid.UUID) error
	Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Event, error)
}

// ClientRepository defines client repo operations.
type ClientRepository interface {
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.Client, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Client, error)
	Create(ctx context.Context, c *models.Client) error
	Update(ctx context.Context, c *models.Client) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Client, error)
}

// ProductRepository defines product repo operations.
type ProductRepository interface {
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Product, error)
	Create(ctx context.Context, p *models.Product) error
	Update(ctx context.Context, p *models.Product) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	GetIngredients(ctx context.Context, productID uuid.UUID) ([]models.ProductIngredient, error)
	UpdateIngredients(ctx context.Context, productID uuid.UUID, ingredients []models.ProductIngredient) error
	GetIngredientsForProducts(ctx context.Context, productIDs []uuid.UUID) ([]models.ProductIngredient, error)
	VerifyOwnership(ctx context.Context, productIDs []uuid.UUID, userID uuid.UUID) error
	Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Product, error)
}

// InventoryRepository defines inventory repo operations.
type InventoryRepository interface {
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.InventoryItem, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.InventoryItem, error)
	Create(ctx context.Context, i *models.InventoryItem) error
	Update(ctx context.Context, i *models.InventoryItem) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
	CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	Search(ctx context.Context, userID uuid.UUID, query string) ([]models.InventoryItem, error)
}

// UnavailableDateRepository defines unavailable date repo operations.
type UnavailableDateRepository interface {
	Create(ctx context.Context, u *models.UnavailableDate) error
	GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.UnavailableDate, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

// FullPaymentRepository is the complete interface for payment repo operations.
type FullPaymentRepository interface {
	PaymentRepository // existing: Create
	GetAll(ctx context.Context, userID uuid.UUID) ([]models.Payment, error)
	GetByEventID(ctx context.Context, userID, eventID uuid.UUID) ([]models.Payment, error)
	GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Payment, error)
	GetByEventIDs(ctx context.Context, userID uuid.UUID, eventIDs []uuid.UUID) ([]models.Payment, error)
	Update(ctx context.Context, userID uuid.UUID, p *models.Payment) error
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

// AdminRepository defines admin repo operations.
type AdminRepository interface {
	GetPlatformStats(ctx context.Context) (*repository.PlatformStats, error)
	GetAllUsers(ctx context.Context) ([]repository.AdminUser, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*repository.AdminUser, error)
	UpdateUserPlan(ctx context.Context, id uuid.UUID, plan string, expiresAt *time.Time) error
	HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error)
	GetSubscriptionOverview(ctx context.Context) (*repository.SubscriptionOverview, error)
	ExpireGiftedPlans(ctx context.Context) (int, error)
}

// StripeService defines the subset of Stripe operations used by handlers.
// This allows mocking for testing.
type StripeService interface {
	NewCheckoutSession(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error)
	GetCheckoutSession(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error)
	NewBillingPortalSession(params *stripe.BillingPortalSessionParams) (*stripe.BillingPortalSession, error)
	GetSubscription(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error)
}
