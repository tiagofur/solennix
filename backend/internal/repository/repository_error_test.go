package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func closedPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()
	return pool
}

func TestRepositoryMethodsWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	ctx := context.Background()
	userID := uuid.New()
	id := uuid.New()

	if _, err := NewClientRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("ClientRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewClientRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("ClientRepo.GetByID() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("ClientRepo.Delete() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Update(ctx, &models.Client{ID: id, UserID: userID, Name: "x", Phone: "1"}); err == nil {
		t.Fatalf("ClientRepo.Update() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetProducts(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetProducts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetExtras(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetExtras() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("EventRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByDateRange(ctx, userID, "2026-01-01", "2026-12-31"); err == nil {
		t.Fatalf("EventRepo.GetByDateRange() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByClientID(ctx, userID, id); err == nil {
		t.Fatalf("EventRepo.GetByClientID() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("EventRepo.GetByID() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetUpcoming(ctx, userID, 5); err == nil {
		t.Fatalf("EventRepo.GetUpcoming() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("EventRepo.Delete() expected error with closed pool")
	}
	if err := NewEventRepo(pool).UpdateEventItems(ctx, id, nil, nil, nil, nil); err == nil {
		t.Fatalf("EventRepo.UpdateEventItems() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("InventoryRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("InventoryRepo.GetByID() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("InventoryRepo.Delete() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByEventID(ctx, userID, id); err == nil {
		t.Fatalf("PaymentRepo.GetByEventID() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByDateRange(ctx, userID, "2026-01-01", "2026-12-31"); err == nil {
		t.Fatalf("PaymentRepo.GetByDateRange() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByEventIDs(ctx, userID, []uuid.UUID{id}); err == nil {
		t.Fatalf("PaymentRepo.GetByEventIDs() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Update(ctx, userID, &models.Payment{ID: id, Amount: 10, PaymentDate: "2026-01-01", PaymentMethod: "cash"}); err == nil {
		t.Fatalf("PaymentRepo.Update() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("PaymentRepo.Delete() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetIngredients(ctx, id); err == nil {
		t.Fatalf("ProductRepo.GetIngredients() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("ProductRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("ProductRepo.GetByID() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("ProductRepo.Delete() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetIngredientsForProducts(ctx, []uuid.UUID{id}); err == nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts() expected error with closed pool")
	}
	if err := NewProductRepo(pool).UpdateIngredients(ctx, id, []models.ProductIngredient{{InventoryID: id, QuantityRequired: 1}}); err == nil {
		t.Fatalf("ProductRepo.UpdateIngredients() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByEmail(ctx, "x@test.dev"); err == nil {
		t.Fatalf("UserRepo.GetByEmail() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByID(ctx, id); err == nil {
		t.Fatalf("UserRepo.GetByID() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).Update(context.Background(), uuid.New(), nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatalf("UserRepo.Update() expected error with closed pool")
	}

	// --- ClientRepo: CountByUserID, Create, Search ---
	if _, err := NewClientRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("ClientRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Create(ctx, &models.Client{UserID: userID, Name: "x", Phone: "1"}); err == nil {
		t.Fatalf("ClientRepo.Create() expected error with closed pool")
	}
	if _, err := NewClientRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("ClientRepo.Search() expected error with closed pool")
	}

	// --- EventRepo: CountCurrentMonth, Create, Update, UpdateClientStats, GetEquipment,
	//     CheckEquipmentConflicts, GetEquipmentSuggestionsFromProducts, Search ---
	if _, err := NewEventRepo(pool).CountCurrentMonth(ctx, userID); err == nil {
		t.Fatalf("EventRepo.CountCurrentMonth() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Create(ctx, &models.Event{UserID: userID, ClientID: id, EventDate: "2026-01-01", ServiceType: "catering", Status: "quoted"}); err == nil {
		t.Fatalf("EventRepo.Create() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Update(ctx, &models.Event{ID: id, UserID: userID, ClientID: id, EventDate: "2026-01-01", ServiceType: "catering", Status: "quoted"}); err == nil {
		t.Fatalf("EventRepo.Update() expected error with closed pool")
	}
	if err := NewEventRepo(pool).UpdateClientStats(ctx, id); err == nil {
		t.Fatalf("EventRepo.UpdateClientStats() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetEquipment(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetEquipment() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).CheckEquipmentConflicts(ctx, userID, "2026-01-01", nil, nil, []uuid.UUID{id}, nil); err == nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetEquipmentSuggestionsFromProducts(ctx, userID, []ProductQuantity{{ID: id, Quantity: 1}}); err == nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("EventRepo.Search() expected error with closed pool")
	}

	// --- InventoryRepo: CountByUserID, Create, Update, Search ---
	if _, err := NewInventoryRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("InventoryRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Create(ctx, &models.InventoryItem{UserID: userID, IngredientName: "x", Unit: "kg", Type: "ingredient"}); err == nil {
		t.Fatalf("InventoryRepo.Create() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Update(ctx, &models.InventoryItem{ID: id, UserID: userID, IngredientName: "x", Unit: "kg", Type: "ingredient"}); err == nil {
		t.Fatalf("InventoryRepo.Update() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("InventoryRepo.Search() expected error with closed pool")
	}

	// --- PaymentRepo: GetAll, Create ---
	if _, err := NewPaymentRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("PaymentRepo.GetAll() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Create(ctx, &models.Payment{EventID: id, UserID: userID, Amount: 10, PaymentDate: "2026-01-01", PaymentMethod: "cash"}); err == nil {
		t.Fatalf("PaymentRepo.Create() expected error with closed pool")
	}

	// --- ProductRepo: CountByUserID, Create, Update, VerifyOwnership, Search ---
	if _, err := NewProductRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("ProductRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Create(ctx, &models.Product{UserID: userID, Name: "x", Category: "cat", BasePrice: 10}); err == nil {
		t.Fatalf("ProductRepo.Create() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Update(ctx, &models.Product{ID: id, UserID: userID, Name: "x", Category: "cat", BasePrice: 10}); err == nil {
		t.Fatalf("ProductRepo.Update() expected error with closed pool")
	}
	if err := NewProductRepo(pool).VerifyOwnership(ctx, []uuid.UUID{id}, userID); err == nil {
		t.Fatalf("ProductRepo.VerifyOwnership() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("ProductRepo.Search() expected error with closed pool")
	}

	// --- UserRepo: Create, UpdatePlanAndStripeID, UpdatePlanByStripeCustomerID, UpdatePassword ---
	if err := NewUserRepo(pool).Create(ctx, &models.User{Email: "x@test.dev", PasswordHash: "hash", Name: "x", Plan: "basic"}); err == nil {
		t.Fatalf("UserRepo.Create() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePlanAndStripeID(ctx, id, "pro", nil); err == nil {
		t.Fatalf("UserRepo.UpdatePlanAndStripeID() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePlanByStripeCustomerID(ctx, "cus_test", "basic"); err == nil {
		t.Fatalf("UserRepo.UpdatePlanByStripeCustomerID() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePassword(ctx, id, "newhash"); err == nil {
		t.Fatalf("UserRepo.UpdatePassword() expected error with closed pool")
	}

	// --- UserRepo: GetByGoogleUserID, GetByAppleUserID, CreateWithOAuth, LinkGoogleAccount, LinkAppleAccount, GetByStripeCustomerID ---
	if _, err := NewUserRepo(pool).GetByGoogleUserID(ctx, "google-uid-123"); err == nil {
		t.Fatalf("UserRepo.GetByGoogleUserID() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByAppleUserID(ctx, "apple-uid-123"); err == nil {
		t.Fatalf("UserRepo.GetByAppleUserID() expected error with closed pool")
	}
	if err := NewUserRepo(pool).CreateWithOAuth(ctx, &models.User{Email: "oauth@test.dev", Name: "OAuth User"}); err == nil {
		t.Fatalf("UserRepo.CreateWithOAuth() expected error with closed pool")
	}
	if err := NewUserRepo(pool).LinkGoogleAccount(ctx, id, "google-uid-123"); err == nil {
		t.Fatalf("UserRepo.LinkGoogleAccount() expected error with closed pool")
	}
	if err := NewUserRepo(pool).LinkAppleAccount(ctx, id, "apple-uid-123"); err == nil {
		t.Fatalf("UserRepo.LinkAppleAccount() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByStripeCustomerID(ctx, "cus_test123"); err == nil {
		t.Fatalf("UserRepo.GetByStripeCustomerID() expected error with closed pool")
	}

	// --- EventRepo: GetSupplies, GetSupplySuggestionsFromProducts, DeductSupplyStock ---
	if _, err := NewEventRepo(pool).GetSupplies(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetSupplies() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetSupplySuggestionsFromProducts(ctx, userID, []ProductQuantity{{ID: id, Quantity: 1}}); err == nil {
		t.Fatalf("EventRepo.GetSupplySuggestionsFromProducts() expected error with closed pool")
	}
	if err := NewEventRepo(pool).DeductSupplyStock(ctx, id); err == nil {
		t.Fatalf("EventRepo.DeductSupplyStock() expected error with closed pool")
	}
}

func TestAdminRepoWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	ctx := context.Background()
	id := uuid.New()

	repo := NewAdminRepo(pool)

	if _, err := repo.GetPlatformStats(ctx); err == nil {
		t.Fatal("AdminRepo.GetPlatformStats() expected error with closed pool")
	}
	if _, err := repo.GetAllUsers(ctx); err == nil {
		t.Fatal("AdminRepo.GetAllUsers() expected error with closed pool")
	}
	if _, err := repo.GetUserByID(ctx, id); err == nil {
		t.Fatal("AdminRepo.GetUserByID() expected error with closed pool")
	}
	if err := repo.UpdateUserPlan(ctx, id, "pro", nil); err == nil {
		t.Fatal("AdminRepo.UpdateUserPlan() expected error with closed pool")
	}
	if _, err := repo.HasActiveSubscription(ctx, id); err == nil {
		t.Fatal("AdminRepo.HasActiveSubscription() expected error with closed pool")
	}
	if _, err := repo.GetSubscriptionOverview(ctx); err == nil {
		t.Fatal("AdminRepo.GetSubscriptionOverview() expected error with closed pool")
	}
	if _, err := repo.ExpireGiftedPlans(ctx); err == nil {
		t.Fatal("AdminRepo.ExpireGiftedPlans() expected error with closed pool")
	}
}

func TestSubscriptionRepoWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	ctx := context.Background()
	userID := uuid.New()

	repo := NewSubscriptionRepo(pool)

	if err := repo.Upsert(ctx, &models.Subscription{UserID: userID, Provider: "stripe", Plan: "pro", Status: "active"}); err == nil {
		t.Fatal("SubscriptionRepo.Upsert() expected error with closed pool")
	}
	if _, err := repo.GetByUserID(ctx, userID); err == nil {
		t.Fatal("SubscriptionRepo.GetByUserID() expected error with closed pool")
	}
	if err := repo.UpdateStatusByProviderSubID(ctx, "sub_test", "active", nil, nil); err == nil {
		t.Fatal("SubscriptionRepo.UpdateStatusByProviderSubID() expected error with closed pool")
	}
	if err := repo.UpdateStatusByUserID(ctx, userID, "canceled"); err == nil {
		t.Fatal("SubscriptionRepo.UpdateStatusByUserID() expected error with closed pool")
	}
}

func TestDeviceRepoWithClosedPool(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	userID := uuid.New()

	repo := NewDeviceRepo(pool)

	if _, err := repo.Register(ctx, userID, "device-token-abc", "ios"); err == nil {
		t.Fatal("DeviceRepo.Register() expected error with closed pool")
	}
	if err := repo.Unregister(ctx, userID, "device-token-abc"); err == nil {
		t.Fatal("DeviceRepo.Unregister() expected error with closed pool")
	}
	if _, err := repo.GetByUserID(ctx, userID); err == nil {
		t.Fatal("DeviceRepo.GetByUserID() expected error with closed pool")
	}
	if err := repo.UnregisterAllForUser(ctx, userID); err == nil {
		t.Fatal("DeviceRepo.UnregisterAllForUser() expected error with closed pool")
	}
}

// TestUpdateEventItemsWithSupplies tests UpdateEventItems with supplies slice provided.
func TestUpdateEventItemsWithSupplies(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	eventID := uuid.New()
	invID := uuid.New()

	repo := NewEventRepo(pool)

	// With non-nil supplies list (stock source)
	supplies := []models.EventSupply{{InventoryID: invID, Quantity: 5, UnitCost: 2.5, Source: "stock"}}
	if err := repo.UpdateEventItems(ctx, eventID, nil, nil, nil, &supplies); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(with supplies) expected error with closed pool")
	}

	// With purchase source (tests the exclude_cost override branch)
	purchaseSupplies := []models.EventSupply{{InventoryID: invID, Quantity: 3, UnitCost: 5.0, Source: "purchase", ExcludeCost: true}}
	if err := repo.UpdateEventItems(ctx, eventID, nil, nil, nil, &purchaseSupplies); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(purchase supplies) expected error with closed pool")
	}

	// With all four item types populated
	products := []models.EventProduct{{ProductID: uuid.New(), Quantity: 1, UnitPrice: 50}}
	extras := []models.EventExtra{{Description: "Balloons", Cost: 10, Price: 20}}
	equipment := []models.EventEquipment{{InventoryID: uuid.New(), Quantity: 2}}
	allSupplies := []models.EventSupply{{InventoryID: invID, Quantity: 10, UnitCost: 1.0, Source: "stock"}}
	if err := repo.UpdateEventItems(ctx, eventID, products, extras, &equipment, &allSupplies); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(all four types) expected error with closed pool")
	}
}

// TestUserRepoCreateWithOAuthDefaults tests CreateWithOAuth default values for role and plan.
func TestUserRepoCreateWithOAuthDefaults(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	user := &models.User{
		Email: "oauth-defaults@test.dev",
		Name:  "OAuth Defaults",
		Role:  "",  // triggers default role = "user"
		Plan:  "",  // triggers default plan = "basic"
	}
	if err := NewUserRepo(pool).CreateWithOAuth(ctx, user); err == nil {
		t.Fatal("UserRepo.CreateWithOAuth(defaults) expected error with closed pool")
	}
	// Verify defaults were set before the pool call
	if user.Role != "user" {
		t.Fatalf("expected role to be set to 'user', got %q", user.Role)
	}
	if user.Plan != "basic" {
		t.Fatalf("expected plan to be set to 'basic', got %q", user.Plan)
	}
}

// TestGetSupplySuggestionsFromProductsEmpty tests GetSupplySuggestionsFromProducts with empty list returns early.
func TestGetSupplySuggestionsFromProductsEmpty(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	suggestions, err := NewEventRepo(nil).GetSupplySuggestionsFromProducts(ctx, userID, []ProductQuantity{})
	if err != nil {
		t.Fatalf("EventRepo.GetSupplySuggestionsFromProducts(empty) expected no error, got: %v", err)
	}
	if suggestions != nil {
		t.Fatalf("EventRepo.GetSupplySuggestionsFromProducts(empty) expected nil, got %d items", len(suggestions))
	}
}

// TestCheckEquipmentConflictsWithParams tests CheckEquipmentConflicts with various parameter
// combinations to exercise the query-building branches (excludeEventID, startTime/endTime).
func TestCheckEquipmentConflictsWithParams(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	userID := uuid.New()
	invID := uuid.New()
	excludeID := uuid.New()
	start := "09:00:00"
	end := "17:00:00"

	repo := NewEventRepo(pool)

	// With excludeEventID set (covers the excludeEventID != nil branch)
	if _, err := repo.CheckEquipmentConflicts(ctx, userID, "2026-01-01", nil, nil, []uuid.UUID{invID}, &excludeID); err == nil {
		t.Fatal("CheckEquipmentConflicts(excludeEventID) expected error with closed pool")
	}

	// With startTime and endTime set (covers the time-overlap branch)
	if _, err := repo.CheckEquipmentConflicts(ctx, userID, "2026-01-01", &start, &end, []uuid.UUID{invID}, nil); err == nil {
		t.Fatal("CheckEquipmentConflicts(startTime+endTime) expected error with closed pool")
	}

	// With all params (both excludeEventID and times)
	if _, err := repo.CheckEquipmentConflicts(ctx, userID, "2026-01-01", &start, &end, []uuid.UUID{invID}, &excludeID); err == nil {
		t.Fatal("CheckEquipmentConflicts(all params) expected error with closed pool")
	}
}

// TestEventCreateUpdateBranches tests the Event Create/Update early-return branches for
// empty DiscountType and empty/nil time strings.
func TestEventCreateUpdateBranches(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	userID := uuid.New()
	clientID := uuid.New()

	repo := NewEventRepo(pool)

	// Create with empty DiscountType (triggers default "percent"), empty start/end times
	emptyStr := ""
	ev := &models.Event{
		UserID:      userID,
		ClientID:    clientID,
		EventDate:   "2026-01-01",
		StartTime:   &emptyStr, // non-nil but empty → should be set to nil
		EndTime:     &emptyStr,
		ServiceType: "catering",
		Status:      "quoted",
		DiscountType: "", // triggers default
	}
	if err := repo.Create(ctx, ev); err == nil {
		t.Fatal("EventRepo.Create(empty discount/times) expected error with closed pool")
	}

	// Update with empty DiscountType and nil times
	ev2 := &models.Event{
		ID:           uuid.New(),
		UserID:       userID,
		ClientID:     clientID,
		EventDate:    "2026-01-01",
		StartTime:    nil,
		EndTime:      nil,
		ServiceType:  "banquet",
		Status:       "confirmed",
		DiscountType: "", // triggers default
	}
	if err := repo.Update(ctx, ev2); err == nil {
		t.Fatal("EventRepo.Update(empty discount/nil times) expected error with closed pool")
	}

	// Create with valid non-empty times (covers the non-nil, non-empty branch)
	validStart := "09:00:00"
	validEnd := "17:00:00"
	ev3 := &models.Event{
		UserID:       userID,
		ClientID:     clientID,
		EventDate:    "2026-01-01",
		StartTime:    &validStart,
		EndTime:      &validEnd,
		ServiceType:  "catering",
		Status:       "quoted",
		DiscountType: "fixed",
	}
	if err := repo.Create(ctx, ev3); err == nil {
		t.Fatal("EventRepo.Create(valid times) expected error with closed pool")
	}

	// Update with valid non-empty times
	ev4 := &models.Event{
		ID:           uuid.New(),
		UserID:       userID,
		ClientID:     clientID,
		EventDate:    "2026-01-01",
		StartTime:    &validStart,
		EndTime:      &validEnd,
		ServiceType:  "banquet",
		Status:       "confirmed",
		DiscountType: "fixed",
	}
	if err := repo.Update(ctx, ev4); err == nil {
		t.Fatal("EventRepo.Update(valid times) expected error with closed pool")
	}
}

// TestUpdateEventItemsWithEquipment tests UpdateEventItems with equipment slice provided.
func TestUpdateEventItemsWithEquipment(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	eventID := uuid.New()
	invID := uuid.New()

	repo := NewEventRepo(pool)

	// With non-nil equipment list
	equipment := []models.EventEquipment{{InventoryID: invID, Quantity: 2}}
	if err := repo.UpdateEventItems(ctx, eventID, nil, nil, &equipment, nil); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(with equipment) expected error with closed pool")
	}

	// With products and extras
	products := []models.EventProduct{{ProductID: uuid.New(), Quantity: 1, UnitPrice: 10}}
	extras := []models.EventExtra{{Description: "extra", Cost: 5, Price: 10}}
	if err := repo.UpdateEventItems(ctx, eventID, products, extras, nil, nil); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(products+extras) expected error with closed pool")
	}
}

// TestAdminRepoUpdateUserPlanWithExpiry tests UpdateUserPlan with a non-nil expiresAt.
func TestAdminRepoUpdateUserPlanWithExpiry(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	id := uuid.New()
	expiry := time.Now().Add(24 * time.Hour)

	repo := NewAdminRepo(pool)
	if err := repo.UpdateUserPlan(ctx, id, "pro", &expiry); err == nil {
		t.Fatal("AdminRepo.UpdateUserPlan(with expiry) expected error with closed pool")
	}
}

// TestSubscriptionRepoUpdateStatusWithPeriods tests UpdateStatusByProviderSubID with non-nil periods.
func TestSubscriptionRepoUpdateStatusWithPeriods(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	start := time.Now()
	end := start.Add(30 * 24 * time.Hour)

	repo := NewSubscriptionRepo(pool)
	if err := repo.UpdateStatusByProviderSubID(ctx, "sub_test", "active", &start, &end); err == nil {
		t.Fatal("SubscriptionRepo.UpdateStatusByProviderSubID(with periods) expected error with closed pool")
	}
}

// TestUserRepoUpdateWithAllParams tests UserRepo.Update with all optional params set.
func TestUserRepoUpdateWithAllParams(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	id := uuid.New()
	name := "Test User"
	biz := "Test Business"
	logo := "https://example.com/logo.png"
	color := "#ff0000"
	showBiz := true
	dep := 50.0
	cancel := 7.0
	refund := 50.0
	contract := "template"

	repo := NewUserRepo(pool)
	if _, err := repo.Update(ctx, id, &name, &biz, &logo, &color, &showBiz, &dep, &cancel, &refund, &contract, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatal("UserRepo.Update(all params) expected error with closed pool")
	}
}

// TestUserRepoCreateWithDefaultRole tests UserRepo.Create with empty role (triggers default).
func TestUserRepoCreateWithDefaultRole(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	user := &models.User{
		Email:        "default-role@test.dev",
		PasswordHash: "hash",
		Name:         "Default Role",
		Plan:         "basic",
		Role:         "", // triggers default role = "user"
	}
	if err := NewUserRepo(pool).Create(ctx, user); err == nil {
		t.Fatal("UserRepo.Create(default role) expected error with closed pool")
	}
	// Verify the role was set
	if user.Role != "user" {
		t.Fatalf("expected role to be set to 'user', got %q", user.Role)
	}
}

// TestUpdateEventItemsProductsAndExtrasAndEquipment tests UpdateEventItems with all three
// parameters populated (products, extras, and equipment) to exercise every insert branch.
func TestUpdateEventItemsProductsAndExtrasAndEquipment(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	eventID := uuid.New()

	repo := NewEventRepo(pool)

	products := []models.EventProduct{{ProductID: uuid.New(), Quantity: 2, UnitPrice: 50}}
	extras := []models.EventExtra{{Description: "Flowers", Cost: 20, Price: 30}}
	equipment := []models.EventEquipment{{InventoryID: uuid.New(), Quantity: 3}}

	if err := repo.UpdateEventItems(ctx, eventID, products, extras, &equipment, nil); err == nil {
		t.Fatal("EventRepo.UpdateEventItems(all three) expected error with closed pool")
	}
}

// TestPaymentRepoGetByEventIDsWithNilList tests GetByEventIDs with nil list (different from empty).
func TestPaymentRepoGetByEventIDsWithNilList(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	// nil list should behave like empty list (no pool interaction needed)
	payments, err := NewPaymentRepo(nil).GetByEventIDs(ctx, userID, nil)
	if err != nil {
		t.Fatalf("PaymentRepo.GetByEventIDs(nil) expected no error, got: %v", err)
	}
	if len(payments) != 0 {
		t.Fatalf("PaymentRepo.GetByEventIDs(nil) expected empty slice, got %d items", len(payments))
	}
}

// TestUserRepoUpdatePartialParams tests UserRepo.Update with various param combinations
// to exercise different branches of the COALESCE query.
func TestUserRepoUpdatePartialParams(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	id := uuid.New()

	repo := NewUserRepo(pool)

	// Only name + business name
	name := "Partial User"
	biz := "Partial Business"
	if _, err := repo.Update(ctx, id, &name, &biz, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatal("UserRepo.Update(partial params) expected error with closed pool")
	}

	// Only logo + color + showBiz
	logo := "https://example.com/logo.png"
	color := "#abcdef"
	showBiz := false
	if _, err := repo.Update(ctx, id, nil, nil, &logo, &color, &showBiz, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatal("UserRepo.Update(logo/color/showBiz) expected error with closed pool")
	}

	// Only contract defaults
	dep := 30.0
	cancel := 14.0
	refund := 80.0
	contract := "custom template"
	if _, err := repo.Update(ctx, id, nil, nil, nil, nil, nil, &dep, &cancel, &refund, &contract, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatal("UserRepo.Update(contract defaults) expected error with closed pool")
	}
}

// TestUserRepoUpdatePlanAndStripeIDWithStripeID tests UpdatePlanAndStripeID with a non-nil stripe ID.
func TestUserRepoUpdatePlanAndStripeIDWithStripeID(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	id := uuid.New()
	stripeID := "cus_testStripeID123"

	repo := NewUserRepo(pool)
	if err := repo.UpdatePlanAndStripeID(ctx, id, "pro", &stripeID); err == nil {
		t.Fatal("UserRepo.UpdatePlanAndStripeID(with stripeID) expected error with closed pool")
	}
}

// TestAdminRepoUpdateUserPlanWithoutExpiry tests UpdateUserPlan with nil expiresAt.
func TestAdminRepoUpdateUserPlanWithoutExpiry(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	id := uuid.New()

	repo := NewAdminRepo(pool)
	if err := repo.UpdateUserPlan(ctx, id, "basic", nil); err == nil {
		t.Fatal("AdminRepo.UpdateUserPlan(no expiry) expected error with closed pool")
	}
}

// TestSubscriptionRepoUpdateStatusWithoutPeriods tests UpdateStatusByProviderSubID with nil periods.
func TestSubscriptionRepoUpdateStatusWithoutPeriods(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()

	repo := NewSubscriptionRepo(pool)
	if err := repo.UpdateStatusByProviderSubID(ctx, "sub_test_no_periods", "canceled", nil, nil); err == nil {
		t.Fatal("SubscriptionRepo.UpdateStatusByProviderSubID(no periods) expected error with closed pool")
	}
}

// TestSubscriptionRepoUpsertWithAllFields tests Upsert with all fields populated.
func TestSubscriptionRepoUpsertWithAllFields(t *testing.T) {
	pool := closedPool(t)

	ctx := context.Background()
	start := time.Now()
	end := start.Add(30 * 24 * time.Hour)
	providerSubID := "sub_full_test"

	sub := &models.Subscription{
		UserID:             uuid.New(),
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &start,
		CurrentPeriodEnd:   &end,
	}

	repo := NewSubscriptionRepo(pool)
	if err := repo.Upsert(ctx, sub); err == nil {
		t.Fatal("SubscriptionRepo.Upsert(all fields) expected error with closed pool")
	}
}

func TestRepositoryEdgeCases(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	// PaymentRepo.GetByEventIDs with empty list returns early without hitting the pool
	payments, err := NewPaymentRepo(nil).GetByEventIDs(ctx, userID, []uuid.UUID{})
	if err != nil {
		t.Fatalf("PaymentRepo.GetByEventIDs(empty) expected no error, got: %v", err)
	}
	if len(payments) != 0 {
		t.Fatalf("PaymentRepo.GetByEventIDs(empty) expected empty slice, got %d items", len(payments))
	}

	// ProductRepo.GetIngredientsForProducts with empty list returns early without hitting the pool
	ingredients, err := NewProductRepo(nil).GetIngredientsForProducts(ctx, []uuid.UUID{})
	if err != nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts(empty) expected no error, got: %v", err)
	}
	if ingredients != nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts(empty) expected nil, got %d items", len(ingredients))
	}

	// ProductRepo.VerifyOwnership with empty list returns early without hitting the pool
	if err := NewProductRepo(nil).VerifyOwnership(ctx, []uuid.UUID{}, userID); err != nil {
		t.Fatalf("ProductRepo.VerifyOwnership(empty) expected no error, got: %v", err)
	}

	// EventRepo.CheckEquipmentConflicts with empty inventoryIDs returns early without hitting the pool
	conflicts, err := NewEventRepo(nil).CheckEquipmentConflicts(ctx, userID, "2026-01-01", nil, nil, []uuid.UUID{}, nil)
	if err != nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts(empty) expected no error, got: %v", err)
	}
	if conflicts != nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts(empty) expected nil, got %d items", len(conflicts))
	}

	// EventRepo.GetEquipmentSuggestionsFromProducts with empty productIDs returns early without hitting the pool
	suggestions, err := NewEventRepo(nil).GetEquipmentSuggestionsFromProducts(ctx, userID, []ProductQuantity{})
	if err != nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts(empty) expected no error, got: %v", err)
	}
	if suggestions != nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts(empty) expected nil, got %d items", len(suggestions))
	}
}
