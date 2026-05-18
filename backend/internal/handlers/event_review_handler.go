package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

type EventReviewHandler struct {
	repo         *repository.EventReviewRepo
	userRepo     FullUserRepository
	emailService *services.EmailService
	frontendURL  string
}

func NewEventReviewHandler(repo *repository.EventReviewRepo, userRepo FullUserRepository, emailService *services.EmailService, frontendURL string) *EventReviewHandler {
	return &EventReviewHandler{
		repo:         repo,
		userRepo:     userRepo,
		emailService: emailService,
		frontendURL:  strings.TrimSuffix(frontendURL, "/"),
	}
}

type PublicReviewMetaResponse struct {
	EventDate               *string `json:"event_date,omitempty"`
	EventLabel              *string `json:"event_label,omitempty"`
	OrganizerName           *string `json:"organizer_name,omitempty"`
	AllowPublicTestimonials bool    `json:"allow_public_testimonials"`
}

type SubmitPublicReviewRequest struct {
	Rating     int     `json:"rating"`
	Comment    *string `json:"comment,omitempty"`
	Visibility string  `json:"visibility"`
}

type UpdateReviewResponseRequest struct {
	Response *string `json:"response"`
}

type UpdateReviewVisibilityRequest struct {
	Visibility string `json:"visibility"`
}

// GetPublicReviewRequest handles GET /api/public/reviews/{token}
func (h *EventReviewHandler) GetPublicReviewRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.PathValue("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	req, err := h.repo.GetRequestByToken(ctx, token)
	if err != nil {
		writeError(w, http.StatusNotFound, "Review request not found")
		return
	}

	if req.SubmittedAt != nil {
		writeError(w, http.StatusGone, "Review request already submitted")
		return
	}

	if req.ExpiresAt != nil && time.Now().UTC().After(*req.ExpiresAt) {
		writeError(w, http.StatusGone, "Review request expired")
		return
	}

	organizer, err := h.userRepo.GetByID(ctx, req.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load organizer")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data": PublicReviewMetaResponse{
			EventDate:               req.EventDate,
			EventLabel:              req.EventLabel,
			OrganizerName:           req.OrganizerName,
			AllowPublicTestimonials: FeatureAvailable(organizer.Plan, "reviews") && IsPlanActive(organizer),
		},
	})
}

// SubmitPublicReview handles POST /api/public/reviews/{token}
func (h *EventReviewHandler) SubmitPublicReview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	token := r.PathValue("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	var reqBody SubmitPublicReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if reqBody.Rating < 1 || reqBody.Rating > 5 {
		writeError(w, http.StatusBadRequest, "rating must be between 1 and 5")
		return
	}

	requestRow, err := h.repo.GetRequestByToken(ctx, token)
	if err != nil {
		writeError(w, http.StatusNotFound, "Review request not found")
		return
	}

	if requestRow.SubmittedAt != nil {
		writeError(w, http.StatusGone, "Review request already submitted")
		return
	}

	if requestRow.ExpiresAt != nil && time.Now().UTC().After(*requestRow.ExpiresAt) {
		writeError(w, http.StatusGone, "Review request expired")
		return
	}

	organizer, err := h.userRepo.GetByID(ctx, requestRow.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load organizer")
		return
	}

	visibility := strings.ToLower(strings.TrimSpace(reqBody.Visibility))
	if visibility == "" {
		visibility = "private"
	}
	if visibility != "private" && visibility != "public" {
		writeError(w, http.StatusBadRequest, "visibility must be 'private' or 'public'")
		return
	}

	// Free plan always stores reviews as private.
	if !FeatureAvailable(organizer.Plan, "reviews") || !IsPlanActive(organizer) {
		visibility = "private"
	}

	review := &models.EventReview{
		EventID:         requestRow.EventID,
		UserID:          requestRow.UserID,
		ClientID:        requestRow.ClientID,
		ReviewRequestID: &requestRow.ID,
		Rating:          reqBody.Rating,
		Comment:         reqBody.Comment,
		Visibility:      visibility,
	}

	if err := h.repo.CreateReview(ctx, review); err != nil {
		writeError(w, http.StatusConflict, "Review already submitted for this event")
		return
	}

	now := time.Now().UTC()
	if err := h.repo.MarkRequestSubmitted(ctx, requestRow.ID, now); err != nil {
		slog.Warn("Failed to mark review request as submitted", "request_id", requestRow.ID.String(), "error", err)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": review})
}

// ListOrganizerReviews handles GET /api/reviews
func (h *EventReviewHandler) ListOrganizerReviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	reviews, err := h.repo.ListByOrganizer(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch reviews")
		return
	}

	if reviews == nil {
		reviews = make([]*models.EventReview, 0)
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": reviews})
}

// UpdateOrganizerResponse handles PATCH /api/reviews/{id}/response
func (h *EventReviewHandler) UpdateOrganizerResponse(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	reviewID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid review ID")
		return
	}

	organizer, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load organizer")
		return
	}

	if !FeatureAvailable(organizer.Plan, "reviews") || !IsPlanActive(organizer) {
		writeError(w, http.StatusForbidden, "This feature requires a paid plan. Please upgrade to access review responses.")
		return
	}

	review, err := h.repo.GetByID(ctx, reviewID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Review not found")
		return
	}
	if review.UserID != userID {
		writeError(w, http.StatusForbidden, "You do not have permission to respond to this review")
		return
	}

	var body UpdateReviewResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	updated, err := h.repo.UpdateOrganizerReply(ctx, reviewID, body.Response)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update review response")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": updated})
}

// UpdateReviewVisibility handles PATCH /api/reviews/{id}/visibility
func (h *EventReviewHandler) UpdateReviewVisibility(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)

	reviewID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid review ID")
		return
	}

	var body UpdateReviewVisibilityRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	visibility := strings.ToLower(strings.TrimSpace(body.Visibility))
	if visibility != "private" && visibility != "public" {
		writeError(w, http.StatusBadRequest, "visibility must be 'private' or 'public'")
		return
	}

	review, err := h.repo.GetByID(ctx, reviewID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Review not found")
		return
	}
	if review.UserID != userID {
		writeError(w, http.StatusForbidden, "You do not have permission to update this review")
		return
	}

	if visibility == "public" {
		organizer, err := h.userRepo.GetByID(ctx, userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to load organizer")
			return
		}
		if !FeatureAvailable(organizer.Plan, "reviews") || !IsPlanActive(organizer) {
			writeError(w, http.StatusForbidden, "Public testimonials require a paid plan")
			return
		}
	}

	updated, err := h.repo.UpdateVisibility(ctx, reviewID, visibility)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update review visibility")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": updated})
}

// ListPublicPortfolioReviews handles GET /api/public/organizers/{slug}/reviews
func (h *EventReviewHandler) ListPublicPortfolioReviews(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := strings.TrimSpace(r.PathValue("slug"))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "Organizer slug is required")
		return
	}

	reviews, err := h.repo.ListPublicByOrganizerSlug(ctx, slug)
	if err != nil {
		if strings.Contains(err.Error(), pgx.ErrNoRows.Error()) {
			writeJSON(w, http.StatusOK, map[string]any{"data": []any{}})
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to fetch testimonials")
		return
	}

	if reviews == nil {
		reviews = make([]*models.EventReview, 0)
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": reviews})
}

// SendScheduledReviewRequests sends 48h post-event review request emails.
func (h *EventReviewHandler) SendScheduledReviewRequests(ctx context.Context) {
	if h.emailService == nil {
		return
	}

	candidates, err := h.repo.ListPendingEmailCandidates(ctx, 100)
	if err != nil {
		slog.Error("Failed to list pending review email candidates", "error", err)
		return
	}

	for _, c := range candidates {
		expiresAt := time.Now().UTC().Add(14 * 24 * time.Hour)
		token := uuid.NewString()
		req := &models.EventReviewRequest{
			EventID:     c.EventID,
			UserID:      c.UserID,
			ClientID:    c.ClientID,
			Token:       token,
			ClientName:  &c.ClientName,
			ClientEmail: c.ClientEmail,
			ExpiresAt:   &expiresAt,
		}

		if err := h.repo.CreateRequest(ctx, req); err != nil {
			slog.Warn("Failed to create review request", "event_id", c.EventID.String(), "error", err)
			continue
		}

		link := h.frontendURL + "/organizer/review/" + token
		if err := h.emailService.SendReviewRequest(c.ClientEmail, c.ClientName, c.OrganizerName, c.EventLabel, c.EventDate, link); err != nil {
			slog.Warn("Failed to send review request email", "event_id", c.EventID.String(), "error", err)
			continue
		}
	}
}
