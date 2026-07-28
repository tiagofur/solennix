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

// PublicProfilePortfolioHandler serves authenticated portfolio CRUD under
// /api/users/me/public-profile/portfolio. Pro+ only; max 6 items (sort_order 0–5).
// Portfolio items are primarily created from existing events (event_id + optional photo_id).
type PublicProfilePortfolioHandler struct {
	userRepo      portfolioAuthUserRepo
	portfolioRepo portfolioItemRepo
	eventRepo     portfolioEventRepo
}

type portfolioAuthUserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

type portfolioItemRepo interface {
	ListPortfolioByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPortfolioItem, error)
	CountPortfolioByUserID(ctx context.Context, userID uuid.UUID) (int, error)
	CreatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error
	UpdatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error
	DeletePortfolioItem(ctx context.Context, userID, id uuid.UUID) error
}

type portfolioEventRepo interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error)
	ListPublicPortfolioCandidates(ctx context.Context, userID uuid.UUID) ([]models.PortfolioCandidateEvent, error)
}

// NewPublicProfilePortfolioHandler assembles the handler with concrete repos.
func NewPublicProfilePortfolioHandler(
	userRepo *repository.UserRepo,
	profileRepo *repository.PublicProfileRepo,
	eventRepo *repository.EventRepo,
) *PublicProfilePortfolioHandler {
	return &PublicProfilePortfolioHandler{
		userRepo:      userRepo,
		portfolioRepo: profileRepo,
		eventRepo:     eventRepo,
	}
}

type portfolioCreateRequest struct {
	Title        string     `json:"title"`
	EventID      *uuid.UUID `json:"event_id"`
	PhotoID      *uuid.UUID `json:"photo_id"`
	EventDate    *string    `json:"event_date"`
	PhotoURL     string     `json:"photo_url"`
	ThumbnailURL *string    `json:"thumbnail_url"`
	SortOrder    *int       `json:"sort_order"`
}

type portfolioUpdateRequest struct {
	Title        *string    `json:"title"`
	EventID      *uuid.UUID `json:"event_id"`
	EventDate    *string    `json:"event_date"`
	PhotoURL     *string    `json:"photo_url"`
	ThumbnailURL *string    `json:"thumbnail_url"`
	SortOrder    *int       `json:"sort_order"`
}

// ListPortfolioItems handles GET /api/users/me/public-profile/portfolio.
func (h *PublicProfilePortfolioHandler) ListPortfolioItems(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	items, err := h.portfolioRepo.ListPortfolioByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load portfolio")
		return
	}
	if items == nil {
		items = []models.OrganizerPublicPortfolioItem{}
	}
	writeJSON(w, http.StatusOK, items)
}

// ListPortfolioCandidates handles GET /api/users/me/public-profile/portfolio/candidates.
// Pro+ only. Returns sanitized past events with photos (no client PII).
func (h *PublicProfilePortfolioHandler) ListPortfolioCandidates(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	if h.eventRepo == nil {
		writeError(w, http.StatusInternalServerError, "Failed to load portfolio candidates")
		return
	}
	candidates, err := h.eventRepo.ListPublicPortfolioCandidates(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load portfolio candidates")
		return
	}
	if candidates == nil {
		candidates = []models.PortfolioCandidateEvent{}
	}
	writeJSON(w, http.StatusOK, candidates)
}

// CreatePortfolioItem handles POST /api/users/me/public-profile/portfolio.
// Primary path: { "event_id": "uuid", "photo_id": "optional" } fills title/date/photo
// from the owned event. Manual title+photo_url remains supported as override/fallback.
func (h *PublicProfilePortfolioHandler) CreatePortfolioItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}

	var req portfolioCreateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	title := strings.TrimSpace(req.Title)
	photo := strings.TrimSpace(req.PhotoURL)
	eventDate := req.EventDate
	thumb := req.ThumbnailURL
	eventID := req.EventID

	// Resolve fields from event when event_id is provided (primary path).
	if req.EventID != nil {
		if h.eventRepo == nil {
			writeError(w, http.StatusInternalServerError, "Failed to load event")
			return
		}
		// Reject duplicate event_id already in portfolio.
		existing, err := h.portfolioRepo.ListPortfolioByUserID(r.Context(), user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to load portfolio")
			return
		}
		for _, it := range existing {
			if it.EventID != nil && *it.EventID == *req.EventID {
				writeError(w, http.StatusBadRequest, "Event is already in portfolio")
				return
			}
		}

		ev, err := h.eventRepo.GetByID(r.Context(), *req.EventID, user.ID)
		if err != nil || ev == nil {
			writeError(w, http.StatusNotFound, "Event not found")
			return
		}
		photos := parseEventPhotos(ev.Photos)
		if len(photos) == 0 {
			writeError(w, http.StatusBadRequest, "Event has no photos")
			return
		}
		chosen := photos[0]
		if req.PhotoID != nil {
			found := false
			for _, p := range photos {
				if p.ID == *req.PhotoID {
					chosen = p
					found = true
					break
				}
			}
			if !found {
				writeError(w, http.StatusBadRequest, "photo_id not found on event")
				return
			}
		}
		if title == "" {
			title = strings.TrimSpace(ev.ServiceType)
		}
		if photo == "" {
			photo = strings.TrimSpace(chosen.URL)
		}
		if thumb == nil && chosen.ThumbnailURL != nil {
			thumb = chosen.ThumbnailURL
		}
		if eventDate == nil && ev.EventDate != "" {
			d := ev.EventDate
			eventDate = &d
		}
		eventID = req.EventID
	}

	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if len(title) > 160 {
		writeError(w, http.StatusBadRequest, "title must be at most 160 characters")
		return
	}
	if photo == "" {
		writeError(w, http.StatusBadRequest, "photo_url is required")
		return
	}

	sortOrder := 0
	if req.SortOrder != nil {
		sortOrder = *req.SortOrder
	} else {
		// Auto-assign the lowest free sort_order in 0–5.
		existing, err := h.portfolioRepo.ListPortfolioByUserID(r.Context(), user.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to load portfolio")
			return
		}
		used := map[int]bool{}
		for _, it := range existing {
			used[it.SortOrder] = true
		}
		assigned := false
		for i := 0; i <= 5; i++ {
			if !used[i] {
				sortOrder = i
				assigned = true
				break
			}
		}
		if !assigned {
			writeError(w, http.StatusBadRequest, "Portfolio is limited to 6 items")
			return
		}
	}
	if sortOrder < 0 || sortOrder > 5 {
		writeError(w, http.StatusBadRequest, "sort_order must be between 0 and 5")
		return
	}

	count, err := h.portfolioRepo.CountPortfolioByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to count portfolio items")
		return
	}
	if count >= repository.MaxPublicPortfolioItems {
		writeError(w, http.StatusBadRequest, "Portfolio is limited to 6 items")
		return
	}

	item := &models.OrganizerPublicPortfolioItem{
		UserID:       user.ID,
		EventID:      eventID,
		Title:        title,
		EventDate:    eventDate,
		PhotoURL:     photo,
		ThumbnailURL: thumb,
		SortOrder:    sortOrder,
	}
	if err := h.portfolioRepo.CreatePortfolioItem(r.Context(), item); err != nil {
		if errors.Is(err, repository.ErrPortfolioFull) {
			writeError(w, http.StatusBadRequest, "Portfolio is limited to 6 items")
			return
		}
		if errors.Is(err, repository.ErrPortfolioSortTaken) {
			writeError(w, http.StatusBadRequest, "sort_order already in use")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create portfolio item")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

// UpdatePortfolioItem handles PUT /api/users/me/public-profile/portfolio/{id}.
func (h *PublicProfilePortfolioHandler) UpdatePortfolioItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid portfolio item id")
		return
	}

	var req portfolioUpdateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Load existing via list (avoids extra Get on interface); prefer matching id.
	items, err := h.portfolioRepo.ListPortfolioByUserID(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load portfolio")
		return
	}
	var existing *models.OrganizerPublicPortfolioItem
	for i := range items {
		if items[i].ID == id {
			cp := items[i]
			existing = &cp
			break
		}
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "Portfolio item not found")
		return
	}

	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t == "" {
			writeError(w, http.StatusBadRequest, "title cannot be empty")
			return
		}
		if len(t) > 160 {
			writeError(w, http.StatusBadRequest, "title must be at most 160 characters")
			return
		}
		existing.Title = t
	}
	if req.PhotoURL != nil {
		p := strings.TrimSpace(*req.PhotoURL)
		if p == "" {
			writeError(w, http.StatusBadRequest, "photo_url cannot be empty")
			return
		}
		existing.PhotoURL = p
	}
	if req.EventID != nil {
		existing.EventID = req.EventID
	}
	if req.EventDate != nil {
		existing.EventDate = req.EventDate
	}
	if req.ThumbnailURL != nil {
		existing.ThumbnailURL = req.ThumbnailURL
	}
	if req.SortOrder != nil {
		if *req.SortOrder < 0 || *req.SortOrder > 5 {
			writeError(w, http.StatusBadRequest, "sort_order must be between 0 and 5")
			return
		}
		existing.SortOrder = *req.SortOrder
	}

	if err := h.portfolioRepo.UpdatePortfolioItem(r.Context(), existing); err != nil {
		if errors.Is(err, repository.ErrPortfolioItemNotFound) {
			writeError(w, http.StatusNotFound, "Portfolio item not found")
			return
		}
		if errors.Is(err, repository.ErrPortfolioSortTaken) {
			writeError(w, http.StatusBadRequest, "sort_order already in use")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update portfolio item")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

// DeletePortfolioItem handles DELETE /api/users/me/public-profile/portfolio/{id}.
func (h *PublicProfilePortfolioHandler) DeletePortfolioItem(w http.ResponseWriter, r *http.Request) {
	user, ok := h.requireProPlan(w, r)
	if !ok {
		return
	}
	id, err := uuid.Parse(strings.TrimSpace(r.PathValue("id")))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid portfolio item id")
		return
	}
	if err := h.portfolioRepo.DeletePortfolioItem(r.Context(), user.ID, id); err != nil {
		if errors.Is(err, repository.ErrPortfolioItemNotFound) {
			writeError(w, http.StatusNotFound, "Portfolio item not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to delete portfolio item")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// requireProPlan loads the auth user and rejects Free plans with plan_limit_exceeded.
func (h *PublicProfilePortfolioHandler) requireProPlan(w http.ResponseWriter, r *http.Request) (*models.User, bool) {
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
