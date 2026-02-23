package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	stripeBilling "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/webhook"
	"github.com/tiagofur/eventosapp-backend/internal/config"
	"github.com/tiagofur/eventosapp-backend/internal/middleware"
	"github.com/tiagofur/eventosapp-backend/internal/repository"
)

// SubscriptionHandler handles SaaS subscription flows for both
// web (Stripe) and mobile (Apple/Google via RevenueCat).
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

// ─────────────────────────────────────────────
// WEB: Stripe Checkout (Subscribe)
// POST /api/subscriptions/checkout-session
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// WEB: Stripe Customer Portal (Manage subscription)
// POST /api/subscriptions/portal-session
// ─────────────────────────────────────────────

func (h *SubscriptionHandler) CreatePortalSession(w http.ResponseWriter, r *http.Request) {
	if h.cfg.StripeSecretKey == "" {
		writeError(w, http.StatusInternalServerError, "Stripe is not configured on this server")
		return
	}

	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "User not found")
		return
	}

	if user.StripeCustomerID == nil || *user.StripeCustomerID == "" {
		writeError(w, http.StatusBadRequest, "No Stripe customer associated with this account. Please subscribe first.")
		return
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(*user.StripeCustomerID),
		ReturnURL: stripe.String(h.cfg.FrontendURL + "/settings?tab=subscription"),
	}
	if h.cfg.StripePortalConfigID != "" {
		params.Configuration = stripe.String(h.cfg.StripePortalConfigID)
	}

	ps, err := stripeBilling.New(params)
	if err != nil {
		slog.Error("Failed to create portal session", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create billing portal session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"url": ps.URL,
	})
}

// ─────────────────────────────────────────────
// WEB: Stripe Webhook
// POST /api/subscriptions/webhook/stripe
// ─────────────────────────────────────────────

func (h *SubscriptionHandler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	endpointSecret := h.cfg.StripeWebhookSecret
	if endpointSecret == "" {
		slog.Error("Stripe webhook secret not configured")
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), endpointSecret)
	if err != nil {
		slog.Error("Failed to verify Stripe webhook signature", "error", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var s stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &s); err != nil {
			slog.Error("Error parsing checkout.session.completed JSON", "error", err)
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
			if err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "pro", customerID); err != nil {
				slog.Error("Failed to update user plan after checkout", "error", err)
			} else {
				slog.Info("User upgraded to pro via Stripe checkout", "user_id", userID)
			}
		}

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		// sync status (e.g. past_due, active)
		slog.Info("Stripe subscription updated", "status", sub.Status, "customer", sub.Customer.ID)

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		// Downgrade user to basic plan when subscription is cancelled
		if err := h.userRepo.UpdatePlanByStripeCustomerID(r.Context(), sub.Customer.ID, "basic"); err != nil {
			slog.Error("Failed to downgrade user after subscription deletion", "error", err)
		} else {
			slog.Info("User downgraded to basic after Stripe subscription cancellation", "customer_id", sub.Customer.ID)
		}
	}

	w.WriteHeader(http.StatusOK)
}

// ─────────────────────────────────────────────
// MOBILE: RevenueCat Webhook (Apple/Google)
// POST /api/subscriptions/webhook/revenuecat
// ─────────────────────────────────────────────

// revenueCatEvent is a minimal struct for the RevenueCat webhook v2 payload.
// See: https://www.revenuecat.com/docs/webhooks
type revenueCatEvent struct {
	Event struct {
		Type           string     `json:"type"`
		AppUserID      string     `json:"app_user_id"`
		ProductID      string     `json:"product_id"`
		Store          string     `json:"store"`       // APP_STORE | PLAY_STORE | STRIPE
		PeriodType     string     `json:"period_type"` // NORMAL | TRIAL | INTRO
		ExpirationAtMS *int64     `json:"-"`
		ExpireAt       *time.Time `json:"expiration_at_ms_epoch"`
	} `json:"event"`
}

func (h *SubscriptionHandler) RevenueCatWebhook(w http.ResponseWriter, r *http.Request) {
	// RevenueCat sends the webhook secret as the Authorization header
	authHeader := r.Header.Get("Authorization")
	if h.cfg.RevenueCatWebhookSecret != "" {
		if subtle.ConstantTimeCompare([]byte(authHeader), []byte(h.cfg.RevenueCatWebhookSecret)) == 0 {
			slog.Warn("Invalid RevenueCat webhook authorization")
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
	}

	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	var rcEvent revenueCatEvent
	if err := json.Unmarshal(payload, &rcEvent); err != nil {
		slog.Error("Failed to parse RevenueCat webhook payload", "error", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	evt := rcEvent.Event
	slog.Info("RevenueCat webhook received", "type", evt.Type, "app_user_id", evt.AppUserID, "store", evt.Store)

	// The RevenueCat app_user_id is set to the user's UUID from our backend
	userID, err := uuid.Parse(evt.AppUserID)
	if err != nil {
		// Could be an anonymous ID or alias — log and ignore gracefully
		slog.Warn("RevenueCat event with unparseable app_user_id (likely anonymous)", "app_user_id", evt.AppUserID)
		w.WriteHeader(http.StatusOK)
		return
	}

	switch evt.Type {
	case "INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION":
		// User has an active subscription — upgrade to pro
		if err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "pro", nil); err != nil {
			slog.Error("Failed to upgrade user plan via RevenueCat", "user_id", userID, "error", err)
		} else {
			slog.Info("User upgraded to pro via RevenueCat", "user_id", userID, "store", evt.Store)
		}

	case "CANCELLATION", "EXPIRATION", "BILLING_ISSUE":
		// Subscription ended or payment failed — downgrade to basic
		if err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "basic", nil); err != nil {
			slog.Error("Failed to downgrade user plan via RevenueCat", "user_id", userID, "error", err)
		} else {
			slog.Info("User downgraded to basic via RevenueCat", "user_id", userID, "event", evt.Type)
		}

	case "PRODUCT_CHANGE":
		slog.Info("RevenueCat product change event received (plan change)", "user_id", userID)
	}

	w.WriteHeader(http.StatusOK)
}

// ─────────────────────────────────────────────
// DEV: Debug upgrade (development only)
// POST /api/subscriptions/debug-upgrade
// ─────────────────────────────────────────────

func (h *SubscriptionHandler) DebugUpgrade(w http.ResponseWriter, r *http.Request) {
	if h.cfg.Environment == "production" {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}

	userID := middleware.GetUserID(r.Context())
	err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "pro", nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to upgrade user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Plan successfully upgraded to pro (debug)",
	})
}

// ─────────────────────────────────────────────
// DEV: Debug downgrade (development only)
// POST /api/subscriptions/debug-downgrade
// ─────────────────────────────────────────────

func (h *SubscriptionHandler) DebugDowngrade(w http.ResponseWriter, r *http.Request) {
	if h.cfg.Environment == "production" {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}

	userID := middleware.GetUserID(r.Context())

	// Pass nil for stripe customer ID to leave it untouched
	err := h.userRepo.UpdatePlanAndStripeID(r.Context(), userID, "basic", nil)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to downgrade user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Plan successfully downgraded to basic (debug)",
	})
}

// GetSubscriptionStatus returns the current plan info for the authenticated user.
// GET /api/subscriptions/status
func (h *SubscriptionHandler) GetSubscriptionStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "User not found")
		return
	}

	type planStatus struct {
		Plan             string `json:"plan"`
		HasStripeAccount bool   `json:"has_stripe_account"`
	}

	writeJSON(w, http.StatusOK, planStatus{
		Plan:             user.Plan,
		HasStripeAccount: user.StripeCustomerID != nil && *user.StripeCustomerID != "",
	})
}
