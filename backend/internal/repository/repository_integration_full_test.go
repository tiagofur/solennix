package repository

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// =============================================================================
// SubscriptionRepo Integration Tests
// =============================================================================

func TestSubscriptionRepoUpsertAndGetByUserID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "subscription.upsert@test.dev")
	repo := NewSubscriptionRepo(pool)

	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_stripe_123"

	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}

	// Insert
	if err := repo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert(insert) error = %v", err)
	}
	if sub.ID == uuid.Nil {
		t.Fatal("Upsert(insert) should populate subscription ID")
	}
	if sub.CreatedAt.IsZero() {
		t.Fatal("Upsert(insert) should populate CreatedAt")
	}

	// GetByUserID
	got, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}
	if got.Provider != "stripe" {
		t.Fatalf("GetByUserID() provider = %q, want %q", got.Provider, "stripe")
	}
	if got.Plan != "pro" {
		t.Fatalf("GetByUserID() plan = %q, want %q", got.Plan, "pro")
	}
	if got.Status != "active" {
		t.Fatalf("GetByUserID() status = %q, want %q", got.Status, "active")
	}

	// Upsert (update same user+provider)
	sub.Plan = "business"
	sub.Status = "trialing"
	if err := repo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert(update) error = %v", err)
	}

	got, err = repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after upsert error = %v", err)
	}
	if got.Plan != "business" {
		t.Fatalf("GetByUserID() after upsert plan = %q, want %q", got.Plan, "business")
	}
	if got.Status != "trialing" {
		t.Fatalf("GetByUserID() after upsert status = %q, want %q", got.Status, "trialing")
	}
}

func TestSubscriptionRepoUpdateStatusByProviderSubID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "subscription.provider@test.dev")
	repo := NewSubscriptionRepo(pool)

	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_stripe_456"

	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := repo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	// Update status by provider sub ID
	newStart := now.Add(30 * 24 * time.Hour)
	newEnd := now.Add(60 * 24 * time.Hour)
	if err := repo.UpdateStatusByProviderSubID(context.Background(), providerSubID, "canceled", &newStart, &newEnd); err != nil {
		t.Fatalf("UpdateStatusByProviderSubID() error = %v", err)
	}

	got, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after status update error = %v", err)
	}
	if got.Status != "canceled" {
		t.Fatalf("status after update = %q, want %q", got.Status, "canceled")
	}

	// Non-existent provider sub ID should return error
	err = repo.UpdateStatusByProviderSubID(context.Background(), "sub_nonexistent_999", "active", nil, nil)
	if err == nil {
		t.Fatal("UpdateStatusByProviderSubID() expected error for non-existent provider sub ID")
	}
}

func TestSubscriptionRepoUpdateStatusByUserID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "subscription.userstatus@test.dev")
	repo := NewSubscriptionRepo(pool)

	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_stripe_789"

	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := repo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	// Update all subscriptions for user
	if err := repo.UpdateStatusByUserID(context.Background(), userID, "past_due"); err != nil {
		t.Fatalf("UpdateStatusByUserID() error = %v", err)
	}

	got, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after UpdateStatusByUserID error = %v", err)
	}
	if got.Status != "past_due" {
		t.Fatalf("status after UpdateStatusByUserID = %q, want %q", got.Status, "past_due")
	}
}

func TestSubscriptionRepoGetByUserIDNotFound(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "subscription.notfound@test.dev")
	repo := NewSubscriptionRepo(pool)

	_, err := repo.GetByUserID(context.Background(), userID)
	if err == nil {
		t.Fatal("GetByUserID() expected error for user with no subscription")
	}
	if !strings.Contains(err.Error(), "subscription not found") {
		t.Fatalf("GetByUserID() error = %v, want 'subscription not found'", err)
	}
}

func TestSubscriptionRepoProviderPriority(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "subscription.priority@test.dev")
	repo := NewSubscriptionRepo(pool)

	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)

	// Insert apple subscription first
	appleSubID := "apple_sub_001"
	appleSub := &models.Subscription{
		UserID:             userID,
		Provider:           "apple",
		ProviderSubID:      &appleSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := repo.Upsert(context.Background(), appleSub); err != nil {
		t.Fatalf("Upsert(apple) error = %v", err)
	}

	// Insert stripe subscription (should be preferred)
	stripeSubID := "stripe_sub_001"
	stripeSub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &stripeSubID,
		Plan:               "business",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := repo.Upsert(context.Background(), stripeSub); err != nil {
		t.Fatalf("Upsert(stripe) error = %v", err)
	}

	// GetByUserID should return stripe (priority 1)
	got, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}
	if got.Provider != "stripe" {
		t.Fatalf("GetByUserID() provider = %q, want %q (stripe should have priority)", got.Provider, "stripe")
	}
}

// =============================================================================
// DeviceRepo Integration Tests
// =============================================================================

func TestDeviceRepoRegisterAndGetByUserID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "device.register@test.dev")
	repo := NewDeviceRepo(pool)

	// Register first device
	device, err := repo.Register(context.Background(), userID, "token_ios_001", "ios")
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}
	if device.ID == uuid.Nil {
		t.Fatal("Register() should populate device ID")
	}
	if device.Token != "token_ios_001" {
		t.Fatalf("Register() token = %q, want %q", device.Token, "token_ios_001")
	}
	if device.Platform != "ios" {
		t.Fatalf("Register() platform = %q, want %q", device.Platform, "ios")
	}

	// Register second device
	_, err = repo.Register(context.Background(), userID, "token_android_001", "android")
	if err != nil {
		t.Fatalf("Register(android) error = %v", err)
	}

	// GetByUserID should return both
	devices, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}
	if len(devices) != 2 {
		t.Fatalf("GetByUserID() len = %d, want 2", len(devices))
	}

	// Re-register same token updates timestamp (upsert behavior)
	updated, err := repo.Register(context.Background(), userID, "token_ios_001", "ios")
	if err != nil {
		t.Fatalf("Register(re-register) error = %v", err)
	}
	if updated.ID != device.ID {
		t.Fatalf("Register(re-register) should reuse same ID: got %v, want %v", updated.ID, device.ID)
	}

	// Still only 2 devices
	devices, err = repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after re-register error = %v", err)
	}
	if len(devices) != 2 {
		t.Fatalf("GetByUserID() after re-register len = %d, want 2", len(devices))
	}
}

func TestDeviceRepoUnregister(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "device.unregister@test.dev")
	repo := NewDeviceRepo(pool)

	_, err := repo.Register(context.Background(), userID, "token_to_remove", "web")
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	if err := repo.Unregister(context.Background(), userID, "token_to_remove"); err != nil {
		t.Fatalf("Unregister() error = %v", err)
	}

	devices, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after unregister error = %v", err)
	}
	if len(devices) != 0 {
		t.Fatalf("GetByUserID() after unregister len = %d, want 0", len(devices))
	}

	// Unregister non-existent token
	err = repo.Unregister(context.Background(), userID, "token_nonexistent")
	if err == nil {
		t.Fatal("Unregister() expected error for non-existent token")
	}
	if !strings.Contains(err.Error(), "device token not found") {
		t.Fatalf("Unregister() error = %v, want 'device token not found'", err)
	}
}

func TestDeviceRepoUnregisterAllForUser(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "device.unregall@test.dev")
	repo := NewDeviceRepo(pool)

	// Register multiple devices
	_, _ = repo.Register(context.Background(), userID, "token_1", "ios")
	_, _ = repo.Register(context.Background(), userID, "token_2", "android")
	_, _ = repo.Register(context.Background(), userID, "token_3", "web")

	devices, _ := repo.GetByUserID(context.Background(), userID)
	if len(devices) != 3 {
		t.Fatalf("setup: expected 3 devices, got %d", len(devices))
	}

	if err := repo.UnregisterAllForUser(context.Background(), userID); err != nil {
		t.Fatalf("UnregisterAllForUser() error = %v", err)
	}

	devices, err := repo.GetByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByUserID() after UnregisterAllForUser error = %v", err)
	}
	if len(devices) != 0 {
		t.Fatalf("GetByUserID() after UnregisterAllForUser len = %d, want 0", len(devices))
	}

	// UnregisterAllForUser on user with no devices should not error
	if err := repo.UnregisterAllForUser(context.Background(), userID); err != nil {
		t.Fatalf("UnregisterAllForUser(empty) error = %v", err)
	}
}

func TestDeviceRepoUserIsolation(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userA := seedUser(t, pool, "device.usera@test.dev")
	userB := seedUser(t, pool, "device.userb@test.dev")
	repo := NewDeviceRepo(pool)

	_, _ = repo.Register(context.Background(), userA, "token_a", "ios")
	_, _ = repo.Register(context.Background(), userB, "token_b", "android")

	devicesA, _ := repo.GetByUserID(context.Background(), userA)
	if len(devicesA) != 1 {
		t.Fatalf("GetByUserID(userA) len = %d, want 1", len(devicesA))
	}
	if devicesA[0].Token != "token_a" {
		t.Fatalf("GetByUserID(userA) token = %q, want %q", devicesA[0].Token, "token_a")
	}

	// userA cannot unregister userB's token
	err := repo.Unregister(context.Background(), userA, "token_b")
	if err == nil {
		t.Fatal("Unregister() expected error when unregistering another user's token")
	}
}

// =============================================================================
// AdminRepo Integration Tests
// =============================================================================

func TestAdminRepoGetPlatformStats(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	// Seed some data
	userID := seedUser(t, pool, "admin.stats@test.dev")
	clientID := seedClient(t, pool, userID, "Stats Client")
	_ = seedEvent(t, pool, userID, clientID, "2026-06-01")
	_ = seedProduct(t, pool, userID, "Stats Product")

	repo := NewAdminRepo(pool)
	stats, err := repo.GetPlatformStats(context.Background())
	if err != nil {
		t.Fatalf("GetPlatformStats() error = %v", err)
	}
	if stats.TotalUsers < 1 {
		t.Fatalf("GetPlatformStats() TotalUsers = %d, want >= 1", stats.TotalUsers)
	}
	if stats.TotalEvents < 1 {
		t.Fatalf("GetPlatformStats() TotalEvents = %d, want >= 1", stats.TotalEvents)
	}
	if stats.TotalClients < 1 {
		t.Fatalf("GetPlatformStats() TotalClients = %d, want >= 1", stats.TotalClients)
	}
	if stats.TotalProducts < 1 {
		t.Fatalf("GetPlatformStats() TotalProducts = %d, want >= 1", stats.TotalProducts)
	}
	// User was just created, so NewUsersToday should be >= 1
	if stats.NewUsersToday < 1 {
		t.Fatalf("GetPlatformStats() NewUsersToday = %d, want >= 1", stats.NewUsersToday)
	}
	if stats.NewUsersWeek < 1 {
		t.Fatalf("GetPlatformStats() NewUsersWeek = %d, want >= 1", stats.NewUsersWeek)
	}
	if stats.NewUsersMonth < 1 {
		t.Fatalf("GetPlatformStats() NewUsersMonth = %d, want >= 1", stats.NewUsersMonth)
	}
}

func TestAdminRepoGetAllUsers(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	_ = seedUser(t, pool, "admin.user1@test.dev")
	_ = seedUser(t, pool, "admin.user2@test.dev")

	repo := NewAdminRepo(pool)
	users, err := repo.GetAllUsers(context.Background(), AdminAccountTypeUsers)
	if err != nil {
		t.Fatalf("GetAllUsers() error = %v", err)
	}
	if len(users) != 2 {
		t.Fatalf("GetAllUsers() len = %d, want 2", len(users))
	}
	// Should be ordered by created_at DESC
	if users[0].Email != "admin.user2@test.dev" {
		t.Fatalf("GetAllUsers() first user email = %q, want %q (DESC order)", users[0].Email, "admin.user2@test.dev")
	}
}

func TestAdminRepoGetUserByID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "admin.getuser@test.dev")
	clientID := seedClient(t, pool, userID, "Admin Client")
	_ = seedEvent(t, pool, userID, clientID, "2026-06-01")
	_ = seedProduct(t, pool, userID, "Admin Product")

	repo := NewAdminRepo(pool)
	user, err := repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID() error = %v", err)
	}
	if user.Email != "admin.getuser@test.dev" {
		t.Fatalf("GetUserByID() email = %q, want %q", user.Email, "admin.getuser@test.dev")
	}
	if user.EventsCount != 1 {
		t.Fatalf("GetUserByID() EventsCount = %d, want 1", user.EventsCount)
	}
	if user.ClientsCount != 1 {
		t.Fatalf("GetUserByID() ClientsCount = %d, want 1", user.ClientsCount)
	}
	if user.ProductsCount != 1 {
		t.Fatalf("GetUserByID() ProductsCount = %d, want 1", user.ProductsCount)
	}
	if user.Plan != "basic" {
		t.Fatalf("GetUserByID() Plan = %q, want %q", user.Plan, "basic")
	}
}

func TestAdminRepoGetUserByIDNotFound(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewAdminRepo(pool)
	_, err := repo.GetUserByID(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("GetUserByID() expected error for non-existent user")
	}
	if !strings.Contains(err.Error(), "user not found") {
		t.Fatalf("GetUserByID() error = %v, want 'user not found'", err)
	}
}

func TestAdminRepoUpdateUserPlan(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "admin.updateplan@test.dev")
	repo := NewAdminRepo(pool)

	// Update to pro without expiry
	if err := repo.UpdateUserPlan(context.Background(), userID, "pro", nil); err != nil {
		t.Fatalf("UpdateUserPlan(pro) error = %v", err)
	}

	user, err := repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID() after plan update error = %v", err)
	}
	if user.Plan != "pro" {
		t.Fatalf("Plan after update = %q, want %q", user.Plan, "pro")
	}
	if user.PlanExpiresAt != nil {
		t.Fatalf("PlanExpiresAt should be nil for permanent plan, got %v", user.PlanExpiresAt)
	}

	// Update to business with expiry (gifted plan)
	expiry := time.Now().Add(7 * 24 * time.Hour).UTC().Truncate(time.Second)
	if err := repo.UpdateUserPlan(context.Background(), userID, "business", &expiry); err != nil {
		t.Fatalf("UpdateUserPlan(business+expiry) error = %v", err)
	}

	user, err = repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID() after gifted plan error = %v", err)
	}
	if user.Plan != "business" {
		t.Fatalf("Plan after gifted update = %q, want %q", user.Plan, "business")
	}
	if user.PlanExpiresAt == nil {
		t.Fatal("PlanExpiresAt should be set for gifted plan")
	}

	// Update non-existent user
	err = repo.UpdateUserPlan(context.Background(), uuid.New(), "pro", nil)
	if err == nil {
		t.Fatal("UpdateUserPlan() expected error for non-existent user")
	}
	if !strings.Contains(err.Error(), "user not found") {
		t.Fatalf("UpdateUserPlan() error = %v, want 'user not found'", err)
	}
}

func TestAdminRepoHasActiveSubscription(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "admin.hassub@test.dev")
	repo := NewAdminRepo(pool)

	// No subscription → false
	hasSub, err := repo.HasActiveSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("HasActiveSubscription() error = %v", err)
	}
	if hasSub {
		t.Fatal("HasActiveSubscription() should be false for user without subscription")
	}

	// Add an active subscription
	subRepo := NewSubscriptionRepo(pool)
	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_hassub_001"
	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := subRepo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert() for subscription error = %v", err)
	}

	hasSub, err = repo.HasActiveSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("HasActiveSubscription() after sub error = %v", err)
	}
	if !hasSub {
		t.Fatal("HasActiveSubscription() should be true for user with active subscription")
	}
}

func TestAdminRepoGetSubscriptionOverview(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "admin.overview@test.dev")
	repo := NewAdminRepo(pool)

	// Empty overview
	overview, err := repo.GetSubscriptionOverview(context.Background())
	if err != nil {
		t.Fatalf("GetSubscriptionOverview() error = %v", err)
	}
	if overview.TotalActive != 0 {
		t.Fatalf("GetSubscriptionOverview() TotalActive = %d, want 0", overview.TotalActive)
	}

	// Create an active stripe subscription
	subRepo := NewSubscriptionRepo(pool)
	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_overview_001"
	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := subRepo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	overview, err = repo.GetSubscriptionOverview(context.Background())
	if err != nil {
		t.Fatalf("GetSubscriptionOverview() after sub error = %v", err)
	}
	if overview.TotalActive != 1 {
		t.Fatalf("GetSubscriptionOverview() TotalActive = %d, want 1", overview.TotalActive)
	}
	if overview.StripeCount != 1 {
		t.Fatalf("GetSubscriptionOverview() StripeCount = %d, want 1", overview.StripeCount)
	}
	if overview.AppleCount != 0 {
		t.Fatalf("GetSubscriptionOverview() AppleCount = %d, want 0", overview.AppleCount)
	}
}

func TestAdminRepoExpireGiftedPlans(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewAdminRepo(pool)

	// Seed a user with an expired gifted plan (no stripe_customer_id, no active subscription)
	userID := seedUser(t, pool, "admin.expire@test.dev")
	pastExpiry := time.Now().Add(-24 * time.Hour).UTC()
	if err := repo.UpdateUserPlan(context.Background(), userID, "pro", &pastExpiry); err != nil {
		t.Fatalf("UpdateUserPlan() error = %v", err)
	}

	// Seed a user with a future gifted plan (should NOT expire)
	userID2 := seedUser(t, pool, "admin.noexpire@test.dev")
	futureExpiry := time.Now().Add(7 * 24 * time.Hour).UTC()
	if err := repo.UpdateUserPlan(context.Background(), userID2, "pro", &futureExpiry); err != nil {
		t.Fatalf("UpdateUserPlan(future) error = %v", err)
	}

	expired, err := repo.ExpireGiftedPlans(context.Background())
	if err != nil {
		t.Fatalf("ExpireGiftedPlans() error = %v", err)
	}
	if expired != 1 {
		t.Fatalf("ExpireGiftedPlans() expired = %d, want 1", expired)
	}

	// Verify the expired user was reverted to basic
	expiredUser, err := repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID(expired) error = %v", err)
	}
	if expiredUser.Plan != "basic" {
		t.Fatalf("expired user Plan = %q, want %q", expiredUser.Plan, "basic")
	}
	if expiredUser.PlanExpiresAt != nil {
		t.Fatalf("expired user PlanExpiresAt should be nil, got %v", expiredUser.PlanExpiresAt)
	}

	// Verify the non-expired user still has pro
	activeUser, err := repo.GetUserByID(context.Background(), userID2)
	if err != nil {
		t.Fatalf("GetUserByID(active) error = %v", err)
	}
	if activeUser.Plan != "pro" {
		t.Fatalf("active user Plan = %q, want %q", activeUser.Plan, "pro")
	}
}

func TestAdminRepoExpireGiftedPlansSkipsPaidSubscriptions(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewAdminRepo(pool)
	subRepo := NewSubscriptionRepo(pool)

	// Seed a user with expired gifted plan BUT has an active subscription
	userID := seedUser(t, pool, "admin.expire.paid@test.dev")
	pastExpiry := time.Now().Add(-24 * time.Hour).UTC()
	if err := repo.UpdateUserPlan(context.Background(), userID, "pro", &pastExpiry); err != nil {
		t.Fatalf("UpdateUserPlan() error = %v", err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	periodEnd := now.Add(30 * 24 * time.Hour)
	providerSubID := "sub_expire_paid_001"
	sub := &models.Subscription{
		UserID:             userID,
		Provider:           "stripe",
		ProviderSubID:      &providerSubID,
		Plan:               "pro",
		Status:             "active",
		CurrentPeriodStart: &now,
		CurrentPeriodEnd:   &periodEnd,
	}
	if err := subRepo.Upsert(context.Background(), sub); err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	expired, err := repo.ExpireGiftedPlans(context.Background())
	if err != nil {
		t.Fatalf("ExpireGiftedPlans() error = %v", err)
	}
	if expired != 0 {
		t.Fatalf("ExpireGiftedPlans() expired = %d, want 0 (user has active subscription)", expired)
	}

	// User should still have pro
	user, err := repo.GetUserByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetUserByID() error = %v", err)
	}
	if user.Plan != "pro" {
		t.Fatalf("user Plan = %q, want %q (should not expire)", user.Plan, "pro")
	}
}

// =============================================================================
// ProductRepo — VerifyOwnership Integration Tests
// =============================================================================

func TestProductRepoVerifyOwnershipSuccess(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "product.ownership@test.dev")
	productID1 := seedProduct(t, pool, userID, "Owned Product 1")
	productID2 := seedProduct(t, pool, userID, "Owned Product 2")

	repo := NewProductRepo(pool)

	// All products belong to the user
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{productID1, productID2}, userID); err != nil {
		t.Fatalf("VerifyOwnership() error = %v", err)
	}

	// Empty slice should not error
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{}, userID); err != nil {
		t.Fatalf("VerifyOwnership(empty) error = %v", err)
	}
}

func TestProductRepoVerifyOwnershipFailure(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userA := seedUser(t, pool, "product.ownera@test.dev")
	userB := seedUser(t, pool, "product.ownerb@test.dev")
	productA := seedProduct(t, pool, userA, "Product A")
	productB := seedProduct(t, pool, userB, "Product B")

	repo := NewProductRepo(pool)

	// userA tries to verify ownership of userB's product
	err := repo.VerifyOwnership(context.Background(), []uuid.UUID{productA, productB}, userA)
	if err == nil {
		t.Fatal("VerifyOwnership() expected error when products belong to different users")
	}
	if !strings.Contains(err.Error(), "one or more products not found") {
		t.Fatalf("VerifyOwnership() error = %v, want 'one or more products not found'", err)
	}

	// Non-existent product ID
	err = repo.VerifyOwnership(context.Background(), []uuid.UUID{uuid.New()}, userA)
	if err == nil {
		t.Fatal("VerifyOwnership() expected error for non-existent product")
	}
}
