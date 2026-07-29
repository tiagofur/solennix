package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// PublicLeadHandler exposes the public lead-submission endpoint and the
// authenticated organizer-facing list/read endpoints.
type PublicLeadHandler struct {
	leadRepo    publicLeadRepo
	userRepo    leadUserRepo
	profileRepo leadProfileRepo
}

type publicLeadRepo interface {
	Create(ctx context.Context, lead *models.PublicLead) error
	ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicLead, error)
	CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error)
	MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error
}
type leadUserRepo interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}
type leadProfileRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}

func NewPublicLeadHandler(leadRepo *repository.PublicLeadRepo, userRepo *repository.UserRepo, profileRepo *repository.PublicProfileRepo) *PublicLeadHandler {
	return &PublicLeadHandler{leadRepo: leadRepo, userRepo: userRepo, profileRepo: profileRepo}
}

// SubmitPublicLeadRequest is the public, unauthenticated payload.
type SubmitPublicLeadRequest struct {
	Name      string  `json:"name"`
	Contact   string  `json:"contact"`
	EventDate *string `json:"event_date,omitempty"`
	EventType *string `json:"event_type,omitempty"`
	NumGuests *int    `json:"num_guests,omitempty"`
	Message   *string `json:"message,omitempty"`
	Source    string  `json:"source,omitempty"`
}

// SubmitPublicLead handles POST /api/public/organizers/{slug}/leads
func (h *PublicLeadHandler) SubmitPublicLead(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "Organizer slug is required")
		return
	}

	var req SubmitPublicLeadRequest
	if err := decodeJSON(w, r, &req); err != nil {
		return
	}

	name := strings.TrimSpace(req.Name)
	contact := strings.TrimSpace(req.Contact)
	if name == "" || contact == "" {
		writeError(w, http.StatusBadRequest, "name and contact are required")
		return
	}
	if len(name) > 120 || len(contact) > 255 {
		writeError(w, http.StatusBadRequest, "field too long")
		return
	}
	source := strings.TrimSpace(req.Source)
	if source == "" {
		source = "form"
	}

	user, err := h.userRepo.GetByPublicSlug(r.Context(), slug)
	if err != nil || !isPubliclyVisibleAccount(user) {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	profile, err := h.profileRepo.GetByUserID(r.Context(), user.ID)
	if err != nil || profile == nil || !profile.IsEnabled {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	lead := &models.PublicLead{
		OrganizerUserID: user.ID,
		Name:            name,
		Contact:         contact,
		EventDate:       trimStrPtr(req.EventDate),
		EventType:       trimStrPtr(req.EventType),
		NumGuests:       req.NumGuests,
		Message:         trimStrPtr(req.Message),
		Source:          source,
	}
	if err := h.leadRepo.Create(r.Context(), lead); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to submit inquiry")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"data": lead})
}

// ListLeads handles GET /api/leads (authenticated organizer).
func (h *PublicLeadHandler) ListLeads(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	leads, err := h.leadRepo.ListByOrganizer(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to load leads")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": leads})
}

// MarkLeadRead handles POST /api/leads/{id}/read (authenticated organizer).
func (h *PublicLeadHandler) MarkLeadRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid lead id")
		return
	}
	if err := h.leadRepo.MarkRead(r.Context(), id, userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "Lead not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to update lead")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]bool{"ok": true}})
}

func trimStrPtr(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}
