package handlers

import (
	"context"
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
	stripeSub "github.com/stripe/stripe-go/v81/subscription"
	"github.com/stripe/stripe-go/v81/webhook"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// EventRepository defines methods for event data access
type EventRepository interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error)
	Update(ctx context.Context, e *models.Event) error
}

// PaymentRepository defines methods for payment data access
type PaymentRepository interface {
	Create(ctx context.Context, p *models.Payment) error
}

// SubscriptionHandler handles SaaS subscription flows for both
// web (Stripe) and mobile (Apple/Google via RevenueCat).
// Also handles event payment webhooks.
type SubscriptionHandler struct {
	userRepo    UserRepository
	subRepo     SubscriptionRepository
	eventRepo   EventRepository
	paymentRepo PaymentRepository
	cfg         *config.Config
}

func NewSubscriptionHandler(
	userRepo UserRepository,
	subRepo SubscriptionRepository,
	eventRepo EventRepository,
	paymentRepo PaymentRepository,
	cfg *config.Config,
) *SubscriptionHandler {
	stripe.Key = cfg.StripeSecretKey
	return &SubscriptionHandler{
		userRepo:    userRepo,
		subRepo:     subRepo,
		eventRepo:   eventRepo,
		paymentRepo: paymentRepo,
		cfg:         cfg,
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
		writeError(w, http.StatusServiceUnavailable, "Request body too large")
		return
	}

	endpointSecret := h.cfg.StripeWebhookSecret
	if endpointSecret == "" {
		slog.Error("Stripe webhook secret not configured")
		writeError(w, http.StatusInternalServerError, "Webhook not configured")
		return
	}

	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), endpointSecret)
	if err != nil {
		slog.Error("Failed to verify Stripe webhook signature", "error", err)
		writeError(w, http.StatusBadRequest, "Invalid signature")
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var s stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &s); err != nil {
			slog.Error("Error parsing checkout.session.completed JSON", "error", err)
			writeError(w, http.StatusBadRequest, "Invalid event data")
			return
		}

		// Check if this is an event payment or subscription
		paymentType := s.Metadata["type"]

		if paymentType == "event_payment" {
			h.handleEventPayment(r.Context(), &s)
		} else if s.ClientReferenceID != "" {
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

			// Upsert subscription record
			if h.subRepo != nil && s.Subscription != nil {
				subRecord := &models.Subscription{
					UserID:        userID,
					Provider:      "stripe",
					ProviderSubID: &s.Subscription.ID,
					Plan:          "pro",
					Status:        "active",
				}
				// Fetch Stripe subscription for period dates
				if stripeSubData, err := stripeSub.Get(s.Subscription.ID, nil); err == nil {
					start := time.Unix(stripeSubData.CurrentPeriodStart, 0)
					end := time.Unix(stripeSubData.CurrentPeriodEnd, 0)
					subRecord.CurrentPeriodStart = &start
					subRecord.CurrentPeriodEnd = &end
				}
				if err := h.subRepo.Upsert(r.Context(), subRecord); err != nil {
					slog.Error("Failed to upsert subscription after checkout", "error", err)
				}
			}
		}

	case "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid subscription data")
			return
		}
		slog.Info("Stripe subscription updated", "status", sub.Status, "customer", sub.Customer.ID)

		// Map Stripe status to action
		switch sub.Status {
		case stripe.SubscriptionStatusActive:
			// Keep user on pro, update subscription record
			if h.subRepo != nil {
				start := time.Unix(sub.CurrentPeriodStart, 0)
				end := time.Unix(sub.CurrentPeriodEnd, 0)
				if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), sub.ID, "active", &start, &end); err != nil {
					slog.Error("Failed to update subscription status to active", "error", err)
				}
			}
		case stripe.SubscriptionStatusPastDue:
			// Grace period: keep on pro, but mark subscription as past_due
			if h.subRepo != nil {
				if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), sub.ID, "past_due", nil, nil); err != nil {
					slog.Error("Failed to update subscription status to past_due", "error", err)
				}
			}
		case stripe.SubscriptionStatusCanceled:
			// Keep on pro until period end, mark canceled
			if h.subRepo != nil {
				if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), sub.ID, "canceled", nil, nil); err != nil {
					slog.Error("Failed to update subscription status to canceled", "error", err)
				}
			}
		case stripe.SubscriptionStatusUnpaid:
			// Downgrade to basic
			if err := h.userRepo.UpdatePlanByStripeCustomerID(r.Context(), sub.Customer.ID, "basic"); err != nil {
				slog.Error("Failed to downgrade user after unpaid subscription", "error", err)
			}
			if h.subRepo != nil {
				if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), sub.ID, "canceled", nil, nil); err != nil {
					slog.Error("Failed to update subscription status to canceled (unpaid)", "error", err)
				}
			}
		}

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid subscription data")
			return
		}
		if err := h.userRepo.UpdatePlanByStripeCustomerID(r.Context(), sub.Customer.ID, "basic"); err != nil {
			slog.Error("Failed to downgrade user after subscription deletion", "error", err)
		} else {
			slog.Info("User downgraded to basic after Stripe subscription cancellation", "customer_id", sub.Customer.ID)
		}
		if h.subRepo != nil {
			if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), sub.ID, "canceled", nil, nil); err != nil {
				slog.Error("Failed to update subscription record after deletion", "error", err)
			}
		}

	case "invoice.payment_failed":
		var invoice stripe.Invoice
		if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
			slog.Error("Error parsing invoice.payment_failed JSON", "error", err)
			break
		}
		slog.Warn("Stripe invoice payment failed", "customer", invoice.Customer.ID, "invoice", invoice.ID)
		if h.subRepo != nil && invoice.Subscription != nil {
			if err := h.subRepo.UpdateStatusByProviderSubID(r.Context(), invoice.Subscription.ID, "past_due", nil, nil); err != nil {
				slog.Error("Failed to update subscription status after payment failure", "error", err)
			}
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
	if h.cfg.RevenueCatWebhookSecret == "" {
		slog.Error("RevenueCat webhook secret not configured")
		writeError(w, http.StatusInternalServerError, "Webhook not configured")
		return
	}
	authHeader := r.Header.Get("Authorization")
	if subtle.ConstantTimeCompare([]byte(authHeader), []byte(h.cfg.RevenueCatWebhookSecret)) == 0 {
		slog.Warn("Invalid RevenueCat webhook authorization")
		writeError(w, http.StatusUnauthorized, "Invalid authorization")
		return
	}

	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "Request body too large")
		return
	}

	var rcEvent revenueCatEvent
	if err := json.Unmarshal(payload, &rcEvent); err != nil {
		slog.Error("Failed to parse RevenueCat webhook payload", "error", err)
		writeError(w, http.StatusBadRequest, "Invalid payload")
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

	type subscriptionInfo struct {
		Status             string  `json:"status"`
		Provider           string  `json:"provider"`
		CurrentPeriodEnd   *string `json:"current_period_end,omitempty"`
		CancelAtPeriodEnd  bool    `json:"cancel_at_period_end"`
	}

	type planStatus struct {
		Plan             string            `json:"plan"`
		HasStripeAccount bool              `json:"has_stripe_account"`
		Subscription     *subscriptionInfo `json:"subscription,omitempty"`
	}

	resp := planStatus{
		Plan:             user.Plan,
		HasStripeAccount: user.StripeCustomerID != nil && *user.StripeCustomerID != "",
	}

	// Try to get subscription details from DB
	if h.subRepo != nil {
		if sub, err := h.subRepo.GetByUserID(r.Context(), userID); err == nil {
			info := &subscriptionInfo{
				Status:   sub.Status,
				Provider: sub.Provider,
			}
			if sub.CurrentPeriodEnd != nil {
				formatted := sub.CurrentPeriodEnd.Format(time.RFC3339)
				info.CurrentPeriodEnd = &formatted
			}

			// Check cancel_at_period_end from Stripe if user has a stripe customer
			if user.StripeCustomerID != nil && *user.StripeCustomerID != "" && sub.ProviderSubID != nil {
				if stripeSub, err := stripeSub.Get(*sub.ProviderSubID, nil); err == nil {
					info.CancelAtPeriodEnd = stripeSub.CancelAtPeriodEnd
					// Also update period end from live data
					end := time.Unix(stripeSub.CurrentPeriodEnd, 0).Format(time.RFC3339)
					info.CurrentPeriodEnd = &end
				}
			}

			resp.Subscription = info
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

// handleEventPayment processes a completed event payment from Stripe webhook
func (h *SubscriptionHandler) handleEventPayment(ctx context.Context, session *stripe.CheckoutSession) {
	eventIDStr := session.Metadata["event_id"]
	userIDStr := session.Metadata["user_id"]

	if eventIDStr == "" || userIDStr == "" {
		slog.Error("Event payment webhook missing metadata", "session_id", session.ID)
		return
	}

	eventID, err := uuid.Parse(eventIDStr)
	if err != nil {
		slog.Error("Invalid event ID in webhook metadata", "event_id", eventIDStr, "error", err)
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		slog.Error("Invalid user ID in webhook metadata", "user_id", userIDStr, "error", err)
		return
	}

	// Get event details
	event, err := h.eventRepo.GetByID(ctx, eventID, userID)
	if err != nil {
		slog.Error("Failed to get event for payment webhook", "event_id", eventID, "error", err)
		return
	}

	// Create payment record
	amountPaid := float64(session.AmountTotal) / 100.0
	paymentDate := time.Now().Format("2006-01-02")

	payment := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        amountPaid,
		PaymentDate:   paymentDate,
		PaymentMethod: "stripe",
		Notes:         stringPtr("Pago online vía Stripe - Session: " + session.ID),
	}

	if err := h.paymentRepo.Create(ctx, payment); err != nil {
		slog.Error("Failed to create payment record from webhook", "event_id", eventID, "error", err)
		return
	}

	// Update event status to confirmed if it was quoted
	if event.Status == "quoted" {
		event.Status = "confirmed"
		if err := h.eventRepo.Update(ctx, event); err != nil {
			slog.Error("Failed to update event status after payment", "event_id", eventID, "error", err)
		}
	}

	slog.Info("Event payment processed successfully",
		"event_id", eventID,
		"amount", amountPaid,
		"session_id", session.ID,
		"customer_email", session.CustomerDetails.Email,
	)
}

// stringPtr is a helper to create a pointer to a string
func stringPtr(s string) *string {
	return &s
}
