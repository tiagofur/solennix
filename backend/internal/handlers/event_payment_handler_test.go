package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
)

func TestEventPaymentHandler(t *testing.T) {
	t.Run("NewEventPaymentHandler", func(t *testing.T) {
		cfg := &config.Config{}
		h := NewEventPaymentHandler(nil, nil, nil, cfg)
		if h == nil {
			t.Fatal("NewEventPaymentHandler returned nil")
		}
	})
}

func TestEventPaymentHandler_CreateEventCheckoutSession_Blocked(t *testing.T) {
	h := &EventPaymentHandler{cfg: &config.Config{StripeSecretKey: "sk_test_fake"}}
	req := httptest.NewRequest(http.MethodPost, "/api/events/123/checkout-session", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	req = withURLParam(req, "id", uuid.New().String())
	w := httptest.NewRecorder()

	h.CreateEventCheckoutSession(w, req)

	assert.Equal(t, http.StatusGone, w.Code)
	assert.Contains(t, w.Body.String(), legacyEventPaymentBlockedMessage)
}

func TestEventPaymentHandler_HandleEventPaymentSuccess_Blocked(t *testing.T) {
	h := &EventPaymentHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/events/123/payment-session?session_id=cs_test", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	req = withURLParam(req, "id", uuid.New().String())
	w := httptest.NewRecorder()

	h.HandleEventPaymentSuccess(w, req)

	assert.Equal(t, http.StatusGone, w.Code)
	assert.Contains(t, w.Body.String(), legacyEventPaymentBlockedMessage)
}
