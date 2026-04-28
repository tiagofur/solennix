package handlers

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/mock"
	"github.com/stripe/stripe-go/v81"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// ---------------------------------------------------------------------------
// MockFullUserRepo — implements FullUserRepository
// ---------------------------------------------------------------------------

type MockFullUserRepo struct {
	mock.Mock
}

func (m *MockFullUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) UpdatePlanAndStripeID(ctx context.Context, id uuid.UUID, plan string, stripeCustomerID *string) error {
	args := m.Called(ctx, id, plan, stripeCustomerID)
	return args.Error(0)
}

func (m *MockFullUserRepo) UpdatePlanByStripeCustomerID(ctx context.Context, stripeCustomerID string, plan string) error {
	args := m.Called(ctx, stripeCustomerID, plan)
	return args.Error(0)
}

func (m *MockFullUserRepo) GetByStripeCustomerID(ctx context.Context, stripeCustomerID string) (*models.User, error) {
	args := m.Called(ctx, stripeCustomerID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) Create(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockFullUserRepo) Update(ctx context.Context, id uuid.UUID, name, businessName, logoURL, brandColor *string, showBusinessNameInPdf *bool, depositPercent, cancellationDays, refundPercent *float64, contractTemplate *string, emailPaymentReceipt, emailEventReminder, emailSubscriptionUpdates, emailWeeklySummary, emailMarketing, pushEnabled, pushEventReminder, pushPaymentReceived *bool, preferredLanguage *string) (*models.User, error) {
	args := m.Called(ctx, id, name, businessName, logoURL, brandColor, showBusinessNameInPdf, depositPercent, cancellationDays, refundPercent, contractTemplate, emailPaymentReceipt, emailEventReminder, emailSubscriptionUpdates, emailWeeklySummary, emailMarketing, pushEnabled, pushEventReminder, pushPaymentReceived)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	args := m.Called(ctx, userID, passwordHash)
	return args.Error(0)
}

func (m *MockFullUserRepo) GetByGoogleUserID(ctx context.Context, googleUserID string) (*models.User, error) {
	args := m.Called(ctx, googleUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) GetByAppleUserID(ctx context.Context, appleUserID string) (*models.User, error) {
	args := m.Called(ctx, appleUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockFullUserRepo) CreateWithOAuth(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockFullUserRepo) LinkGoogleAccount(ctx context.Context, userID uuid.UUID, googleUserID string) error {
	args := m.Called(ctx, userID, googleUserID)
	return args.Error(0)
}

func (m *MockFullUserRepo) LinkAppleAccount(ctx context.Context, userID uuid.UUID, appleUserID string) error {
	args := m.Called(ctx, userID, appleUserID)
	return args.Error(0)
}

// ---------------------------------------------------------------------------
// MockFullEventRepo — implements FullEventRepository
// ---------------------------------------------------------------------------

type MockFullEventRepo struct {
	mock.Mock
}

func (m *MockFullEventRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Event), args.Error(1)
}

func (m *MockFullEventRepo) Update(ctx context.Context, e *models.Event) error {
	args := m.Called(ctx, e)
	return args.Error(0)
}

func (m *MockFullEventRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Event, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

func (m *MockFullEventRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Event, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Event), args.Int(1), args.Error(2)
}

func (m *MockFullEventRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Event, error) {
	args := m.Called(ctx, userID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

func (m *MockFullEventRepo) GetByClientID(ctx context.Context, userID, clientID uuid.UUID) ([]models.Event, error) {
	args := m.Called(ctx, userID, clientID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

func (m *MockFullEventRepo) GetUpcoming(ctx context.Context, userID uuid.UUID, limit int) ([]models.Event, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

func (m *MockFullEventRepo) CountCurrentMonth(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockFullEventRepo) Create(ctx context.Context, e *models.Event) error {
	args := m.Called(ctx, e)
	return args.Error(0)
}

func (m *MockFullEventRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockFullEventRepo) UpdateClientStats(ctx context.Context, clientID uuid.UUID) error {
	args := m.Called(ctx, clientID)
	return args.Error(0)
}

func (m *MockFullEventRepo) GetProducts(ctx context.Context, eventID uuid.UUID) ([]models.EventProduct, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventProduct), args.Error(1)
}

func (m *MockFullEventRepo) GetExtras(ctx context.Context, eventID uuid.UUID) ([]models.EventExtra, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventExtra), args.Error(1)
}

func (m *MockFullEventRepo) UpdateEventItems(ctx context.Context, eventID uuid.UUID, products []models.EventProduct, extras []models.EventExtra, equipment *[]models.EventEquipment, supplies *[]models.EventSupply, staff *[]models.EventStaff) error {
	args := m.Called(ctx, eventID, products, extras, equipment, supplies, staff)
	return args.Error(0)
}

func (m *MockFullEventRepo) GetStaff(ctx context.Context, eventID uuid.UUID) ([]models.EventStaff, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventStaff), args.Error(1)
}

func (m *MockFullEventRepo) GetStaffPendingNotifications(ctx context.Context, eventID uuid.UUID) ([]repository.StaffPendingNotification, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.StaffPendingNotification), args.Error(1)
}

func (m *MockFullEventRepo) MarkStaffNotificationResult(ctx context.Context, eventStaffID uuid.UUID, result string) error {
	args := m.Called(ctx, eventStaffID, result)
	return args.Error(0)
}

func (m *MockFullEventRepo) GetEquipment(ctx context.Context, eventID uuid.UUID) ([]models.EventEquipment, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventEquipment), args.Error(1)
}

func (m *MockFullEventRepo) CheckEquipmentConflicts(ctx context.Context, userID uuid.UUID, eventDate string, startTime, endTime *string, inventoryIDs []uuid.UUID, excludeEventID *uuid.UUID) ([]models.EquipmentConflict, error) {
	args := m.Called(ctx, userID, eventDate, startTime, endTime, inventoryIDs, excludeEventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EquipmentConflict), args.Error(1)
}

func (m *MockFullEventRepo) GetEquipmentSuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []repository.ProductQuantity) ([]models.EquipmentSuggestion, error) {
	args := m.Called(ctx, userID, products)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EquipmentSuggestion), args.Error(1)
}

func (m *MockFullEventRepo) GetSupplies(ctx context.Context, eventID uuid.UUID) ([]models.EventSupply, error) {
	args := m.Called(ctx, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventSupply), args.Error(1)
}

func (m *MockFullEventRepo) GetSupplySuggestionsFromProducts(ctx context.Context, userID uuid.UUID, products []repository.ProductQuantity) ([]models.SupplySuggestion, error) {
	args := m.Called(ctx, userID, products)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.SupplySuggestion), args.Error(1)
}

func (m *MockFullEventRepo) DeductSupplyStock(ctx context.Context, eventID uuid.UUID) error {
	args := m.Called(ctx, eventID)
	return args.Error(0)
}

func (m *MockFullEventRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Event, error) {
	args := m.Called(ctx, userID, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

func (m *MockFullEventRepo) SearchEventsAdvanced(ctx context.Context, userID uuid.UUID, filters repository.EventSearchFilters) ([]models.Event, error) {
	args := m.Called(ctx, userID, filters)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Event), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockClientRepo — implements ClientRepository
// ---------------------------------------------------------------------------

type MockClientRepo struct {
	mock.Mock
}

func (m *MockClientRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Client, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Client), args.Error(1)
}

func (m *MockClientRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Client, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Client), args.Int(1), args.Error(2)
}

func (m *MockClientRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Client, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Client), args.Error(1)
}

func (m *MockClientRepo) Create(ctx context.Context, c *models.Client) error {
	args := m.Called(ctx, c)
	return args.Error(0)
}

func (m *MockClientRepo) Update(ctx context.Context, c *models.Client) error {
	args := m.Called(ctx, c)
	return args.Error(0)
}

func (m *MockClientRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockClientRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockClientRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Client, error) {
	args := m.Called(ctx, userID, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Client), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockStaffRepo — implements StaffRepository (Personal/Colaboradores)
// ---------------------------------------------------------------------------

type MockStaffRepo struct {
	mock.Mock
}

func (m *MockStaffRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Staff, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Staff), args.Error(1)
}

func (m *MockStaffRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Staff, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Staff), args.Int(1), args.Error(2)
}

func (m *MockStaffRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Staff, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Staff), args.Error(1)
}

func (m *MockStaffRepo) Create(ctx context.Context, s *models.Staff) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockStaffRepo) Update(ctx context.Context, s *models.Staff) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockStaffRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockStaffRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockStaffRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Staff, error) {
	args := m.Called(ctx, userID, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Staff), args.Error(1)
}

func (m *MockStaffRepo) GetAvailability(ctx context.Context, userID uuid.UUID, start, end string) ([]repository.StaffAvailability, error) {
	args := m.Called(ctx, userID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.StaffAvailability), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockProductRepo — implements ProductRepository
// ---------------------------------------------------------------------------

type MockProductRepo struct {
	mock.Mock
}

func (m *MockProductRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Product, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Product), args.Error(1)
}

func (m *MockProductRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Product, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Product), args.Int(1), args.Error(2)
}

func (m *MockProductRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Product, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Product), args.Error(1)
}

func (m *MockProductRepo) Create(ctx context.Context, p *models.Product) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockProductRepo) Update(ctx context.Context, p *models.Product) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockProductRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockProductRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockProductRepo) GetIngredients(ctx context.Context, productID uuid.UUID) ([]models.ProductIngredient, error) {
	args := m.Called(ctx, productID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.ProductIngredient), args.Error(1)
}

func (m *MockProductRepo) UpdateIngredients(ctx context.Context, productID uuid.UUID, ingredients []models.ProductIngredient) error {
	args := m.Called(ctx, productID, ingredients)
	return args.Error(0)
}

func (m *MockProductRepo) GetIngredientsForProducts(ctx context.Context, productIDs []uuid.UUID) ([]models.ProductIngredient, error) {
	args := m.Called(ctx, productIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.ProductIngredient), args.Error(1)
}

func (m *MockProductRepo) VerifyOwnership(ctx context.Context, productIDs []uuid.UUID, userID uuid.UUID) error {
	args := m.Called(ctx, productIDs, userID)
	return args.Error(0)
}

func (m *MockProductRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Product, error) {
	args := m.Called(ctx, userID, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Product), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockInventoryRepo — implements InventoryRepository
// ---------------------------------------------------------------------------

type MockInventoryRepo struct {
	mock.Mock
}

func (m *MockInventoryRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.InventoryItem, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.InventoryItem, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.InventoryItem), args.Int(1), args.Error(2)
}

func (m *MockInventoryRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.InventoryItem, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepo) Create(ctx context.Context, i *models.InventoryItem) error {
	args := m.Called(ctx, i)
	return args.Error(0)
}

func (m *MockInventoryRepo) Update(ctx context.Context, i *models.InventoryItem) error {
	args := m.Called(ctx, i)
	return args.Error(0)
}

func (m *MockInventoryRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockInventoryRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockInventoryRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.InventoryItem, error) {
	args := m.Called(ctx, userID, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.InventoryItem), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockFullPaymentRepo — implements FullPaymentRepository
// ---------------------------------------------------------------------------

type MockFullPaymentRepo struct {
	mock.Mock
}

func (m *MockFullPaymentRepo) Create(ctx context.Context, p *models.Payment) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockFullPaymentRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Payment, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Payment), args.Error(1)
}

func (m *MockFullPaymentRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Payment, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Payment), args.Error(1)
}

func (m *MockFullPaymentRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Payment, int, error) {
	args := m.Called(ctx, userID, offset, limit, sortCol, order)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.Payment), args.Int(1), args.Error(2)
}

func (m *MockFullPaymentRepo) GetByEventID(ctx context.Context, userID, eventID uuid.UUID) ([]models.Payment, error) {
	args := m.Called(ctx, userID, eventID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Payment), args.Error(1)
}

func (m *MockFullPaymentRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Payment, error) {
	args := m.Called(ctx, userID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Payment), args.Error(1)
}

func (m *MockFullPaymentRepo) GetByEventIDs(ctx context.Context, userID uuid.UUID, eventIDs []uuid.UUID) ([]models.Payment, error) {
	args := m.Called(ctx, userID, eventIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Payment), args.Error(1)
}

func (m *MockFullPaymentRepo) Update(ctx context.Context, userID uuid.UUID, p *models.Payment) error {
	args := m.Called(ctx, userID, p)
	return args.Error(0)
}

func (m *MockFullPaymentRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

// ---------------------------------------------------------------------------
// MockAdminRepo — implements AdminRepository
// ---------------------------------------------------------------------------

type MockAdminRepo struct {
	mock.Mock
}

func (m *MockAdminRepo) GetPlatformStats(ctx context.Context) (*repository.PlatformStats, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.PlatformStats), args.Error(1)
}

func (m *MockAdminRepo) GetAllUsers(ctx context.Context) ([]repository.AdminUser, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.AdminUser), args.Error(1)
}

func (m *MockAdminRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*repository.AdminUser, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.AdminUser), args.Error(1)
}

func (m *MockAdminRepo) UpdateUserPlan(ctx context.Context, id uuid.UUID, plan string, expiresAt *time.Time) error {
	args := m.Called(ctx, id, plan, expiresAt)
	return args.Error(0)
}

func (m *MockAdminRepo) HasActiveSubscription(ctx context.Context, userID uuid.UUID) (bool, error) {
	args := m.Called(ctx, userID)
	return args.Bool(0), args.Error(1)
}

func (m *MockAdminRepo) GetSubscriptionOverview(ctx context.Context) (*repository.SubscriptionOverview, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.SubscriptionOverview), args.Error(1)
}

func (m *MockAdminRepo) ExpireGiftedPlans(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockUnavailableDateRepo — implements UnavailableDateRepository
// ---------------------------------------------------------------------------

type MockUnavailableDateRepo struct {
	mock.Mock
}

func (m *MockUnavailableDateRepo) Create(ctx context.Context, u *models.UnavailableDate) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUnavailableDateRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.UnavailableDate, error) {
	args := m.Called(ctx, userID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.UnavailableDate), args.Error(1)
}

func (m *MockUnavailableDateRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

// ---------------------------------------------------------------------------
// MockStripeService — implements StripeService
// ---------------------------------------------------------------------------

type MockStripeService struct {
	mock.Mock
}

func (m *MockStripeService) NewCheckoutSession(params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*stripe.CheckoutSession), args.Error(1)
}

func (m *MockStripeService) GetCheckoutSession(id string, params *stripe.CheckoutSessionParams) (*stripe.CheckoutSession, error) {
	args := m.Called(id, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*stripe.CheckoutSession), args.Error(1)
}

func (m *MockStripeService) NewBillingPortalSession(params *stripe.BillingPortalSessionParams) (*stripe.BillingPortalSession, error) {
	args := m.Called(params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*stripe.BillingPortalSession), args.Error(1)
}

func (m *MockStripeService) GetSubscription(id string, params *stripe.SubscriptionParams) (*stripe.Subscription, error) {
	args := m.Called(id, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*stripe.Subscription), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockAuditRepo — implements AuditRepository
// ---------------------------------------------------------------------------

type MockAuditRepo struct {
	mock.Mock
}

func (m *MockAuditRepo) Create(ctx context.Context, log *models.AuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockAuditRepo) GetByUser(ctx context.Context, userID uuid.UUID, offset, limit int) ([]models.AuditLog, int, error) {
	args := m.Called(ctx, userID, offset, limit)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.AuditLog), args.Int(1), args.Error(2)
}

func (m *MockAuditRepo) GetByResource(ctx context.Context, userID uuid.UUID, resourceType string, resourceID uuid.UUID) ([]models.AuditLog, error) {
	args := m.Called(ctx, userID, resourceType, resourceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.AuditLog), args.Error(1)
}

func (m *MockAuditRepo) GetAll(ctx context.Context, offset, limit int) ([]models.AuditLog, int, error) {
	args := m.Called(ctx, offset, limit)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.AuditLog), args.Int(1), args.Error(2)
}

// ---------------------------------------------------------------------------
// MockDashboardRepo — implements DashboardRepository
// ---------------------------------------------------------------------------

type MockDashboardRepo struct {
	mock.Mock
}

func (m *MockDashboardRepo) GetKPIs(ctx context.Context, userID uuid.UUID) (*repository.DashboardKPIs, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.DashboardKPIs), args.Error(1)
}

func (m *MockDashboardRepo) GetRevenueChart(ctx context.Context, userID uuid.UUID, period string) ([]repository.RevenueDataPoint, error) {
	args := m.Called(ctx, userID, period)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.RevenueDataPoint), args.Error(1)
}

func (m *MockDashboardRepo) GetEventsByStatus(ctx context.Context, userID uuid.UUID, scope string) ([]repository.EventStatusCount, error) {
	args := m.Called(ctx, userID, scope)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.EventStatusCount), args.Error(1)
}

func (m *MockDashboardRepo) GetTopClients(ctx context.Context, userID uuid.UUID, limit int) ([]repository.TopClient, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.TopClient), args.Error(1)
}

func (m *MockDashboardRepo) GetProductDemand(ctx context.Context, userID uuid.UUID) ([]repository.ProductDemandItem, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.ProductDemandItem), args.Error(1)
}

func (m *MockDashboardRepo) GetForecast(ctx context.Context, userID uuid.UUID) ([]repository.ForecastDataPoint, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.ForecastDataPoint), args.Error(1)
}

// ---------------------------------------------------------------------------
// MockRefreshTokenRepo — implements RefreshTokenRepository
// ---------------------------------------------------------------------------

type MockRefreshTokenRepo struct {
	mock.Mock
}

func (m *MockRefreshTokenRepo) Store(ctx context.Context, userID, familyID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	args := m.Called(ctx, userID, familyID, tokenHash, expiresAt)
	return args.Error(0)
}

func (m *MockRefreshTokenRepo) Consume(ctx context.Context, tokenHash string) (uuid.UUID, uuid.UUID, error) {
	args := m.Called(ctx, tokenHash)
	return args.Get(0).(uuid.UUID), args.Get(1).(uuid.UUID), args.Error(2)
}

func (m *MockRefreshTokenRepo) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	args := m.Called(ctx, familyID)
	return args.Error(0)
}

func (m *MockRefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

// ---------------------------------------------------------------------------
// MockEventFormLinkRepo — implements EventFormLinkRepository
// ---------------------------------------------------------------------------

type MockEventFormLinkRepo struct {
	mock.Mock
}

func (m *MockEventFormLinkRepo) Create(ctx context.Context, link *models.EventFormLink) error {
	args := m.Called(ctx, link)
	return args.Error(0)
}

func (m *MockEventFormLinkRepo) GetByToken(ctx context.Context, token string) (*models.EventFormLink, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.EventFormLink), args.Error(1)
}

func (m *MockEventFormLinkRepo) GetByTokenUnfiltered(ctx context.Context, token string) (*models.EventFormLink, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.EventFormLink), args.Error(1)
}

func (m *MockEventFormLinkRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.EventFormLink, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.EventFormLink), args.Error(1)
}

func (m *MockEventFormLinkRepo) MarkUsedTx(ctx context.Context, tx pgx.Tx, linkID, eventID, clientID uuid.UUID) error {
	args := m.Called(ctx, tx, linkID, eventID, clientID)
	return args.Error(0)
}

func (m *MockEventFormLinkRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockEventFormLinkRepo) CountActiveByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockEventFormLinkRepo) GetPool() *pgxpool.Pool {
	args := m.Called()
	if args.Get(0) == nil {
		return nil
	}
	return args.Get(0).(*pgxpool.Pool)
}

// ---------------------------------------------------------------------------
// MockEventPublicLinkRepo — implements EventPublicLinkRepository
// ---------------------------------------------------------------------------

type MockEventPublicLinkRepo struct {
	mock.Mock
}

func (m *MockEventPublicLinkRepo) Create(ctx context.Context, link *models.EventPublicLink) error {
	args := m.Called(ctx, link)
	return args.Error(0)
}

func (m *MockEventPublicLinkRepo) GetActiveByEventID(ctx context.Context, eventID, userID uuid.UUID) (*models.EventPublicLink, error) {
	args := m.Called(ctx, eventID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.EventPublicLink), args.Error(1)
}

func (m *MockEventPublicLinkRepo) GetByToken(ctx context.Context, token string) (*models.EventPublicLink, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.EventPublicLink), args.Error(1)
}

func (m *MockEventPublicLinkRepo) Revoke(ctx context.Context, eventID, userID uuid.UUID) error {
	args := m.Called(ctx, eventID, userID)
	return args.Error(0)
}

// ---------------------------------------------------------------------------
// MockStaffTeamRepo — implements StaffTeamRepository
// ---------------------------------------------------------------------------

type MockStaffTeamRepo struct {
	mock.Mock
}

func (m *MockStaffTeamRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.StaffTeam, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.StaffTeam), args.Error(1)
}

func (m *MockStaffTeamRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.StaffTeam, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.StaffTeam), args.Error(1)
}

func (m *MockStaffTeamRepo) Create(ctx context.Context, t *models.StaffTeam) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockStaffTeamRepo) Update(ctx context.Context, t *models.StaffTeam) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockStaffTeamRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockStaffTeamRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}
