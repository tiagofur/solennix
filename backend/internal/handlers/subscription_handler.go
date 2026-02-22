package handlers

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/webhook"
	"github.com/tiagofur/eventosapp-backend/internal/config"
	"github.com/tiagofur/eventosapp-backend/internal/middleware"
	"github.com/tiagofur/eventosapp-backend/internal/repository"
)

type SubscriptionHandler struct {
	userRepo *repository.UserRepo
	cfg      *config.Config
}

func NewSubscriptionHandler(userRepo *repository.UserRepo, cfg *config.Config) *SubscriptionHandler {
	stripe.Key = cfg.StripeSecretKey
	return &SubscriptionHandler{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (h *SubscriptionHandler) CreateCheckoutSession(w http.ResponseWriter, r *http.Request) {
	if h.cfg.StripeSecretKey == "" || h.cfg.StripeProPriceID == "" {
		writeError(w, http.StatusInternalServerError, "Stripe is not configured on this server")
		return
	}

	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "User not found")
		return
	}

	domain := h.cfg.FrontendURL

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(h.cfg.StripeProPriceID),
				Quantity: stripe.Int64(1),
			},
		},
		Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL:        stripe.String(domain + "/dashboard?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripe.String(domain + "/pricing"),
		ClientReferenceID: stripe.String(user.ID.String()),
	}

	if user.StripeCustomerID != nil && *user.StripeCustomerID != "" {
		params.Customer = stripe.String(*user.StripeCustomerID)
	} else {
		params.CustomerEmail = stripe.String(user.Email)
	}

	s, err := session.New(params)
	if err != nil {
		slog.Error("Failed to create checkout session", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create checkout session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url": s.URL,
	})
}

func (h *SubscriptionHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	endpointSecret := h.cfg.StripeWebhookSecret
	if endpointSecret == "" {
		slog.Error("Webhook secret not configured")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	signatureHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, signatureHeader, endpointSecret)
	if err != nil {
		slog.Error("Failed to verify webhook signature", "error", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Handle the event
	switch event.Type {
	case "checkout.session.completed":
		var s stripe.CheckoutSession
		err := json.Unmarshal(event.Data.Raw, &s)
		if err != nil {
			slog.Error("Error parsing webhook JSON", "error", err)
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		if s.ClientReferenceID != "" {
			userID, err := uuid.Parse(s.ClientReferenceID)
			if err != nil {
				slog.Error("Invalid user ID in checkout session", "id", s.ClientReferenceID)
				break
			}
			var customerID *string
			if s.Customer != nil {
				customerID = &s.Customer.ID
			}

			err = h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "premium", customerID)
			if err != nil {
				slog.Error("Failed to update user plan", "error", err)
			} else {
				slog.Info("Successfully updated user to premium", "user_id", userID)
			}
		}

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		err := json.Unmarshal(event.Data.Raw, &sub)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		// If needed, we could fetch user by stripe_customer_id and downgrade to basic.
	}

	w.WriteHeader(http.StatusOK)
}

func (h *SubscriptionHandler) DebugUpgrade(w http.ResponseWriter, r *http.Request) {
	// ONLY FOR DEVELOPMENT
	if h.cfg.Environment == "production" {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}

	userID := middleware.GetUserID(r.Context())
	err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "premium", nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to upgrade user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Plan successfully upgraded to premium (debug)",
	})
}
