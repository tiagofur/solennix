package handlers

import (
	"fmt"
	"log/slog"
	"math"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
)

// EventPaymentHandler handles Stripe checkout for event payments
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
	stripe.Key = cfg.StripeSecretKey
	return &EventPaymentHandler{
		eventRepo:   eventRepo,
		paymentRepo: paymentRepo,
		stripe:      stripeService,
		cfg:         cfg,
	}
}

// CreateEventCheckoutSession creates a Stripe checkout session for an event payment
// POST /api/events/{id}/checkout-session
func (h *EventPaymentHandler) CreateEventCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if h.cfg.StripeSecretKey == "" {
		writeError(w, http.StatusServiceUnavailable, "Stripe payments are not configured")
		return
	}

	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Get event details
	event, err := h.eventRepo.GetByID(r.Context(), eventID, userID)
	if err != nil {
		slog.Error("Failed to get event", "error", err, "event_id", eventID)
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	// Validate event can be paid
	if event.Status == "cancelled" {
		writeError(w, http.StatusBadRequest, "Cannot pay for a cancelled event")
		return
	}

	if event.TotalAmount <= 0 {
		writeError(w, http.StatusBadRequest, "Event total amount must be greater than zero")
		return
	}

	// Calculate amount in cents (Stripe uses smallest currency unit)
	// Use math.Round to avoid float truncation (e.g. 19.99*100 = 1998.999... → 1999)
	amountCents := int64(math.Round(event.TotalAmount * 100))

	// Build description
	description := fmt.Sprintf("Evento: %s", event.ServiceType)
	if event.EventDate != "" {
		description = fmt.Sprintf("%s - Fecha: %s", description, event.EventDate)
	}

	// Create Stripe checkout session
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("mxn"), // Change to your currency
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(description),
						Description: stripe.String(fmt.Sprintf("Evento para %d personas", event.NumPeople)),
					},
					UnitAmount: stripe.Int64(amountCents),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(fmt.Sprintf("%s/events/%s/payment-success?session_id={CHECKOUT_SESSION_ID}", h.cfg.FrontendURL, eventID.String())),
		CancelURL:  stripe.String(fmt.Sprintf("%s/events/%s/summary", h.cfg.FrontendURL, eventID.String())),
		Metadata: map[string]string{
			"event_id": eventID.String(),
			"user_id":  userID.String(),
			"type":     "event_payment",
		},
	}

	// Pre-fill client email if available (don't send empty string to Stripe)
	if event.Client != nil && event.Client.Email != nil && *event.Client.Email != "" {
		params.CustomerEmail = event.Client.Email
	}

	sess, err := h.stripe.NewCheckoutSession(params)
	if err != nil {
		slog.Error("Failed to create Stripe checkout session", "error", err, "event_id", eventID)
		writeError(w, http.StatusInternalServerError, "Failed to create payment session")
		return
	}

	slog.Info("Created Stripe checkout session",
		"session_id", sess.ID,
		"event_id", eventID,
		"amount", event.TotalAmount,
	)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session_id": sess.ID,
		"url":        sess.URL,
	})
}

// HandleEventPaymentSuccess retrieves the Stripe session after successful payment
// GET /api/events/{id}/payment-session?session_id=xxx
func (h *EventPaymentHandler) HandleEventPaymentSuccess(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		writeError(w, http.StatusBadRequest, "Missing session_id parameter")
		return
	}

	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Retrieve the session from Stripe
	sess, err := h.stripe.GetCheckoutSession(sessionID, nil)
	if err != nil {
		slog.Error("Failed to retrieve Stripe session", "error", err, "session_id", sessionID)
		writeError(w, http.StatusInternalServerError, "Failed to retrieve payment session")
		return
	}

	// Verify the session belongs to this event
	if sess.Metadata["event_id"] != eventID.String() {
		writeError(w, http.StatusBadRequest, "Session does not match event")
		return
	}

	if sess.Metadata["user_id"] != userID.String() {
		writeError(w, http.StatusForbidden, "Unauthorized")
		return
	}

	var customerEmail string
	if sess.CustomerDetails != nil {
		customerEmail = sess.CustomerDetails.Email
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"session_id":     sess.ID,
		"payment_status": sess.PaymentStatus,
		"amount_total":   float64(sess.AmountTotal) / 100.0,
		"customer_email": customerEmail,
	})
}
