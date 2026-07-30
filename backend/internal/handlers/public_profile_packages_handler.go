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

type packageCreateRequest struct {
	Title       string   `json:"title"`
	Description *string  `json:"description,omitempty"`
	FromPrice   *float64 `json:"from_price,omitempty"`
	Inclusions  []string `json:"inclusions,omitempty"`
	ImageURL    *string  `json:"image_url,omitempty"`
	IsFeatured  bool     `json:"is_featured"`
	SortOrder   *int     `json:"sort_order,omitempty"`
}

type packageUpdateRequest struct {
	Title       *string  `json:"title,omitempty"`
	Description *string  `json:"description,omitempty"`
	FromPrice   *float64 `json:"from_price,omitempty"`
	Inclusions  []string `json:"inclusions,omitempty"`
	ImageURL    *string  `json:"image_url,omitempty"`
	IsFeatured  *bool    `json:"is_featured,omitempty"`
	SortOrder   *int     `json:"sort_order,omitempty"`
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

	pkg := &models.OrganizerPublicPackage{
		UserID:      user.ID,
		Title:       title,
		Description: trimStrPtr(req.Description),
		FromPrice:   req.FromPrice,
		Inclusions:  req.Inclusions,
		ImageURL:    trimStrPtr(req.ImageURL),
		IsFeatured:  req.IsFeatured,
		SortOrder:   sortOrder,
	}
	if err := h.contentRepo.CreatePackage(r.Context(), pkg); err != nil {
		if errors.Is(err, repository.ErrPackagesFull) {
			writeError(w, http.StatusBadRequest, "Packages are limited to 6 items")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create package")
		return
	}
	writeJSON(w, http.StatusCreated, pkg)
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

	if err := h.contentRepo.UpdatePackage(r.Context(), existing); err != nil {
		if errors.Is(err, repository.ErrPackageNotFound) {
			writeError(w, http.StatusNotFound, "Package not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update package")
		return
	}
	writeJSON(w, http.StatusOK, existing)
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
