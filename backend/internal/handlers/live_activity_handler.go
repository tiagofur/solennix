package handlers

import (
	"context"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// LiveActivityTokenRepository defines the operations the handler needs.
type LiveActivityTokenRepository interface {
	Register(ctx context.Context, userID, eventID uuid.UUID, pushToken string) (*models.LiveActivityToken, error)
	DeleteByEventID(ctx context.Context, userID, eventID uuid.UUID) error
}

// LiveActivityHandler exposes endpoints for iOS clients to register and clean up
// Live Activity push tokens.
type LiveActivityHandler struct {
	repo LiveActivityTokenRepository
}

func NewLiveActivityHandler(repo LiveActivityTokenRepository) *LiveActivityHandler {
	return &LiveActivityHandler{repo: repo}
}

// Register handles POST /api/live-activities/register
// Body: { "event_id": "uuid", "push_token": "..." }
func (h *LiveActivityHandler) Register(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		EventID   string `json:"event_id"`
		PushToken string `json:"push_token"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.PushToken == "" {
		writeError(w, http.StatusBadRequest, "push_token is required")
		return
	}
	eventID, err := uuid.Parse(req.EventID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event_id")
		return
	}

	token, err := h.repo.Register(r.Context(), userID, eventID, req.PushToken)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to register live activity token")
		return
	}
	writeJSON(w, http.StatusCreated, token)
}

// DeleteByEvent handles DELETE /api/live-activities/by-event/{eventId}
// Removes all Live Activity tokens for an event owned by the current user.
func (h *LiveActivityHandler) DeleteByEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	eventID, err := uuid.Parse(chi.URLParam(r, "eventId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	if err := h.repo.DeleteByEventID(r.Context(), userID, eventID); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete live activity tokens")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
