package handlers

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// MaxFreePublicProfileServices is the Free-plan cap for show_on_public_profile.
const MaxFreePublicProfileServices = 3

// PublicProfileServicesHandler serves authenticated bulk service selection under
// /api/users/me/public-profile/services. Selection drives which active products
// appear on the public page; prices/images always come from the product row.
type PublicProfileServicesHandler struct {
	userRepo    servicesAuthUserRepo
	productRepo servicesProductRepo
}

type servicesAuthUserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

type servicesProductRepo interface {
	ListActiveForPublicProfileSettings(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
	SetPublicProfileServices(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error
}

// NewPublicProfileServicesHandler assembles the handler with concrete repos.
func NewPublicProfileServicesHandler(
	userRepo *repository.UserRepo,
	productRepo *repository.ProductRepo,
) *PublicProfileServicesHandler {
	return &PublicProfileServicesHandler{
		userRepo:    userRepo,
		productRepo: productRepo,
	}
}

// publicProfileServiceDTO is the settings-UI shape for service selection.
type publicProfileServiceDTO struct {
	ID                  uuid.UUID `json:"id"`
	Name                string    `json:"name"`
	Category            string    `json:"category"`
	BasePrice           float64   `json:"base_price"`
	ImageURL            *string   `json:"image_url,omitempty"`
	ShowOnPublicProfile bool      `json:"show_on_public_profile"`
	IsFeatured          bool      `json:"is_featured"`
}

type setPublicProfileServicesRequest struct {
	ProductIDs []uuid.UUID `json:"product_ids"`
}

// ListMyPublicProfileServices handles GET /api/users/me/public-profile/services.
// Returns all active products with the public-profile flag for the Settings UI.
func (h *PublicProfileServicesHandler) ListMyPublicProfileServices(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	products, err := h.productRepo.ListActiveForPublicProfileSettings(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load services")
		return
	}
	out := make([]publicProfileServiceDTO, 0, len(products))
	for _, p := range products {
		out = append(out, publicProfileServiceDTO{
			ID:                  p.ID,
			Name:                p.Name,
			Category:            p.Category,
			BasePrice:           p.BasePrice,
			ImageURL:            p.ImageURL,
			ShowOnPublicProfile: p.ShowOnPublicProfile,
			IsFeatured:          p.IsFeatured,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// SetMyPublicProfileServices handles PUT /api/users/me/public-profile/services.
// Body: { "product_ids": ["uuid", ...] }. Sets show_on_public_profile=true for
// those owned active products and false for all other user products. Free: max 3.
func (h *PublicProfileServicesHandler) SetMyPublicProfileServices(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "Failed to load account")
		return
	}

	var req setPublicProfileServicesRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.ProductIDs == nil {
		req.ProductIDs = []uuid.UUID{}
	}

	// Deduplicate while preserving order.
	seen := make(map[uuid.UUID]bool, len(req.ProductIDs))
	ids := make([]uuid.UUID, 0, len(req.ProductIDs))
	for _, id := range req.ProductIDs {
		if id == uuid.Nil || seen[id] {
			continue
		}
		seen[id] = true
		ids = append(ids, id)
	}

	if normalizePlan(user.Plan) == "basic" && len(ids) > MaxFreePublicProfileServices {
		writePlanLimitError(w, r, "public_profile_services", len(ids), MaxFreePublicProfileServices)
		return
	}

	if err := h.productRepo.SetPublicProfileServices(r.Context(), userID, ids); err != nil {
		if errors.Is(err, repository.ErrInvalidProductSelection) {
			writeError(w, http.StatusBadRequest, "One or more products are invalid or inactive")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update services")
		return
	}

	// Return the refreshed selection list for the UI.
	products, err := h.productRepo.ListActiveForPublicProfileSettings(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load services")
		return
	}
	out := make([]publicProfileServiceDTO, 0, len(products))
	for _, p := range products {
		out = append(out, publicProfileServiceDTO{
			ID:                  p.ID,
			Name:                p.Name,
			Category:            p.Category,
			BasePrice:           p.BasePrice,
			ImageURL:            p.ImageURL,
			ShowOnPublicProfile: p.ShowOnPublicProfile,
			IsFeatured:          p.IsFeatured,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
