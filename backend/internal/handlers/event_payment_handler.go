package handlers

import (
	"log/slog"
	"net/http"

	"github.com/tiagofur/solennix-backend/internal/config"
)

const legacyEventPaymentBlockedMessage = "Client payments via Stripe are no longer supported."

// EventPaymentHandler blocks the legacy Stripe checkout flow for organizer-client payments.
type EventPaymentHandler struct {
	eventRepo   FullEventRepository
	paymentRepo FullPaymentRepository
	stripe      StripeService
	cfg         *config.Config
}

func NewEventPaymentHandler(
	eventRepo FullEventRepository,
	paymentRepo FullPaymentRepository,
	stripeService StripeService,
	cfg *config.Config,
) *EventPaymentHandler {
	return &EventPaymentHandler{
		eventRepo:   eventRepo,
		paymentRepo: paymentRepo,
		stripe:      stripeService,
		cfg:         cfg,
	}
}

// CreateEventCheckoutSession blocks the legacy Stripe checkout path.
// POST /api/events/{id}/checkout-session
func (h *EventPaymentHandler) CreateEventCheckoutSession(w http.ResponseWriter, r *http.Request) {
	slog.Warn("Blocked legacy event payment checkout session request")
	writeError(w, http.StatusGone, legacyEventPaymentBlockedMessage)
}

// HandleEventPaymentSuccess blocks the legacy event payment session lookup path.
// GET /api/events/{id}/payment-session?session_id=xxx
func (h *EventPaymentHandler) HandleEventPaymentSuccess(w http.ResponseWriter, r *http.Request) {
	slog.Warn("Blocked legacy event payment session lookup request")
	writeError(w, http.StatusGone, legacyEventPaymentBlockedMessage)
}

