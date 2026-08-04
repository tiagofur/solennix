package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// RequestLinkRepository is the persistence surface for public request links.
type RequestLinkRepository interface {
	Create(ctx context.Context, link *models.PublicRequestLink) error
	GetByToken(ctx context.Context, token string) (*models.PublicRequestLink, error)
	ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicRequestLink, error)
	Revoke(ctx context.Context, id, organizerUserID uuid.UUID) error
	Delete(ctx context.Context, id, organizerUserID uuid.UUID) error
	CountActive(ctx context.Context, organizerUserID uuid.UUID) (int, error)
	GetPool() *pgxpool.Pool
}

// RequestLinkService is the subset of PublicRequestService used by link handlers.
type RequestLinkService interface {
	CreateFromLink(ctx context.Context, token string, in services.CreatePublicRequestInput) (*models.PublicRequest, error)
}

// RequestLinkCatalog loads products for the public GET link form.
type RequestLinkCatalog interface {
	ListPublicProfileServices(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
	ListActiveForPublicProfileSettings(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
}

// RequestLinkProfileLookup checks whether the organizer public profile is on.
type RequestLinkProfileLookup interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}

// RequestLinkUserLookup loads organizer branding / plan for link endpoints.
type RequestLinkUserLookup interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

// RequestLinkHandler manages shareable public request links (Solicitudes).
type RequestLinkHandler struct {
	linkRepo    RequestLinkRepository
	svc         RequestLinkService
	productRepo RequestLinkCatalog
	profileRepo RequestLinkProfileLookup
	userRepo    RequestLinkUserLookup
	frontendURL string
	pool        *pgxpool.Pool
}

// NewRequestLinkHandler wires organizer + public link endpoints.
func NewRequestLinkHandler(
	linkRepo RequestLinkRepository,
	svc RequestLinkService,
	productRepo RequestLinkCatalog,
	profileRepo RequestLinkProfileLookup,
	userRepo RequestLinkUserLookup,
	frontendURL string,
	pool *pgxpool.Pool,
) *RequestLinkHandler {
	return &RequestLinkHandler{
		linkRepo:    linkRepo,
		svc:         svc,
		productRepo: productRepo,
		profileRepo: profileRepo,
		userRepo:    userRepo,
		frontendURL: frontendURL,
		pool:        pool,
	}
}

const basicRequestLinkLimit = 3

// --- Authenticated endpoints ---

// GenerateLink creates a new shareable request link.
// POST /api/organizers/me/request-links
func (h *RequestLinkHandler) GenerateLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Label      *string `json:"label"`
		TTLDays    *int    `json:"ttl_days"`
		MaxUses    *int    `json:"max_uses"`
		SubmitMode *string `json:"submit_mode"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		// Empty body is allowed.
		req = struct {
			Label      *string `json:"label"`
			TTLDays    *int    `json:"ttl_days"`
			MaxUses    *int    `json:"max_uses"`
			SubmitMode *string `json:"submit_mode"`
		}{}
	}

	ttlDays := 7
	if req.TTLDays != nil {
		ttlDays = *req.TTLDays
	}
	if ttlDays < 1 || ttlDays > 30 {
		writeError(w, http.StatusBadRequest, "ttl_days must be between 1 and 30")
		return
	}

	label := sanitizeOptionalString(req.Label)
	if label != nil {
		if err := validateStringLength("label", *label, MaxNameLength); err != nil {
			writeError(w, http.StatusBadRequest, validationErrorMessage(r.Context(), err))
			return
		}
	}

	mode := models.SubmitModeAutoEvent
	if req.SubmitMode != nil && strings.TrimSpace(*req.SubmitMode) != "" {
		switch models.SubmitMode(strings.TrimSpace(*req.SubmitMode)) {
		case models.SubmitModeStandard, models.SubmitModeAutoQuote, models.SubmitModeAutoEvent:
			mode = models.SubmitMode(strings.TrimSpace(*req.SubmitMode))
		default:
			writeError(w, http.StatusBadRequest, "submit_mode must be standard, auto_quote, or auto_event")
			return
		}
	}

	if req.MaxUses != nil && *req.MaxUses < 1 {
		writeError(w, http.StatusBadRequest, "max_uses must be >= 1 when set")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		slog.Error("request_link: get user failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	token, err := generateRequestLinkToken()
	if err != nil {
		slog.Error("request_link: token generation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to generate link")
		return
	}

	expires := time.Now().UTC().Add(time.Duration(ttlDays) * 24 * time.Hour)
	link := &models.PublicRequestLink{
		OrganizerUserID: userID,
		Token:           token,
		Label:           label,
		Status:          models.PublicRequestLinkActive,
		SubmitMode:      mode,
		MaxUses:         req.MaxUses,
		ExpiresAt:       &expires,
	}

	countSQL := `SELECT COUNT(*) FROM public_request_links
		WHERE organizer_user_id = $1 AND status = 'active'
		  AND (expires_at IS NULL OR expires_at > NOW())`

	plan := normalizePlan(user.Plan)
	if plan == "basic" || plan == "free" {
		err := withPlanLimit(r.Context(), h.pool, userID, "public_request_links", basicRequestLinkLimit, countSQL,
			func(ctx context.Context, tx pgx.Tx) error {
				var statusStr, modeStr string
				err := tx.QueryRow(ctx, `
					INSERT INTO public_request_links
						(organizer_user_id, token, label, status, submit_mode, max_uses, expires_at)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					RETURNING id, organizer_user_id, token, label, status, submit_mode,
					          max_uses, use_count, expires_at, created_at, updated_at`,
					link.OrganizerUserID, link.Token, link.Label, string(link.Status),
					string(link.SubmitMode), link.MaxUses, link.ExpiresAt,
				).Scan(
					&link.ID, &link.OrganizerUserID, &link.Token, &link.Label,
					&statusStr, &modeStr,
					&link.MaxUses, &link.UseCount, &link.ExpiresAt, &link.CreatedAt, &link.UpdatedAt,
				)
				if err != nil {
					return err
				}
				link.Status = models.PublicRequestLinkStatus(statusStr)
				link.SubmitMode = models.SubmitMode(modeStr)
				return nil
			},
		)
		if err == errPoolNil {
			count, cErr := h.linkRepo.CountActive(r.Context(), userID)
			if cErr != nil {
				slog.Error("request_link: count active failed", "error", cErr)
				writeError(w, http.StatusInternalServerError, "Failed to check link limits")
				return
			}
			if count >= basicRequestLinkLimit {
				writePlanLimitError(w, r, "public_request_links", count, basicRequestLinkLimit)
				return
			}
			if err := h.linkRepo.Create(r.Context(), link); err != nil {
				slog.Error("request_link: create failed", "error", err)
				writeError(w, http.StatusInternalServerError, "Failed to create link")
				return
			}
		} else if err == ErrPlanLimitReached {
			count, _ := h.linkRepo.CountActive(r.Context(), userID)
			writePlanLimitError(w, r, "public_request_links", count, basicRequestLinkLimit)
			return
		} else if err != nil {
			slog.Error("request_link: create failed", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to create link")
			return
		}
	} else if err := h.linkRepo.Create(r.Context(), link); err != nil {
		slog.Error("request_link: create failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create link")
		return
	}

	link.URL = h.buildLinkURL(link.Token)
	writeJSON(w, http.StatusCreated, map[string]any{"data": link})
}

// ListLinks lists organizer request links.
// GET /api/organizers/me/request-links
func (h *RequestLinkHandler) ListLinks(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	links, err := h.linkRepo.ListByOrganizer(r.Context(), userID)
	if err != nil {
		slog.Error("request_link: list failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list links")
		return
	}
	for i := range links {
		links[i].URL = h.buildLinkURL(links[i].Token)
	}
	if links == nil {
		links = []models.PublicRequestLink{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": links})
}

// RevokeLink revokes an active link.
// POST /api/organizers/me/request-links/{id}/revoke
// DELETE /api/organizers/me/request-links/{id}
func (h *RequestLinkHandler) RevokeLink(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid link ID")
		return
	}
	if err := h.linkRepo.Revoke(r.Context(), id, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Link not found")
			return
		}
		slog.Error("request_link: revoke failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to revoke link")
		return
	}
	if r.Method == http.MethodDelete {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

// --- Public endpoints ---

// GetLinkData returns branding + catalog + submit_mode for a token.
// GET /api/public/request-links/{token}
func (h *RequestLinkHandler) GetLinkData(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
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
		slog.Error("request_link: get by token failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load link")
		return
	}
	if !services.IsRequestLinkUsable(link, time.Now().UTC()) {
		writeJSON(w, http.StatusGone, map[string]string{
			"error":   "link_invalid",
			"message": "Este enlace ya no es válido o ha expirado.",
		})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), link.OrganizerUserID)
	if err != nil {
		slog.Error("request_link: get organizer failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load link")
		return
	}

	profileEnabled := false
	if h.profileRepo != nil {
		if profile, pErr := h.profileRepo.GetByUserID(r.Context(), link.OrganizerUserID); pErr == nil && profile != nil && profile.IsEnabled {
			profileEnabled = true
		}
	}

	var products []models.Product
	if profileEnabled {
		products, err = h.productRepo.ListPublicProfileServices(r.Context(), link.OrganizerUserID)
	} else {
		products, err = h.productRepo.ListActiveForPublicProfileSettings(r.Context(), link.OrganizerUserID)
	}
	if err != nil {
		slog.Error("request_link: load catalog failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load products")
		return
	}

	// Hide prices when profile is enabled and show_prices is false.
	hidePrices := false
	if profileEnabled && h.profileRepo != nil {
		if profile, pErr := h.profileRepo.GetByUserID(r.Context(), link.OrganizerUserID); pErr == nil && profile != nil {
			hidePrices = !profile.ShowPrices
		}
	}

	publicProducts := make([]map[string]any, 0, len(products))
	for _, p := range products {
		if !p.IsActive {
			continue
		}
		item := map[string]any{
			"id":       p.ID,
			"name":     p.Name,
			"category": p.Category,
		}
		if p.ImageURL != nil {
			item["image_url"] = p.ImageURL
		}
		if !hidePrices {
			item["base_price"] = p.BasePrice
		}
		publicProducts = append(publicProducts, item)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{
			"link_id":     link.ID,
			"submit_mode": link.SubmitMode,
			"expires_at":  link.ExpiresAt,
			"label":       link.Label,
			"organizer": map[string]any{
				"business_name": user.BusinessName,
				"logo_url":      user.LogoURL,
				"brand_color":   user.BrandColor,
			},
			"products":        publicProducts,
			"profile_enabled": profileEnabled,
		},
	})
}

// SubmitLinkRequest handles visitor form submit via shared link.
// POST /api/public/request-links/{token}/requests
func (h *RequestLinkHandler) SubmitLinkRequest(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimSpace(r.PathValue("token"))
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	var body CreatePublicRequestRequest
	if err := decodeJSON(w, r, &body); err != nil {
		return
	}

	// Honeypot
	if strings.TrimSpace(body.Website) != "" {
		writeJSON(w, http.StatusCreated, map[string]any{
			"data": map[string]any{
				"id":           uuid.New().String(),
				"client_token": uuid.New().String(),
				"status":       models.RequestStatusPending,
				"services":     []any{},
				"currency":     "MXN",
			},
		})
		return
	}

	in, ok := buildCreateInputFromRequest(w, "", body)
	if !ok {
		return
	}

	created, err := h.svc.CreateFromLink(r.Context(), token, in)
	if err != nil {
		writeRequestLinkError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"data": toCreatePublicRequestResponse(created)})
}

func writeRequestLinkError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrLinkNotFound):
		writeError(w, http.StatusNotFound, "Link not found")
	case errors.Is(err, services.ErrLinkInvalid):
		writeJSON(w, http.StatusGone, map[string]string{
			"error":   "link_invalid",
			"message": "Este enlace ya no es válido o ha expirado.",
		})
	case errors.Is(err, services.ErrValidation):
		writeError(w, http.StatusBadRequest, strings.TrimPrefix(err.Error(), "validation failed: "))
	case errors.Is(err, services.ErrInvalidServices):
		writeError(w, http.StatusBadRequest, "One or more selected services are not available")
	case errors.Is(err, services.ErrPendingCapExceeded):
		writeJSON(w, http.StatusTooManyRequests, map[string]string{
			"error":   "inbox_full",
			"message": "This organizer's inbox is full. Please try again later.",
		})
	default:
		slog.Error("request_link: unexpected service error", "error", err)
		writeError(w, http.StatusInternalServerError, "Something went wrong")
	}
}

func (h *RequestLinkHandler) buildLinkURL(token string) string {
	return fmt.Sprintf("%s/s/%s", strings.TrimRight(h.frontendURL, "/"), token)
}

func generateRequestLinkToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(b), nil
}


