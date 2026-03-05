package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// MockUserRepo mocks the UserRepo for testing
type MockUserRepo struct {
	mock.Mock
}

func (m *MockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepo) UpdatePlanAndStripeID(ctx context.Context, id uuid.UUID, plan string, stripeCustomerID *string) error {
	args := m.Called(ctx, id, plan, stripeCustomerID)
	return args.Error(0)
}

func (m *MockUserRepo) UpdatePlanByStripeCustomerID(ctx context.Context, stripeCustomerID string, plan string) error {
	args := m.Called(ctx, stripeCustomerID, plan)
	return args.Error(0)
}

func (m *MockUserRepo) Create(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepo) Update(ctx context.Context, id uuid.UUID, name, businessName, logoURL, brandColor *string, showBusinessNameInPdf *bool, depositPercent, cancellationDays, refundPercent *float64) (*models.User, error) {
	args := m.Called(ctx, id, name, businessName, logoURL, brandColor, showBusinessNameInPdf, depositPercent, cancellationDays, refundPercent)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepo) UpdatePassword(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	args := m.Called(ctx, userID, passwordHash)
	return args.Error(0)
}

func TestSubscriptionHandler_CreateCheckoutSession(t *testing.T) {
	// Note: This test requires Stripe API to be configured
	// For unit testing, we would need to mock stripe.CheckoutSession.New()
	// This is a basic structure test

	t.Run("should reject when Stripe is not configured", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			StripeSecretKey:  "", // Not configured
			StripeProPriceID: "",
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
		w := httptest.NewRecorder()

		// Add user ID to context
		userID := uuid.New()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.CreateCheckoutSession(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Stripe is not configured")
	})

	t.Run("should return error when user not found", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			StripeSecretKey:  "sk_test_fake",
			StripeProPriceID: "price_fake",
		}

		userID := uuid.New()
		mockRepo.On("GetByID", mock.Anything, userID).Return(nil, assert.AnError)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.CreateCheckoutSession(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "User not found")
		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_CreatePortalSession(t *testing.T) {
	t.Run("should reject when Stripe is not configured", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			StripeSecretKey: "", // Not configured
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
		w := httptest.NewRecorder()

		userID := uuid.New()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.CreatePortalSession(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Stripe is not configured")
	})

	t.Run("should reject when user has no Stripe customer ID", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			StripeSecretKey: "sk_test_fake",
			FrontendURL:     "http://localhost:5173",
		}

		userID := uuid.New()
		user := &models.User{
			ID:               userID,
			Email:            "test@example.com",
			StripeCustomerID: nil, // No Stripe customer
		}
		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.CreatePortalSession(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "No Stripe customer")
		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_DebugUpgrade(t *testing.T) {
	t.Run("should upgrade user to pro in development", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			Environment: "development",
		}

		userID := uuid.New()

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(nil)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/debug-upgrade", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.DebugUpgrade(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Contains(t, response["message"], "upgraded")

		mockRepo.AssertExpectations(t)
	})

	t.Run("should reject in production environment", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			Environment: "production",
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/debug-upgrade", nil)
		w := httptest.NewRecorder()

		userID := uuid.New()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.DebugUpgrade(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "Not found")
	})
}

func TestSubscriptionHandler_DebugDowngrade(t *testing.T) {
	t.Run("should downgrade user to basic in development", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			Environment: "development",
		}

		userID := uuid.New()

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "basic", (*string)(nil)).Return(nil)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/debug-downgrade", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.DebugDowngrade(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Contains(t, response["message"], "downgraded")

		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_GetSubscriptionStatus(t *testing.T) {
	t.Run("should return user subscription status", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{}

		userID := uuid.New()
		customerID := "cus_test123"
		user := &models.User{
			ID:               userID,
			Plan:             "pro",
			StripeCustomerID: &customerID,
		}

		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.GetSubscriptionStatus(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "pro", response["plan"])
		assert.Equal(t, true, response["has_stripe_account"])

		mockRepo.AssertExpectations(t)
	})

	t.Run("should return basic plan for user without Stripe", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{}

		userID := uuid.New()
		user := &models.User{
			ID:               userID,
			Plan:             "basic",
			StripeCustomerID: nil,
		}

		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
		w := httptest.NewRecorder()

		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.GetSubscriptionStatus(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "basic", response["plan"])
		assert.Equal(t, false, response["has_stripe_account"])

		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_RevenueCatWebhook(t *testing.T) {
	t.Run("should reject without authorization header", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			RevenueCatWebhookSecret: "rc_secret_123",
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte("{}")))
		// No Authorization header
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("should reject with invalid authorization", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			RevenueCatWebhookSecret: "rc_secret_123",
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte("{}")))
		req.Header.Set("Authorization", "wrong_secret")
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("should accept with valid authorization", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		cfg := &config.Config{
			RevenueCatWebhookSecret: "rc_secret_123",
		}

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

		// Valid RevenueCat payload (minimal)
		payload := `{
			"event": {
				"type": "INITIAL_PURCHASE",
				"app_user_id": "` + uuid.New().String() + `",
				"product_id": "pro_monthly",
				"store": "APP_STORE",
				"period_type": "NORMAL"
			}
		}`

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
		req.Header.Set("Authorization", "rc_secret_123")
		w := httptest.NewRecorder()

		// Mock UpdatePlanAndStripeID for any user
		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, mock.Anything, "pro", (*string)(nil)).Return(nil)

		handler.RevenueCatWebhook(w, req)

		// Should accept (200 OK) even if user update fails (webhook processing is best-effort)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSubscriptionHandler_StripeWebhookMissingSecret(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeWebhookSecret: "", // Not configured
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader([]byte(`{}`)))
	w := httptest.NewRecorder()

	handler.StripeWebhook(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Webhook not configured")
}

func TestSubscriptionHandler_StripeWebhookBodyTooLarge(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeWebhookSecret: "whsec_test",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	// Create a body larger than 65536 bytes
	largeBody := bytes.Repeat([]byte("x"), 70000)
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader(largeBody))
	w := httptest.NewRecorder()

	handler.StripeWebhook(w, req)

	// Should fail with body too large or invalid signature (depends on read order)
	assert.True(t, w.Code == http.StatusServiceUnavailable || w.Code == http.StatusInternalServerError || w.Code == http.StatusBadRequest,
		"expected error status, got %d", w.Code)
}

func TestSubscriptionHandler_RevenueCatWebhookMissingSecretConfig(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		RevenueCatWebhookSecret: "", // Not configured
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(`{}`)))
	req.Header.Set("Authorization", "some_secret")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Webhook not configured")
}

func TestSubscriptionHandler_RevenueCatWebhookInvalidPayload(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(`not-json`)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid payload")
}

func TestSubscriptionHandler_RevenueCatWebhookUnparseableAppUserID(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	// Use a non-UUID app_user_id (anonymous ID)
	payload := `{
		"event": {
			"type": "INITIAL_PURCHASE",
			"app_user_id": "anonymous-user-abc123",
			"product_id": "pro_monthly",
			"store": "APP_STORE",
			"period_type": "NORMAL"
		}
	}`

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	// Should return 200 OK (gracefully ignores unparseable user IDs)
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestSubscriptionHandler_RevenueCatWebhookCancellation(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	userID := uuid.New()
	payload := fmt.Sprintf(`{
		"event": {
			"type": "CANCELLATION",
			"app_user_id": "%s",
			"product_id": "pro_monthly",
			"store": "APP_STORE",
			"period_type": "NORMAL"
		}
	}`, userID.String())

	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "basic", (*string)(nil)).Return(nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_RevenueCatWebhookProductChange(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	userID := uuid.New()
	payload := fmt.Sprintf(`{
		"event": {
			"type": "PRODUCT_CHANGE",
			"app_user_id": "%s",
			"product_id": "pro_annual",
			"store": "PLAY_STORE",
			"period_type": "NORMAL"
		}
	}`, userID.String())

	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	// PRODUCT_CHANGE just logs, no repo calls expected
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestSubscriptionHandler_DebugDowngradeInProduction(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		Environment: "production",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/debug-downgrade", nil)
	w := httptest.NewRecorder()

	userID := uuid.New()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.DebugDowngrade(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.Contains(t, w.Body.String(), "Not found")
}

func TestSubscriptionHandler_DebugUpgradeRepoError(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		Environment: "development",
	}

	userID := uuid.New()
	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(assert.AnError)

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/debug-upgrade", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.DebugUpgrade(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to upgrade")
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_DebugDowngradeRepoError(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		Environment: "development",
	}

	userID := uuid.New()
	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "basic", (*string)(nil)).Return(assert.AnError)

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/debug-downgrade", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.DebugDowngrade(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to downgrade")
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_GetSubscriptionStatusRepoError(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{}

	userID := uuid.New()
	mockRepo.On("GetByID", mock.Anything, userID).Return(nil, assert.AnError)

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.GetSubscriptionStatus(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "User not found")
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_CreatePortalSessionRepoError(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey: "sk_test_fake",
		FrontendURL:     "http://localhost:5173",
	}

	userID := uuid.New()
	mockRepo.On("GetByID", mock.Anything, userID).Return(nil, assert.AnError)

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreatePortalSession(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "User not found")
	mockRepo.AssertExpectations(t)
}

func TestStringPtr(t *testing.T) {
	s := "hello"
	p := stringPtr(s)
	assert.NotNil(t, p)
	assert.Equal(t, "hello", *p)

	empty := stringPtr("")
	assert.NotNil(t, empty)
	assert.Equal(t, "", *empty)
}

// MockSubscriptionRepo mocks the SubscriptionRepository for testing
type MockSubscriptionRepo struct {
	mock.Mock
}

func (m *MockSubscriptionRepo) Upsert(ctx context.Context, sub *models.Subscription) error {
	args := m.Called(ctx, sub)
	return args.Error(0)
}

func (m *MockSubscriptionRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Subscription, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Subscription), args.Error(1)
}

func (m *MockSubscriptionRepo) UpdateStatusByProviderSubID(ctx context.Context, providerSubID string, status string, periodStart, periodEnd *time.Time) error {
	args := m.Called(ctx, providerSubID, status, periodStart, periodEnd)
	return args.Error(0)
}

func (m *MockSubscriptionRepo) UpdateStatusByUserID(ctx context.Context, userID uuid.UUID, status string) error {
	args := m.Called(ctx, userID, status)
	return args.Error(0)
}

func TestSubscriptionHandler_GetSubscriptionStatusWithSubRepo(t *testing.T) {
	t.Run("should return subscription details when subRepo has data", func(t *testing.T) {
		mockUserRepo := new(MockUserRepo)
		mockSubRepo := new(MockSubscriptionRepo)
		cfg := &config.Config{}

		userID := uuid.New()
		customerID := "cus_test123"
		user := &models.User{
			ID:               userID,
			Plan:             "pro",
			StripeCustomerID: &customerID,
		}

		providerSubID := "sub_test456"
		periodEnd := time.Date(2026, 4, 4, 0, 0, 0, 0, time.UTC)
		sub := &models.Subscription{
			UserID:        userID,
			Provider:      "stripe",
			ProviderSubID: &providerSubID,
			Status:        "active",
			Plan:          "pro",
			CurrentPeriodEnd: &periodEnd,
		}

		mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
		mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(sub, nil)

		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, cfg)

		req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
		w := httptest.NewRecorder()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.GetSubscriptionStatus(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "pro", response["plan"])
		assert.Equal(t, true, response["has_stripe_account"])

		subInfo, ok := response["subscription"].(map[string]interface{})
		assert.True(t, ok)
		assert.Equal(t, "active", subInfo["status"])
		assert.Equal(t, "stripe", subInfo["provider"])

		mockUserRepo.AssertExpectations(t)
		mockSubRepo.AssertExpectations(t)
	})

	t.Run("should return status without subscription when subRepo has no data", func(t *testing.T) {
		mockUserRepo := new(MockUserRepo)
		mockSubRepo := new(MockSubscriptionRepo)
		cfg := &config.Config{}

		userID := uuid.New()
		user := &models.User{
			ID:   userID,
			Plan: "basic",
		}

		mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
		mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(nil, assert.AnError)

		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, cfg)

		req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
		w := httptest.NewRecorder()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.GetSubscriptionStatus(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "basic", response["plan"])
		assert.Nil(t, response["subscription"])

		mockUserRepo.AssertExpectations(t)
		mockSubRepo.AssertExpectations(t)
	})

	t.Run("should return subscription with past_due status", func(t *testing.T) {
		mockUserRepo := new(MockUserRepo)
		mockSubRepo := new(MockSubscriptionRepo)
		cfg := &config.Config{}

		userID := uuid.New()
		user := &models.User{
			ID:   userID,
			Plan: "pro",
		}

		sub := &models.Subscription{
			UserID:   userID,
			Provider: "stripe",
			Status:   "past_due",
			Plan:     "pro",
		}

		mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
		mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(sub, nil)

		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, cfg)

		req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
		w := httptest.NewRecorder()
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
		req = req.WithContext(ctx)

		handler.GetSubscriptionStatus(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		subInfo := response["subscription"].(map[string]interface{})
		assert.Equal(t, "past_due", subInfo["status"])

		mockUserRepo.AssertExpectations(t)
		mockSubRepo.AssertExpectations(t)
	})
}

