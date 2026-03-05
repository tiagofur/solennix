package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

func TestEventPaymentHandler(t *testing.T) {
	t.Run("NewEventPaymentHandler", func(t *testing.T) {
		cfg := &config.Config{}
		h := NewEventPaymentHandler(nil, nil, cfg)
		if h == nil {
			t.Fatal("NewEventPaymentHandler returned nil")
		}
	})

	t.Run("CreateEventCheckoutSession_StripeNotConfigured", func(t *testing.T) {
		cfg := &config.Config{StripeSecretKey: ""}
		h := &EventPaymentHandler{cfg: cfg}

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

	t.Run("CreateEventCheckoutSession_EventNotFound", func(t *testing.T) {
		pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
		if err != nil {
			t.Skipf("pgxpool.New failed: %v", err)
		}
		pool.Close()

		cfg := &config.Config{StripeSecretKey: "sk_test_fake"}
		h := NewEventPaymentHandler(repository.NewEventRepo(pool), repository.NewPaymentRepo(pool), cfg)

		id := uuid.New()
		req := httptest.NewRequest(http.MethodPost, "/api/events/"+id.String()+"/checkout-session", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		req = withURLParam(req, "id", id.String())
		rr := httptest.NewRecorder()
		h.CreateEventCheckoutSession(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNotFound)
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
