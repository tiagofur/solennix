package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestEventPaymentHandler(t *testing.T) {
	t.Run("NewEventPaymentHandler", func(t *testing.T) {
		cfg := &config.Config{}
		h := NewEventPaymentHandler(nil, nil, nil, cfg)
		if h == nil {
			t.Fatal("NewEventPaymentHandler returned nil")
		}
	})

	t.Run("CreateEventCheckoutSession_StripeNotConfigured", func(t *testing.T) {
		cfg := &config.Config{StripeSecretKey: ""}
		h := &EventPaymentHandler{cfg: cfg, stripe: new(MockStripeService)}

		req := httptest.NewRequest(http.MethodPost, "/api/events/123/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		if rr.Code != http.StatusServiceUnavailable {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusServiceUnavailable)
		}
	})

	t.Run("CreateEventCheckoutSession_InvalidEventID", func(t *testing.T) {
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{cfg: cfg}

		req := httptest.NewRequest(http.MethodPost, "/api/events/bad-id/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		req = withURLParam(req, "id", "bad-id")
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d, body = %s", rr.Code, http.StatusBadRequest, rr.Body.String())
		}
	})

	t.Run("HandleEventPaymentSuccess_MissingSessionID", func(t *testing.T) {
		h := &EventPaymentHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/events/123/payment-session", nil)
		rr := httptest.NewRecorder()
		h.HandleEventPaymentSuccess(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("HandleEventPaymentSuccess_InvalidEventID", func(t *testing.T) {
		h := &EventPaymentHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/events/bad-id/payment-session?session_id=test", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		req = withURLParam(req, "id", "bad-id")
		rr := httptest.NewRecorder()
		h.HandleEventPaymentSuccess(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}

func TestEventPaymentHandler_CreateEventCheckoutSession_Paths(t *testing.T) {
	t.Run("StripeNotConfigured_Returns503", func(t *testing.T) {
		cfg := &config.Config{StripeSecretKey: ""}
		mockStripe := new(MockStripeService)
		h := &EventPaymentHandler{cfg: cfg, stripe: mockStripe}

		req := httptest.NewRequest(http.MethodPost, "/api/events/123/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusServiceUnavailable, rr.Code)
		assert.Contains(t, rr.Body.String(), "Stripe payments are not configured")
	})

	t.Run("InvalidEventID_Returns400", func(t *testing.T) {
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		mockStripe := new(MockStripeService)
		h := &EventPaymentHandler{cfg: cfg, stripe: mockStripe}

		req := httptest.NewRequest(http.MethodPost, "/api/events/not-a-uuid/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		req = withURLParam(req, "id", "not-a-uuid")
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid event ID")
	})

	t.Run("EventNotFound_Returns404", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, assert.AnError)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "Event not found")
		mockEventRepo.AssertExpectations(t)
	})

	t.Run("CancelledEvent_Returns400", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "cancelled",
			TotalAmount: 1000.0,
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Cannot pay for a cancelled event")
		mockEventRepo.AssertExpectations(t)
	})

	t.Run("ZeroTotalAmount_Returns400", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "quoted",
			TotalAmount: 0,
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Event total amount must be greater than zero")
		mockEventRepo.AssertExpectations(t)
	})

	t.Run("NegativeTotalAmount_Returns400", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "quoted",
			TotalAmount: -100.0,
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Event total amount must be greater than zero")
		mockEventRepo.AssertExpectations(t)
	})

	t.Run("EventWithClientEmail_UsesClientEmail", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{
			StripeSecretKey: "sk_test_fake",
			FrontendURL:     "http://localhost:5173",
		}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		clientEmail := "client@test.dev"
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "quoted",
			ServiceType: "Catering",
			EventDate:   "2026-06-15",
			NumPeople:   50,
			TotalAmount: 5000.0,
			Client: &models.Client{
				ID:    uuid.New(),
				Name:  "Test Client",
				Email: &clientEmail,
			},
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockStripe.On("NewCheckoutSession", mock.MatchedBy(func(p *stripe.CheckoutSessionParams) bool {
			return p.CustomerEmail != nil && *p.CustomerEmail == clientEmail
		})).Return(&stripe.CheckoutSession{ID: "sess_123", URL: "http://stripe.com/test"}, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "sess_123")
		mockEventRepo.AssertExpectations(t)
		mockStripe.AssertExpectations(t)
	})

	t.Run("EventWithNoClient_StillProceeds", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{
			StripeSecretKey: "sk_test_fake",
			FrontendURL:     "http://localhost:5173",
		}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "quoted",
			ServiceType: "Banquet",
			NumPeople:   100,
			TotalAmount: 10000.0,
			Client:      nil,
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockStripe.On("NewCheckoutSession", mock.Anything).Return(&stripe.CheckoutSession{ID: "sess_no_client", URL: "http://stripe.com/test"}, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "sess_no_client")
		mockEventRepo.AssertExpectations(t)
		mockStripe.AssertExpectations(t)
	})

	t.Run("EventWithEmptyEventDate_BuildsDescription", func(t *testing.T) {
		mockEventRepo := new(MockFullEventRepo)
		mockStripe := new(MockStripeService)
		cfg := &config.Config{
			StripeSecretKey: "sk_test_fake",
			FrontendURL:     "http://localhost:5173",
		}
		h := &EventPaymentHandler{
			eventRepo: mockEventRepo,
			stripe:    mockStripe,
			cfg:       cfg,
		}

		eventID := uuid.New()
		userID := uuid.New()
		event := &models.Event{
			ID:          eventID,
			UserID:      userID,
			Status:      "confirmed",
			ServiceType: "Party",
			EventDate:   "",
			NumPeople:   25,
			TotalAmount: 3000.0,
		}
		mockEventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
		mockStripe.On("NewCheckoutSession", mock.Anything).Return(&stripe.CheckoutSession{ID: "sess_no_date", URL: "http://stripe.com/test"}, nil)

		req := httptest.NewRequest(http.MethodPost, "/api/events/"+eventID.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "sess_no_date")
		mockEventRepo.AssertExpectations(t)
		mockStripe.AssertExpectations(t)
	})
}

func TestEventPaymentHandler_HandleEventPaymentSuccess_Paths(t *testing.T) {
	t.Run("MissingSessionID_Returns400", func(t *testing.T) {
		h := &EventPaymentHandler{stripe: new(MockStripeService)}
		req := httptest.NewRequest(http.MethodGet, "/api/events/123/payment-session", nil)
		rr := httptest.NewRecorder()
		h.HandleEventPaymentSuccess(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Missing session_id parameter")
	})

	t.Run("InvalidEventID_Returns400", func(t *testing.T) {
		h := &EventPaymentHandler{stripe: new(MockStripeService)}
		req := httptest.NewRequest(http.MethodGet, "/api/events/bad-id/payment-session?session_id=sess_123", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		req = withURLParam(req, "id", "bad-id")
		rr := httptest.NewRecorder()
		h.HandleEventPaymentSuccess(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid event ID")
	})

	t.Run("StripeSessionRetrievalFails_Returns500", func(t *testing.T) {
		mockStripe := new(MockStripeService)
		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := &EventPaymentHandler{cfg: cfg, stripe: mockStripe}

		eventID := uuid.New()
		userID := uuid.New()
		req := httptest.NewRequest(http.MethodGet,
			fmt.Sprintf("/api/events/%s/payment-session?session_id=cs_nonexistent", eventID.String()), nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		req = withURLParam(req, "id", eventID.String())
		mockStripe.On("GetCheckoutSession", "cs_nonexistent", mock.Anything).Return(nil, assert.AnError)

		rr := httptest.NewRecorder()
		h.HandleEventPaymentSuccess(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to retrieve payment session")
	})
}
