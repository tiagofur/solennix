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
	"github.com/stripe/stripe-go/v81"
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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

func TestSubscriptionHandler_StripeWebhookInvalidSignature(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeWebhookSecret: "whsec_test_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

	// Send a valid body with a wrong Stripe-Signature header
	body := []byte(`{"id":"evt_test","type":"checkout.session.completed"}`)
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader(body))
	req.Header.Set("Stripe-Signature", "t=1234567890,v1=wrong_signature")
	w := httptest.NewRecorder()

	handler.StripeWebhook(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid signature")
}

func TestSubscriptionHandler_RevenueCatWebhookAllEventTypes(t *testing.T) {
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	t.Run("EXPIRATION_DowngradesUser", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

		userID := uuid.New()
		payload := fmt.Sprintf(`{
			"event": {
				"type": "EXPIRATION",
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
	})

	t.Run("BILLING_ISSUE_DowngradesUser", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

		userID := uuid.New()
		payload := fmt.Sprintf(`{
			"event": {
				"type": "BILLING_ISSUE",
				"app_user_id": "%s",
				"product_id": "pro_monthly",
				"store": "PLAY_STORE",
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
	})

	t.Run("RENEWAL_UpgradesUser", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

		userID := uuid.New()
		payload := fmt.Sprintf(`{
			"event": {
				"type": "RENEWAL",
				"app_user_id": "%s",
				"product_id": "pro_monthly",
				"store": "APP_STORE",
				"period_type": "NORMAL"
			}
		}`, userID.String())

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(nil)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
		req.Header.Set("Authorization", "rc_secret_123")
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("UNCANCELLATION_UpgradesUser", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

		userID := uuid.New()
		payload := fmt.Sprintf(`{
			"event": {
				"type": "UNCANCELLATION",
				"app_user_id": "%s",
				"product_id": "pro_annual",
				"store": "PLAY_STORE",
				"period_type": "NORMAL"
			}
		}`, userID.String())

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(nil)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
		req.Header.Set("Authorization", "rc_secret_123")
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_RevenueCatWebhookBodyTooLarge(t *testing.T) {
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	handler := NewSubscriptionHandler(new(MockUserRepo), nil, nil, nil, new(MockStripeService), cfg)

	// Create body larger than 65536 bytes
	largeBody := bytes.Repeat([]byte("x"), 70000)
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader(largeBody))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	handler.RevenueCatWebhook(w, req)

	// Should fail with body too large or invalid payload
	assert.True(t, w.Code == http.StatusServiceUnavailable || w.Code == http.StatusBadRequest,
		"expected error status, got %d", w.Code)
}

// MockEventRepoSmall mocks the EventRepository (smaller interface for SubscriptionHandler)
type MockEventRepoSmall struct {
	mock.Mock
}

func (m *MockEventRepoSmall) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Event), args.Error(1)
}

func (m *MockEventRepoSmall) Update(ctx context.Context, e *models.Event) error {
	args := m.Called(ctx, e)
	return args.Error(0)
}

// MockPaymentRepoSmall mocks the PaymentRepository (smaller interface for SubscriptionHandler)
type MockPaymentRepoSmall struct {
	mock.Mock
}

func (m *MockPaymentRepoSmall) Create(ctx context.Context, p *models.Payment) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func TestSubscriptionHandler_HandleEventPayment(t *testing.T) {
	t.Run("MissingMetadata_DoesNothing", func(t *testing.T) {
		h := &SubscriptionHandler{}

		// Missing event_id and user_id in metadata
		session := &stripe.CheckoutSession{
			ID:       "cs_test_123",
			Metadata: map[string]string{},
		}

		// Should not panic, just log and return
		h.handleEventPayment(context.Background(), session)
	})

	t.Run("InvalidEventID_DoesNothing", func(t *testing.T) {
		h := &SubscriptionHandler{}

		session := &stripe.CheckoutSession{
			ID: "cs_test_123",
			Metadata: map[string]string{
				"event_id": "not-a-uuid",
				"user_id":  uuid.New().String(),
			},
		}

		h.handleEventPayment(context.Background(), session)
	})

	t.Run("InvalidUserID_DoesNothing", func(t *testing.T) {
		h := &SubscriptionHandler{}

		session := &stripe.CheckoutSession{
			ID: "cs_test_123",
			Metadata: map[string]string{
				"event_id": uuid.New().String(),
				"user_id":  "not-a-uuid",
			},
		}

		h.handleEventPayment(context.Background(), session)
	})

	t.Run("EventNotFound_DoesNothing", func(t *testing.T) {
		mockEventRepo := new(MockEventRepoSmall)
		h := &SubscriptionHandler{
			eventRepo: mockEventRepo,
		}

		eventID := uuid.New()
		userID := uuid.New()
		session := &stripe.CheckoutSession{
			ID: "cs_test_123",
			Metadata: map[string]string{
				"event_id": eventID.String(),
				"user_id":  userID.String(),
			},
		}

		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, assert.AnError)

		h.handleEventPayment(context.Background(), session)
		mockEventRepo.AssertExpectations(t)
	})

	t.Run("PaymentCreateError_DoesNothing", func(t *testing.T) {
		mockEventRepo := new(MockEventRepoSmall)
		mockPaymentRepo := new(MockPaymentRepoSmall)
		h := &SubscriptionHandler{
			eventRepo:   mockEventRepo,
			paymentRepo: mockPaymentRepo,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:     eventID,
			UserID: userID,
			Status: "quoted",
		}
		session := &stripe.CheckoutSession{
			ID:          "cs_test_123",
			AmountTotal: 50000, // $500.00
			Metadata: map[string]string{
				"event_id": eventID.String(),
				"user_id":  userID.String(),
			},
			CustomerDetails: &stripe.CheckoutSessionCustomerDetails{
				Email: "test@test.dev",
			},
		}

		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockPaymentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Payment")).Return(assert.AnError)

		h.handleEventPayment(context.Background(), session)
		mockEventRepo.AssertExpectations(t)
		mockPaymentRepo.AssertExpectations(t)
	})

	t.Run("SuccessQuotedEvent_StatusUpdatedToConfirmed", func(t *testing.T) {
		mockEventRepo := new(MockEventRepoSmall)
		mockPaymentRepo := new(MockPaymentRepoSmall)
		h := &SubscriptionHandler{
			eventRepo:   mockEventRepo,
			paymentRepo: mockPaymentRepo,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:     eventID,
			UserID: userID,
			Status: "quoted",
		}
		session := &stripe.CheckoutSession{
			ID:          "cs_test_123",
			AmountTotal: 100000, // $1000.00
			Metadata: map[string]string{
				"event_id": eventID.String(),
				"user_id":  userID.String(),
			},
			CustomerDetails: &stripe.CheckoutSessionCustomerDetails{
				Email: "client@test.dev",
			},
		}

		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockPaymentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Payment")).Return(nil)
		mockEventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)

		h.handleEventPayment(context.Background(), session)
		mockEventRepo.AssertExpectations(t)
		mockPaymentRepo.AssertExpectations(t)

		// Verify event status was updated
		assert.Equal(t, "confirmed", event.Status)
	})

	t.Run("SuccessConfirmedEvent_StatusNotChanged", func(t *testing.T) {
		mockEventRepo := new(MockEventRepoSmall)
		mockPaymentRepo := new(MockPaymentRepoSmall)
		h := &SubscriptionHandler{
			eventRepo:   mockEventRepo,
			paymentRepo: mockPaymentRepo,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:     eventID,
			UserID: userID,
			Status: "confirmed",
		}
		session := &stripe.CheckoutSession{
			ID:          "cs_test_456",
			AmountTotal: 50000,
			Metadata: map[string]string{
				"event_id": eventID.String(),
				"user_id":  userID.String(),
			},
			CustomerDetails: &stripe.CheckoutSessionCustomerDetails{
				Email: "client@test.dev",
			},
		}

		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockPaymentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Payment")).Return(nil)

		h.handleEventPayment(context.Background(), session)
		mockEventRepo.AssertExpectations(t)
		mockPaymentRepo.AssertExpectations(t)

		// Status should stay confirmed, Update should NOT have been called
		assert.Equal(t, "confirmed", event.Status)
	})

	t.Run("QuotedEvent_UpdateFails_StillCompletes", func(t *testing.T) {
		mockEventRepo := new(MockEventRepoSmall)
		mockPaymentRepo := new(MockPaymentRepoSmall)
		h := &SubscriptionHandler{
			eventRepo:   mockEventRepo,
			paymentRepo: mockPaymentRepo,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:     eventID,
			UserID: userID,
			Status: "quoted",
		}
		session := &stripe.CheckoutSession{
			ID:          "cs_test_789",
			AmountTotal: 25000,
			Metadata: map[string]string{
				"event_id": eventID.String(),
				"user_id":  userID.String(),
			},
			CustomerDetails: &stripe.CheckoutSessionCustomerDetails{
				Email: "client@test.dev",
			},
		}

		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockPaymentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Payment")).Return(nil)
		mockEventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(assert.AnError)

		h.handleEventPayment(context.Background(), session)
		mockEventRepo.AssertExpectations(t)
		mockPaymentRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_RevenueCatWebhookErrors(t *testing.T) {
	cfg := &config.Config{
		RevenueCatWebhookSecret: "rc_secret_123",
	}

	t.Run("INITIAL_PURCHASE_UpgradeError_StillReturns200", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

		userID := uuid.New()
		payload := fmt.Sprintf(`{
			"event": {
				"type": "INITIAL_PURCHASE",
				"app_user_id": "%s",
				"product_id": "pro_monthly",
				"store": "APP_STORE",
				"period_type": "NORMAL"
			}
		}`, userID.String())

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(assert.AnError)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
		req.Header.Set("Authorization", "rc_secret_123")
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})

	t.Run("CANCELLATION_DowngradeError_StillReturns200", func(t *testing.T) {
		mockRepo := new(MockUserRepo)
		handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

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

		mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "basic", (*string)(nil)).Return(assert.AnError)

		req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
		req.Header.Set("Authorization", "rc_secret_123")
		w := httptest.NewRecorder()

		handler.RevenueCatWebhook(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		mockRepo.AssertExpectations(t)
	})
}

func TestSubscriptionHandler_CreateCheckoutSession_UserWithStripeCustomer(t *testing.T) {
	// When user has a StripeCustomerID, session.New is called with params.Customer set.
	// session.New will fail because we use a fake key, but we still exercise the code path
	// that populates params.Customer and reaches the retry logic.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:  "sk_test_fake",
		StripeProPriceID: "price_fake",
		FrontendURL:      "http://localhost:5173",
	}

	userID := uuid.New()
	customerID := "cus_test_existing"
	user := &models.User{
		ID:               userID,
		Email:            "stripe-user@example.com",
		StripeCustomerID: &customerID,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	mockStripe := new(MockStripeService)
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, mockStripe, cfg)

	mockStripe.On("NewCheckoutSession", mock.MatchedBy(func(p *stripe.CheckoutSessionParams) bool {
		return p.Customer != nil && *p.Customer == customerID
	})).Return(&stripe.CheckoutSession{URL: "https://stripe.com/sess_123"}, nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreateCheckoutSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "sess_123")
	mockRepo.AssertExpectations(t)
	mockStripe.AssertExpectations(t)
}

func TestSubscriptionHandler_CreateCheckoutSession_UserWithoutStripeCustomer(t *testing.T) {
	// When user has no StripeCustomerID, session.New is called with params.CustomerEmail set.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:  "sk_test_fake",
		StripeProPriceID: "price_fake",
		FrontendURL:      "http://localhost:5173",
	}

	userID := uuid.New()
	user := &models.User{
		ID:               userID,
		Email:            "nostripe@example.com",
		StripeCustomerID: nil,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	mockStripe := new(MockStripeService)
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, mockStripe, cfg)

	mockStripe.On("NewCheckoutSession", mock.Anything).Return(&stripe.CheckoutSession{URL: "https://stripe.com/sess_234"}, nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreateCheckoutSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "sess_234")
	mockRepo.AssertExpectations(t)
	mockStripe.AssertExpectations(t)
}

func TestSubscriptionHandler_CreateCheckoutSession_UserWithEmptyStripeCustomer(t *testing.T) {
	// When user has an empty string StripeCustomerID, should use CustomerEmail path.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:  "sk_test_fake",
		StripeProPriceID: "price_fake",
		FrontendURL:      "http://localhost:5173",
	}

	userID := uuid.New()
	emptyCustomer := ""
	user := &models.User{
		ID:               userID,
		Email:            "emptystripe@example.com",
		StripeCustomerID: &emptyCustomer,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	mockStripe := new(MockStripeService)
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, mockStripe, cfg)

	mockStripe.On("NewCheckoutSession", mock.Anything).Return(&stripe.CheckoutSession{URL: "http://checkout.test"}, nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreateCheckoutSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "http://checkout.test")
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_CreateCheckoutSession_OnlySecretKeyMissing(t *testing.T) {
	// When only StripeSecretKey is empty but StripeProPriceID is set, still not configured.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:  "",
		StripeProPriceID: "price_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
	w := httptest.NewRecorder()

	userID := uuid.New()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreateCheckoutSession(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Stripe is not configured")
}

func TestSubscriptionHandler_CreateCheckoutSession_OnlyPriceIDMissing(t *testing.T) {
	// When only StripeProPriceID is empty but StripeSecretKey is set, still not configured.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:  "sk_test_fake",
		StripeProPriceID: "",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/checkout-session", nil)
	w := httptest.NewRecorder()

	userID := uuid.New()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreateCheckoutSession(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Stripe is not configured")
}

func TestSubscriptionHandler_CreatePortalSession_EmptyStringStripeCustomerID(t *testing.T) {
	// When user has a non-nil but empty StripeCustomerID, should return 400.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey: "sk_test_fake",
		FrontendURL:     "http://localhost:5173",
	}

	userID := uuid.New()
	emptyCustomer := ""
	user := &models.User{
		ID:               userID,
		Email:            "test@example.com",
		StripeCustomerID: &emptyCustomer,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreatePortalSession(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "No Stripe customer")
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_CreatePortalSession_WithStripeCustomerID(t *testing.T) {
	// When user has a valid StripeCustomerID, the handler calls stripeBilling.New
	// which will fail with fake credentials, but exercises that code path.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey: "sk_test_fake",
		FrontendURL:     "http://localhost:5173",
	}

	userID := uuid.New()
	customerID := "cus_test_valid"
	user := &models.User{
		ID:               userID,
		Email:            "test@example.com",
		StripeCustomerID: &customerID,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	mockStripe := new(MockStripeService)
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, mockStripe, cfg)

	mockStripe.On("NewBillingPortalSession", mock.Anything).Return(&stripe.BillingPortalSession{URL: "http://portal.test"}, nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreatePortalSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "http://portal.test")
	mockRepo.AssertExpectations(t)
	mockStripe.AssertExpectations(t)
}

func TestSubscriptionHandler_CreatePortalSession_WithPortalConfigID(t *testing.T) {
	// Exercises the branch where StripePortalConfigID is non-empty.
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeSecretKey:      "sk_test_fake",
		FrontendURL:          "http://localhost:5173",
		StripePortalConfigID: "bpc_test_config",
	}

	userID := uuid.New()
	customerID := "cus_test_valid"
	user := &models.User{
		ID:               userID,
		Email:            "test@example.com",
		StripeCustomerID: &customerID,
	}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	mockStripe := new(MockStripeService)
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, mockStripe, cfg)

	mockStripe.On("NewBillingPortalSession", mock.MatchedBy(func(p *stripe.BillingPortalSessionParams) bool {
		return p.Configuration != nil && *p.Configuration == "bpc_test_config"
	})).Return(&stripe.BillingPortalSession{URL: "http://portal.test/config"}, nil)

	req := httptest.NewRequest("POST", "/api/subscriptions/portal-session", nil)
	w := httptest.NewRecorder()

	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.CreatePortalSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "http://portal.test/config")
	mockRepo.AssertExpectations(t)
	mockStripe.AssertExpectations(t)
}

func TestSubscriptionHandler_GetSubscriptionStatus_SubWithNoPeriodEnd(t *testing.T) {
	// When subscription has nil CurrentPeriodEnd, the response should not include it.
	mockUserRepo := new(MockUserRepo)
	mockSubRepo := new(MockSubscriptionRepo)
	cfg := &config.Config{}

	userID := uuid.New()
	user := &models.User{
		ID:   userID,
		Plan: "pro",
	}

	sub := &models.Subscription{
		UserID:           userID,
		Provider:         "apple",
		Status:           "active",
		Plan:             "pro",
		CurrentPeriodEnd: nil, // No period end
	}

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(sub, nil)

	handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
	w := httptest.NewRecorder()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.GetSubscriptionStatus(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "pro", response["plan"])
	assert.Equal(t, false, response["has_stripe_account"])

	subInfo := response["subscription"].(map[string]interface{})
	assert.Equal(t, "active", subInfo["status"])
	assert.Equal(t, "apple", subInfo["provider"])
	// current_period_end should be absent (omitempty)
	_, hasPeriodEnd := subInfo["current_period_end"]
	assert.False(t, hasPeriodEnd, "current_period_end should not be present when nil")

	mockUserRepo.AssertExpectations(t)
	mockSubRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_GetSubscriptionStatus_SubWithNilProviderSubID(t *testing.T) {
	// When subscription has nil ProviderSubID, the stripeSub.Get call is skipped
	// even if the user has a StripeCustomerID.
	mockUserRepo := new(MockUserRepo)
	mockSubRepo := new(MockSubscriptionRepo)
	cfg := &config.Config{}

	userID := uuid.New()
	customerID := "cus_test_123"
	user := &models.User{
		ID:               userID,
		Plan:             "pro",
		StripeCustomerID: &customerID,
	}

	periodEnd := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	sub := &models.Subscription{
		UserID:           userID,
		Provider:         "stripe",
		ProviderSubID:    nil, // No provider subscription ID
		Status:           "active",
		Plan:             "pro",
		CurrentPeriodEnd: &periodEnd,
	}

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(sub, nil)

	handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
	w := httptest.NewRecorder()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.GetSubscriptionStatus(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	subInfo := response["subscription"].(map[string]interface{})
	assert.Equal(t, "active", subInfo["status"])
	assert.Equal(t, "stripe", subInfo["provider"])
	// Should have current_period_end from the DB record (not from stripeSub.Get)
	assert.NotNil(t, subInfo["current_period_end"])
	// cancel_at_period_end should be false (default, since stripeSub.Get was skipped)
	assert.Equal(t, false, subInfo["cancel_at_period_end"])

	mockUserRepo.AssertExpectations(t)
	mockSubRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_GetSubscriptionStatus_NonStripeProviderWithPeriodEnd(t *testing.T) {
	// RevenueCat (apple/google) subscription with period end — should skip stripeSub.Get entirely.
	mockUserRepo := new(MockUserRepo)
	mockSubRepo := new(MockSubscriptionRepo)
	cfg := &config.Config{}

	userID := uuid.New()
	user := &models.User{
		ID:   userID,
		Plan: "pro",
		// No StripeCustomerID
	}

	periodEnd := time.Date(2026, 6, 15, 0, 0, 0, 0, time.UTC)
	providerSubID := "rc_sub_123"
	sub := &models.Subscription{
		UserID:           userID,
		Provider:         "apple",
		ProviderSubID:    &providerSubID,
		Status:           "active",
		Plan:             "pro",
		CurrentPeriodEnd: &periodEnd,
	}

	mockUserRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
	mockSubRepo.On("GetByUserID", mock.Anything, userID).Return(sub, nil)

	handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, new(MockStripeService), cfg)

	req := httptest.NewRequest("GET", "/api/subscriptions/status", nil)
	w := httptest.NewRecorder()
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	req = req.WithContext(ctx)

	handler.GetSubscriptionStatus(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "pro", response["plan"])
	assert.Equal(t, false, response["has_stripe_account"])

	subInfo := response["subscription"].(map[string]interface{})
	assert.Equal(t, "active", subInfo["status"])
	assert.Equal(t, "apple", subInfo["provider"])
	assert.NotNil(t, subInfo["current_period_end"])

	mockUserRepo.AssertExpectations(t)
	mockSubRepo.AssertExpectations(t)
}

func TestNewSubscriptionHandler(t *testing.T) {
	mockUserRepo := new(MockUserRepo)
	mockSubRepo := new(MockSubscriptionRepo)
	mockEventRepo := new(MockEventRepoSmall)
	mockPaymentRepo := new(MockPaymentRepoSmall)
	cfg := &config.Config{
		StripeSecretKey: "sk_test_constructor",
	}

	handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, mockEventRepo, mockPaymentRepo, new(MockStripeService), cfg)

	assert.NotNil(t, handler)
	assert.Equal(t, cfg, handler.cfg)
}

func TestSubscriptionHandler_StripeWebhookMissingSignatureHeader(t *testing.T) {
	mockRepo := new(MockUserRepo)
	cfg := &config.Config{
		StripeWebhookSecret: "whsec_test_secret_123",
	}

	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), cfg)

	// Send a body without the Stripe-Signature header
	body := []byte(`{"id":"evt_test","type":"checkout.session.completed"}`)
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader(body))
	// No Stripe-Signature header set
	w := httptest.NewRecorder()

	handler.StripeWebhook(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid signature")
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

		mockStripe := new(MockStripeService)
		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, mockStripe, cfg)

		mockStripe.On("GetSubscription", providerSubID, mock.Anything).Return(&stripe.Subscription{
			CancelAtPeriodEnd: false,
			CurrentPeriodEnd:  periodEnd.Unix(),
		}, nil)

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
		mockStripe.AssertExpectations(t)
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

		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, new(MockStripeService), cfg)

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

		handler := NewSubscriptionHandler(mockUserRepo, mockSubRepo, nil, nil, new(MockStripeService), cfg)

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

