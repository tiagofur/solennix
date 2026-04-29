package handlers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// EventPublicLinkRepository defines the operations needed for event public
// (client-facing) links. Matches repository.EventPublicLinkRepo.
type EventPublicLinkRepository interface {
	Create(ctx context.Context, link *models.EventPublicLink) error
	GetActiveByEventID(ctx context.Context, eventID, userID uuid.UUID) (*models.EventPublicLink, error)
	GetByToken(ctx context.Context, token string) (*models.EventPublicLink, error)
	Revoke(ctx context.Context, eventID, userID uuid.UUID) error
}

// EventPublicLinkHandler serves the authenticated CRUD endpoints that
// organizers use to manage the share link, plus the public read-only
// portal that the end client sees (PRD/12 feature A).
type EventPublicLinkHandler struct {
	linkRepo    EventPublicLinkRepository
	eventRepo   FullEventRepository
	clientRepo  ClientRepository
	userRepo    FullUserRepository
	paymentRepo FullPaymentRepository
	frontendURL string
}

// NewEventPublicLinkHandler assembles the handler with all repositories it
// needs. The public endpoint joins across events / clients / users /
// payments, so every one of those is an input.
func NewEventPublicLinkHandler(
	linkRepo EventPublicLinkRepository,
	eventRepo FullEventRepository,
	clientRepo ClientRepository,
	userRepo FullUserRepository,
	paymentRepo FullPaymentRepository,
	frontendURL string,
) *EventPublicLinkHandler {
	return &EventPublicLinkHandler{
		linkRepo:    linkRepo,
		eventRepo:   eventRepo,
		clientRepo:  clientRepo,
		userRepo:    userRepo,
		paymentRepo: paymentRepo,
		frontendURL: frontendURL,
	}
}

// --- Authenticated endpoints (scoped under /api/events/{id}/public-link) ---

// CreateOrRotate creates a new active public link for the event, revoking
// any previously active one. Idempotent-ish: repeated calls rotate the
// token (and therefore invalidate any URL already shared with the client).
//
// POST /api/events/{id}/public-link
// Body (optional): {"ttl_days": int?}  — null / absent = never expires.
func (h *EventPublicLinkHandler) CreateOrRotate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, ok := h.parseEventID(w, r)
	if !ok {
		return
	}

	// Confirm the event belongs to the organizer before creating a share
	// link. Without this guard, POST /api/events/{any-id}/public-link
	// could leak across tenants.
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	var req struct {
		TTLDays *int `json:"ttl_days"`
	}
	_ = decodeJSON(r, &req)

	var expiresAt *time.Time
	if req.TTLDays != nil {
		if *req.TTLDays < 1 || *req.TTLDays > 730 {
			writeError(w, http.StatusBadRequest, "ttl_days must be between 1 and 730")
			return
		}
		exp := time.Now().UTC().Add(time.Duration(*req.TTLDays) * 24 * time.Hour)
		expiresAt = &exp
	}

	token, err := generateFormToken() // reuse the existing 256-bit hex helper
	if err != nil {
		slog.Error("Failed to generate public link token", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate link")
		return
	}

	link := &models.EventPublicLink{
		EventID:   eventID,
		UserID:    userID,
		Token:     token,
		ExpiresAt: expiresAt,
	}
	if err := h.linkRepo.Create(r.Context(), link); err != nil {
		slog.Error("Failed to create event public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create public link")
		return
	}

	link.URL = h.buildClientPortalURL(link.Token)
	writeJSON(w, http.StatusCreated, link)
}

// GetActive returns the currently active link for the event, if any.
//
// GET /api/events/{id}/public-link
func (h *EventPublicLinkHandler) GetActive(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, ok := h.parseEventID(w, r)
	if !ok {
		return
	}

	link, err := h.linkRepo.GetActiveByEventID(r.Context(), eventID, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "No active public link for this event")
			return
		}
		slog.Error("Failed to get active event public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get public link")
		return
	}

	link.URL = h.buildClientPortalURL(link.Token)
	writeJSON(w, http.StatusOK, link)
}

// Revoke marks the active link for the event as revoked. The already-
// issued URL stops working immediately.
//
// DELETE /api/events/{id}/public-link
func (h *EventPublicLinkHandler) Revoke(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, ok := h.parseEventID(w, r)
	if !ok {
		return
	}

	if err := h.linkRepo.Revoke(r.Context(), eventID, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "No active public link to revoke")
			return
		}
		slog.Error("Failed to revoke event public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to revoke public link")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// --- Public endpoint (no auth) ---

// PublicEventView is the curated read-only shape that the client sees.
// Intentionally lean: zero internal notes, zero margin data, zero other
// events. Everything here is explicitly opt-in; the organizer-side
// "visibleToClient" per-field toggles from PRD/12 will land in a later
// iteration — for v1 we return the safe default subset.
type PublicEventView struct {
	Event     PublicEventDetails   `json:"event"`
	Organizer PublicOrganizerBrand `json:"organizer"`
	Client    PublicClientInfo     `json:"client"`
	Payment   PublicPaymentSummary `json:"payment"`
}

type PublicEventDetails struct {
	ID          uuid.UUID `json:"id"`
	ServiceType string    `json:"service_type"`
	EventDate   string    `json:"event_date"`
	StartTime   *string   `json:"start_time,omitempty"`
	EndTime     *string   `json:"end_time,omitempty"`
	Location    *string   `json:"location,omitempty"`
	City        *string   `json:"city,omitempty"`
	NumPeople   int       `json:"num_people"`
	Status      string    `json:"status"`
}

type PublicOrganizerBrand struct {
	BusinessName *string `json:"business_name,omitempty"`
	LogoURL      *string `json:"logo_url,omitempty"`
	BrandColor   *string `json:"brand_color,omitempty"`
}

type PublicClientInfo struct {
	Name string `json:"name"`
}

// PublicPaymentSummary shows the client what they owe in aggregate form.
// We do NOT list individual payments in the MVP — just totals — to avoid
// leaking the organizer's cash-flow pattern while still answering the
// "how much do I still owe?" question.
type PublicPaymentSummary struct {
	Total     float64 `json:"total"`
	Paid      float64 `json:"paid"`
	Remaining float64 `json:"remaining"`
	Currency  string  `json:"currency"`
}

// GetPortalData serves the read-only client portal. No auth — the token
// is the proof of access. Responds 404 for unknown tokens and 410 Gone
// for tokens that have been revoked or expired, so the web client can
// distinguish "wrong URL" from "link was disabled by the organizer".
//
// Returns shape-based response:
//   - Gratis: basic event + organizer brand + client name + payment total
//   - Pro/Business: full response including all event details, client info, payment breakdown
//
// GET /api/public/events/{token}
func (h *EventPublicLinkHandler) GetPortalData(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	link, err := h.linkRepo.GetByToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Link not found")
			return
		}
		slog.Error("Failed to look up public link", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load portal")
		return
	}

	// Distinguish revoked/expired from active so the client UI can render
	// a "this link was disabled" message instead of a generic 404.
	if link.Status != "active" {
		writeError(w, http.StatusGone, "This link is no longer active")
		return
	}
	if link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt) {
		writeError(w, http.StatusGone, "This link has expired")
		return
	}

	event, err := h.eventRepo.GetByID(r.Context(), link.EventID, link.UserID)
	if err != nil {
		// Event was deleted while the link was still active — revoke the
		// orphan defensively and respond as gone. Ignore the revoke error
		// if any; the primary response to the client is what matters.
		_ = h.linkRepo.Revoke(r.Context(), link.EventID, link.UserID)
		writeError(w, http.StatusGone, "The event for this link no longer exists")
		return
	}

	organizer, err := h.userRepo.GetByID(r.Context(), link.UserID)
	if err != nil {
		slog.Error("Failed to load organizer for public portal", "error", err, "user_id", link.UserID)
		writeError(w, http.StatusInternalServerError, "Failed to load organizer")
		return
	}

	// Check if plan is still active (gratis is always active, paid plans check expiry)
	planActive := h.isPlanActive(organizer)

	var clientName string
	if event.ClientID != uuid.Nil {
		client, err := h.clientRepo.GetByID(r.Context(), event.ClientID, link.UserID)
		if err == nil && client != nil {
			clientName = client.Name
		}
	}

	// Aggregate payments — we expose totals only, not individual records.
	payments, err := h.paymentRepo.GetByEventID(r.Context(), link.UserID, link.EventID)
	if err != nil {
		slog.Error("Failed to load payments for public portal", "error", err, "event_id", link.EventID)
		// Non-fatal — fall back to Paid = 0 rather than blocking the whole portal.
		payments = nil
	}
	var paid float64
	for _, p := range payments {
		paid += p.Amount
	}
	remaining := event.TotalAmount - paid
	if remaining < 0 {
		remaining = 0
	}

	// Build response based on plan tier
	view := h.buildPublicEventView(organizer, planActive, event, clientName, paid, remaining)
	writeJSON(w, http.StatusOK, view)
}

// --- helpers ---

func (h *EventPublicLinkHandler) parseEventID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event id")
		return uuid.Nil, false
	}
	return eventID, true
}

func (h *EventPublicLinkHandler) buildClientPortalURL(token string) string {
	return fmt.Sprintf("%s/client/%s", strings.TrimRight(h.frontendURL, "/"), token)
}

func firstTenChars(s string) string {
	if len(s) < 10 {
		return s
	}
	return s[:10]
}

// isPlanActive checks if the organizer's subscription plan is currently active.
// Gratis plans are always active; paid plans check expiry date.
func (h *EventPublicLinkHandler) isPlanActive(organizer *models.User) bool {
	if organizer.Plan == "gratis" {
		return true
	}
	if organizer.PlanExpiresAt == nil {
		return true // No expiry set, plan is active
	}
	return time.Now().Before(*organizer.PlanExpiresAt)
}

// buildPublicEventView constructs the PublicEventView response based on plan tier.
// Gratis: returns basic event details and payment summary only.
// Pro/Business: returns full event details, client info, and payment summary.
func (h *EventPublicLinkHandler) buildPublicEventView(
	organizer *models.User,
	planActive bool,
	event *models.Event,
	clientName string,
	paid float64,
	remaining float64,
) PublicEventView {
	paymentSummary := PublicPaymentSummary{
		Total:     event.TotalAmount,
		Paid:      paid,
		Remaining: remaining,
		Currency:  "MXN",
	}

	organizerBrand := PublicOrganizerBrand{
		BusinessName: organizer.BusinessName,
		LogoURL:      organizer.LogoURL,
		BrandColor:   organizer.BrandColor,
	}

	// Gratis (or expired plan): basic shape
	if organizer.Plan == "gratis" || !planActive {
		return PublicEventView{
			Event: PublicEventDetails{
				ID:        event.ID,
				EventDate: firstTenChars(event.EventDate),
				Status:    event.Status,
				// Redact: ServiceType, StartTime, EndTime, Location, City, NumPeople
			},
			Organizer: organizerBrand,
			Client:    PublicClientInfo{}, // No client details for free tier
			Payment:   paymentSummary,
		}
	}

	// Pro/Business: full shape
	return PublicEventView{
		Event: PublicEventDetails{
			ID:          event.ID,
			ServiceType: event.ServiceType,
			EventDate:   firstTenChars(event.EventDate),
			StartTime:   event.StartTime,
			EndTime:     event.EndTime,
			Location:    event.Location,
			City:        event.City,
			NumPeople:   event.NumPeople,
			Status:      event.Status,
		},
		Organizer: organizerBrand,
		Client: PublicClientInfo{
			Name: clientName,
		},
		Payment: paymentSummary,
	}
}
