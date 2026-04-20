package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// writeStaffTeamError maps repo errors to the right status code and message,
// preventing internal error text from leaking to the client. Anything not
// recognized becomes 500 with the caller-provided generic message; details
// stay in the server log.
func writeStaffTeamError(w http.ResponseWriter, err error, genericMsg string) {
	switch {
	case errors.Is(err, repository.ErrStaffTeamNotFound):
		writeError(w, http.StatusNotFound, "Team not found")
	case errors.Is(err, repository.ErrInvalidTeamMember):
		writeError(w, http.StatusBadRequest, "invalid team member (unknown or cross-tenant staff)")
	default:
		writeError(w, http.StatusInternalServerError, genericMsg)
	}
}

// StaffTeamHandler handles CRUD for the organizer's staff teams (Ola 2).
type StaffTeamHandler struct {
	repo StaffTeamRepository
}

func NewStaffTeamHandler(repo StaffTeamRepository) *StaffTeamHandler {
	return &StaffTeamHandler{repo: repo}
}

// ListTeams lists the organizer's teams (summary with member counts, no member rows).
// GET /api/staff/teams
func (h *StaffTeamHandler) ListTeams(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	teams, err := h.repo.GetAll(r.Context(), userID)
	if err != nil {
		slog.Error("list staff teams failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to fetch teams")
		return
	}
	writeJSON(w, http.StatusOK, teams)
}

// GetTeam returns one team with its members (joined with staff info).
// GET /api/staff/teams/{id}
func (h *StaffTeamHandler) GetTeam(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid team ID")
		return
	}
	t, err := h.repo.GetByID(r.Context(), id, userID)
	if err != nil {
		slog.Error("get staff team failed", "error", err, "user_id", userID, "team_id", id)
		writeStaffTeamError(w, err, "Failed to fetch team")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// CreateTeam creates a team and its initial members in one transaction.
// POST /api/staff/teams
func (h *StaffTeamHandler) CreateTeam(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var t models.StaffTeam
	if err := decodeJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := ValidateStaffTeam(&t); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	t.UserID = userID
	if err := h.repo.Create(r.Context(), &t); err != nil {
		slog.Error("create staff team failed", "error", err, "user_id", userID)
		writeStaffTeamError(w, err, "Failed to create team")
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

// UpdateTeam updates team meta and replaces members atomically.
// PUT /api/staff/teams/{id}
func (h *StaffTeamHandler) UpdateTeam(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid team ID")
		return
	}
	var t models.StaffTeam
	if err := decodeJSON(r, &t); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := ValidateStaffTeam(&t); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	t.ID = id
	t.UserID = userID
	if err := h.repo.Update(r.Context(), &t); err != nil {
		slog.Error("update staff team failed", "error", err, "user_id", userID)
		writeStaffTeamError(w, err, "Failed to update team")
		return
	}
	writeJSON(w, http.StatusOK, t)
}

// DeleteTeam removes the team. Members cascade via FK.
// DELETE /api/staff/teams/{id}
func (h *StaffTeamHandler) DeleteTeam(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid team ID")
		return
	}
	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		slog.Error("delete staff team failed", "error", err, "user_id", userID, "team_id", id)
		writeStaffTeamError(w, err, "Failed to delete team")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
