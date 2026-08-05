package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// PublicProfilePackagesHandler serves authenticated CRUD for packages and FAQ
// under /api/users/me/public-profile/{packages,faq}. Pro+ only.
type PublicProfilePackagesHandler struct {
	userRepo    packagesAuthUserRepo
	contentRepo packagesContentRepo
}

type packagesAuthUserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

type packagesContentRepo interface {
	ListPackagesByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPackage, error)
	CountPackagesByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	CreatePackage(ctx context.Context, pkg *models.OrganizerPublicPackage) error
	UpdatePackage(ctx context.Context, pkg *models.OrganizerPublicPackage) error
	DeletePackage(ctx context.Context, userID, id uuid.UUID) error
	GetPackage(ctx context.Context, userID, id uuid.UUID) (*models.OrganizerPublicPackage, error)
	ReplacePackageItemsAndTiers(ctx context.Context, packageID uuid.UUID, items []models.OrganizerPublicPackageItem, tiers []models.OrganizerPublicPackageDiscountTier) error

	ListFaqByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicFaqItem, error)
	CountFaqByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	CreateFaqItem(ctx context.Context, item *models.OrganizerPublicFaqItem) error
	UpdateFaqItem(ctx context.Context, item *models.OrganizerPublicFaqItem) error
	DeleteFaqItem(ctx context.Context, userID, id uuid.UUID) error
	GetFaqItem(ctx context.Context, userID, id uuid.UUID) (*models.OrganizerPublicFaqItem, error)
}

func NewPublicProfilePackagesHandler(userRepo *repository.UserRepo, profileRepo *repository.PublicProfileRepo) *PublicProfilePackagesHandler {
	return &PublicProfilePackagesHandler{userRepo: userRepo, contentRepo: profileRepo}
}

// ---------- Packages ----------

type packageItemRequest struct {
	ProductID   string `json:"product_id"`
	PricingUnit string `json:"pricing_unit"` // per_guest | per_event
}

type packageTierRequest struct {
	FromGuests      int     `json:"from_guests"`
	DiscountPercent float64 `json:"discount_percent"`
}

type packageCreateRequest struct {
	Title         string                `json:"title"`
	Description   *string               `json:"description,omitempty"`
	FromPrice     *float64              `json:"from_price,omitempty"`
	Inclusions    []string              `json:"inclusions,omitempty"`
	ImageURL      *string               `json:"image_url,omitempty"`
	IsFeatured    bool                  `json:"is_featured"`
	SortOrder     *int                  `json:"sort_order,omitempty"`
	MinGuests     *int                  `json:"min_guests,omitempty"`
	Items         []packageItemRequest  `json:"items,omitempty"`
	DiscountTiers []packageTierRequest  `json:"discount_tiers,omitempty"`
}

type packageUpdateRequest struct {
	Title         *string              `json:"title,omitempty"`
	Description   *string              `json:"description,omitempty"`
	FromPrice     *float64             `json:"from_price,omitempty"`
	Inclusions    []string             `json:"inclusions,omitempty"`
	ImageURL      *string              `json:"image_url,omitempty"`
	IsFeatured    *bool                `json:"is_featured,omitempty"`
	SortOrder     *int                 `json:"sort_order,omitempty"`
	MinGuests     *int                 `json:"min_guests,omitempty"`
	// ClearMinGuests forces min_guests to null when true.
	ClearMinGuests bool                `json:"clear_min_guests,omitempty"`
	Items         []packageItemRequest `json:"items,omitempty"`
	// ReplaceDetails when true rewrites items+tiers (even if empty = clear structured pricing).
	ReplaceDetails bool                `json:"replace_details,omitempty"`
	DiscountTiers  []packageTierRequest `json:"discount_tiers,omitempty"`
}

func (h *PublicProfilePackagesHandler) ListPackages(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	items, err := h.contentRepo.ListPackagesByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load packages")
		return
	}
	if items == nil {
		items = []models.OrganizerPublicPackage{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *PublicProfilePackagesHandler) CreatePackage(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	var req packageCreateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(title) > 160 {
		writeError(w, http.StatusBadRequest, "title must be at most 160 characters")
		return
	}

	count, err := h.contentRepo.CountPackagesByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to count packages")
		return
	}
	if count >= repository.MaxPublicPackages {
		writeError(w, http.StatusBadRequest, "Packages are limited to 6 items")
		return
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	items, tiers, ok := parsePackageDetails(w, req.Items, req.DiscountTiers, len(req.Items) > 0)
	if !ok {
		return
	}
	if req.MinGuests != nil && *req.MinGuests < 1 {
		writeError(w, http.StatusBadRequest, "min_guests must be >= 1")
		return
	}

	pkg := &models.OrganizerPublicPackage{
		UserID:      user.ID,
		Title:       title,
		Description: trimStrPtr(req.Description),
		FromPrice:   req.FromPrice,
		Inclusions:  req.Inclusions,
		ImageURL:    trimStrPtr(req.ImageURL),
		IsFeatured:  req.IsFeatured,
		SortOrder:   sortOrder,
		MinGuests:   req.MinGuests,
	}
	if err := h.contentRepo.CreatePackage(r.Context(), pkg); err != nil {
		if errors.Is(err, repository.ErrPackagesFull) {
			writeError(w, http.StatusBadRequest, "Packages are limited to 6 items")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create package")
		return
	}
	if len(items) > 0 || len(tiers) > 0 {
		if err := h.contentRepo.ReplacePackageItemsAndTiers(r.Context(), pkg.ID, items, tiers); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to save package items")
			return
		}
	}
	full, err := h.contentRepo.GetPackage(r.Context(), user.ID, pkg.ID)
	if err != nil {
		writeJSON(w, http.StatusCreated, pkg)
		return
	}
	writeJSON(w, http.StatusCreated, full)
}

func (h *PublicProfilePackagesHandler) UpdatePackage(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid package id")
		return
	}
	existing, err := h.contentRepo.GetPackage(r.Context(), user.ID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "Package not found")
		return
	}

	var req packageUpdateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t == "" {
			writeError(w, http.StatusBadRequest, "title cannot be empty")
			return
		}
		existing.Title = t
	}
	if req.Description != nil {
		existing.Description = trimStrPtr(req.Description)
	}
	if req.FromPrice != nil {
		existing.FromPrice = req.FromPrice
	}
	if req.Inclusions != nil {
		existing.Inclusions = req.Inclusions
	}
	if req.ImageURL != nil {
		existing.ImageURL = trimStrPtr(req.ImageURL)
	}
	if req.IsFeatured != nil {
		existing.IsFeatured = *req.IsFeatured
	}
	if req.SortOrder != nil {
		existing.SortOrder = *req.SortOrder
	}
	if req.ClearMinGuests {
		existing.MinGuests = nil
	} else if req.MinGuests != nil {
		if *req.MinGuests < 1 {
			writeError(w, http.StatusBadRequest, "min_guests must be >= 1")
			return
		}
		existing.MinGuests = req.MinGuests
	}

	if err := h.contentRepo.UpdatePackage(r.Context(), existing); err != nil {
		if errors.Is(err, repository.ErrPackageNotFound) {
			writeError(w, http.StatusNotFound, "Package not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update package")
		return
	}

	if req.ReplaceDetails || len(req.Items) > 0 || len(req.DiscountTiers) > 0 {
		items, tiers, ok := parsePackageDetails(w, req.Items, req.DiscountTiers, req.ReplaceDetails || len(req.Items) > 0)
		if !ok {
			return
		}
		if err := h.contentRepo.ReplacePackageItemsAndTiers(r.Context(), existing.ID, items, tiers); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to save package items")
			return
		}
	}

	full, err := h.contentRepo.GetPackage(r.Context(), user.ID, existing.ID)
	if err != nil {
		writeJSON(w, http.StatusOK, existing)
		return
	}
	writeJSON(w, http.StatusOK, full)
}

// parsePackageDetails validates items (optional unless requireItems) and up to 3 discount tiers.
func parsePackageDetails(
	w http.ResponseWriter,
	rawItems []packageItemRequest,
	rawTiers []packageTierRequest,
	requireItems bool,
) ([]models.OrganizerPublicPackageItem, []models.OrganizerPublicPackageDiscountTier, bool) {
	if requireItems && len(rawItems) > 0 && len(rawItems) < 2 {
		writeError(w, http.StatusBadRequest, "packages with catalog items need at least 2 products")
		return nil, nil, false
	}
	if len(rawTiers) > services.MaxPackageDiscountTiers {
		writeError(w, http.StatusBadRequest, "discount_tiers limited to 3")
		return nil, nil, false
	}

	items := make([]models.OrganizerPublicPackageItem, 0, len(rawItems))
	seenProduct := make(map[uuid.UUID]struct{}, len(rawItems))
	for i, raw := range rawItems {
		pid, err := uuid.Parse(strings.TrimSpace(raw.ProductID))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid product_id in items")
			return nil, nil, false
		}
		if _, dup := seenProduct[pid]; dup {
			writeError(w, http.StatusBadRequest, "duplicate product_id in items")
			return nil, nil, false
		}
		seenProduct[pid] = struct{}{}
		unit := models.PackagePricingUnit(strings.TrimSpace(raw.PricingUnit))
		if unit != models.PackagePricingPerGuest && unit != models.PackagePricingPerEvent {
			writeError(w, http.StatusBadRequest, "pricing_unit must be per_guest or per_event")
			return nil, nil, false
		}
		items = append(items, models.OrganizerPublicPackageItem{
			ProductID:   pid,
			PricingUnit: unit,
			SortOrder:   i,
		})
	}

	tiers := make([]models.OrganizerPublicPackageDiscountTier, 0, len(rawTiers))
	seenFrom := make(map[int]struct{}, len(rawTiers))
	for _, raw := range rawTiers {
		if raw.FromGuests < 1 {
			writeError(w, http.StatusBadRequest, "from_guests must be >= 1")
			return nil, nil, false
		}
		if raw.DiscountPercent < 0 || raw.DiscountPercent > 100 {
			writeError(w, http.StatusBadRequest, "discount_percent must be between 0 and 100")
			return nil, nil, false
		}
		if _, dup := seenFrom[raw.FromGuests]; dup {
			writeError(w, http.StatusBadRequest, "duplicate from_guests in discount_tiers")
			return nil, nil, false
		}
		seenFrom[raw.FromGuests] = struct{}{}
		tiers = append(tiers, models.OrganizerPublicPackageDiscountTier{
			FromGuests:      raw.FromGuests,
			DiscountPercent: raw.DiscountPercent,
		})
	}
	return items, tiers, true
}

func (h *PublicProfilePackagesHandler) DeletePackage(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid package id")
		return
	}
	if err := h.contentRepo.DeletePackage(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, repository.ErrPackageNotFound) {
			writeError(w, http.StatusNotFound, "Package not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to delete package")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---------- FAQ ----------

type faqCreateRequest struct {
	Question  string `json:"question"`
	Answer    string `json:"answer"`
	SortOrder *int   `json:"sort_order,omitempty"`
}

type faqUpdateRequest struct {
	Question  *string `json:"question,omitempty"`
	Answer    *string `json:"answer,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

func (h *PublicProfilePackagesHandler) ListFaq(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	items, err := h.contentRepo.ListFaqByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load FAQ")
		return
	}
	if items == nil {
		items = []models.OrganizerPublicFaqItem{}
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *PublicProfilePackagesHandler) CreateFaqItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	var req faqCreateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	question := strings.TrimSpace(req.Question)
	answer := strings.TrimSpace(req.Answer)
	if question == "" || answer == "" {
		writeError(w, http.StatusBadRequest, "question and answer are required")
		return
	}
	if len(question) > 280 {
		writeError(w, http.StatusBadRequest, "question must be at most 280 characters")
		return
	}

	count, err := h.contentRepo.CountFaqByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to count FAQ items")
		return
	}
	if count >= repository.MaxPublicFaqItems {
		writeError(w, http.StatusBadRequest, "FAQ is limited to 12 items")
		return
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	}

	item := &models.OrganizerPublicFaqItem{
		UserID:    user.ID,
		Question:  question,
		Answer:    answer,
		SortOrder: sortOrder,
	}
	if err := h.contentRepo.CreateFaqItem(r.Context(), item); err != nil {
		if errors.Is(err, repository.ErrFaqFull) {
			writeError(w, http.StatusBadRequest, "FAQ is limited to 12 items")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create FAQ item")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *PublicProfilePackagesHandler) UpdateFaqItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid FAQ item id")
		return
	}
	existing, err := h.contentRepo.GetFaqItem(r.Context(), user.ID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "FAQ item not found")
		return
	}

	var req faqUpdateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Question != nil {
		q := strings.TrimSpace(*req.Question)
		if q == "" {
			writeError(w, http.StatusBadRequest, "question cannot be empty")
			return
		}
		existing.Question = q
	}
	if req.Answer != nil {
		a := strings.TrimSpace(*req.Answer)
		if a == "" {
			writeError(w, http.StatusBadRequest, "answer cannot be empty")
			return
		}
		existing.Answer = a
	}
	if req.SortOrder != nil {
		existing.SortOrder = *req.SortOrder
	}

	if err := h.contentRepo.UpdateFaqItem(r.Context(), existing); err != nil {
		if errors.Is(err, repository.ErrFaqItemNotFound) {
			writeError(w, http.StatusNotFound, "FAQ item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update FAQ item")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

func (h *PublicProfilePackagesHandler) DeleteFaqItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid FAQ item id")
		return
	}
	if err := h.contentRepo.DeleteFaqItem(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, repository.ErrFaqItemNotFound) {
			writeError(w, http.StatusNotFound, "FAQ item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to delete FAQ item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PublicProfilePackagesHandler) requireProPlan(w http.ResponseWriter, r *http.Request) (*models.User, bool) {
	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "Failed to load account")
		return nil, false
	}
	if !FeatureAvailable(user.Plan, "public_profile_full") {
		writePlanLimitError(w, r, "public_profile_full", 0, 0)
		return nil, false
	}
	return user, true
}
