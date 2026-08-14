package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// StaffHandler handles CRUD for the organizer's staff catalog (PRD: Personal feature).
type StaffHandler struct {
	staffRepo StaffRepository
	userRepo  UserRepository
	pool      *pgxpool.Pool // optional; when nil, falls back to non-transactional path (tests)
	authSvc   *services.AuthService
	emailSvc  *services.EmailService
	frontend  string
}

type assignmentResponseRequest struct {
	Response string `json:"response"`
}

type staffInviteRequest struct {
	TargetRole string `json:"target_role"`
}

type markTimelineReadRequest struct {
	IDs []string `json:"ids"`
}

// executionStateRequest is the PUT body for /staff/assignments/{id}/execution-state.
// Checklist and QuickNote are pointers so "omitted" is distinguishable from
// "set to zero value" — the repo writes the full decoded shape either way.
type executionStateRequest struct {
	Checklist executionChecklistRequest `json:"checklist"`
	QuickNote string                    `json:"quick_note"`
}

type executionChecklistRequest struct {
	Arrival   bool `json:"arrival"`
	Materials bool `json:"materials"`
	Closing   bool `json:"closing"`
}

// MaxQuickNoteLength caps the free-text execution note to bound the JSONB
// column and prevent abuse. Matches the limit enforced client-side.
const MaxQuickNoteLength = 2000

func isTeamPortalRole(role string) bool {
	return role == "team_member" || role == "assistant"
}

func NewStaffHandler(staffRepo StaffRepository, userRepo UserRepository) *StaffHandler {
	return &StaffHandler{staffRepo: staffRepo, userRepo: userRepo}
}

// SetInviteSupport enables Phase 3 invitation generation (token + optional email).
// Keeping this optional avoids impacting tests that only validate CRUD behavior.
func (h *StaffHandler) SetInviteSupport(authSvc *services.AuthService, emailSvc *services.EmailService, frontendURL string) {
	h.authSvc = authSvc
	h.emailSvc = emailSvc
	h.frontend = strings.TrimRight(frontendURL, "/")
}

// SetPool configures the pgxpool needed for atomic plan-limit enforcement on
// CreateStaff. When nil (e.g. unit tests using mocks), CreateStaff falls back
// to the non-transactional count + create path.
func (h *StaffHandler) SetPool(p *pgxpool.Pool) {
	h.pool = p
}

var staffSortAllowlist = map[string]string{
	"name":       "name",
	"created_at": "created_at",
	"role_label": "role_label",
}

// ListStaff lists the organizer's staff catalog.
// GET /api/staff?page=&limit=&sort=&order=&q=
func (h *StaffHandler) ListStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	if q := r.URL.Query().Get("q"); q != "" {
		results, err := h.staffRepo.Search(r.Context(), userID, q)
		if err != nil {
			slog.Error("staff search failed", "error", err, "user_id", userID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.search_failed")
			return
		}
		writeJSON(w, http.StatusOK, results)
		return
	}

	params := parsePaginationParams(r, staffSortAllowlist, "name")
	if params != nil {
		offset := (params.Page - 1) * params.Limit
		staff, total, err := h.staffRepo.GetAllPaginated(r.Context(), userID, offset, params.Limit, params.Sort, params.Order)
		if err != nil {
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_failed")
			return
		}
		if staff == nil {
			staff = []models.Staff{}
		}
		writePaginatedJSON(w, http.StatusOK, staff, total, params)
		return
	}

	staff, err := h.staffRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_failed")
		return
	}
	writeJSON(w, http.StatusOK, staff)
}

// GetStaff returns one staff member by id.
// GET /api/staff/{id}
func (h *StaffHandler) GetStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_id")
		return
	}
	s, err := h.staffRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusNotFound, "staff.not_found")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// CreateStaff creates a new staff member.
// POST /api/staff
//
// Staff seats are gated by plan: Gratis=1, Pro=2, Business=∞.
// Phase 2 gates `notification_email_opt_in` to Pro+; Phase 3 gates the
// invitation flow to Pro+.
func (h *StaffHandler) CreateStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	// Check staff seat limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "crud.fetch_user_limits_failed")
		return
	}

	var s models.Staff
	if err := decodeJSON(w, r, &s); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}
	if err := ValidateStaff(&s); err != nil {
		writeError(w, http.StatusBadRequest, validationErrorMessage(r.Context(), err))
		return
	}
	s.UserID = userID

	plan := normalizePlan(user.Plan)

	// Determine per-plan seat limit; 0 means unlimited.
	var seatLimit int
	switch plan {
	case "basic":
		seatLimit = 1
	case "pro":
		seatLimit = 2
	default:
		// business and any unknown paid plans: unlimited — skip atomic path.
		seatLimit = 0
	}

	if seatLimit > 0 {
		countSQL := `SELECT COUNT(*) FROM staff WHERE user_id = $1`
		err := withPlanLimit(r.Context(), h.pool, userID, "staff_seats", seatLimit, countSQL,
			func(ctx context.Context, tx pgx.Tx) error {
				return tx.QueryRow(ctx,
					`INSERT INTO staff (user_id, name, role_label, phone, email, notes, notification_email_opt_in)
					VALUES ($1, $2, $3, $4, $5, $6, $7)
					RETURNING id, created_at, updated_at`,
					s.UserID, s.Name, s.RoleLabel, s.Phone, s.Email, s.Notes, s.NotificationEmailOptIn,
				).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
			},
		)
		if err == errPoolNil {
			// Fallback: pool not available (unit tests with mocks).
			count, cErr := h.staffRepo.CountByUserID(r.Context(), userID)
			if cErr != nil {
				writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.verify_limits_failed")
				return
			}
			if count >= seatLimit {
				writePlanLimitError(w, r, "staff_seats", count, seatLimit)
				return
			}
			if cErr := h.staffRepo.Create(r.Context(), &s); cErr != nil {
				slog.Error("failed to create staff", "error", cErr, "user_id", userID)
				writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.create_failed")
				return
			}
		} else if errors.Is(err, ErrPlanLimitReached) {
			writePlanLimitError(w, r, "staff_seats", seatLimit, seatLimit)
			return
		} else if err != nil {
			slog.Error("failed to create staff", "error", err, "user_id", userID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.create_failed")
			return
		}
	} else {
		if err := h.staffRepo.Create(r.Context(), &s); err != nil {
			slog.Error("failed to create staff", "error", err, "user_id", userID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.create_failed")
			return
		}
	}

	writeJSON(w, http.StatusCreated, s)
}

// UpdateStaff updates a staff member.
// PUT /api/staff/{id}
func (h *StaffHandler) UpdateStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_id")
		return
	}
	var s models.Staff
	if err := decodeJSON(w, r, &s); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}
	if err := ValidateStaff(&s); err != nil {
		writeError(w, http.StatusBadRequest, validationErrorMessage(r.Context(), err))
		return
	}
	s.ID = id
	s.UserID = userID
	if err := h.staffRepo.Update(r.Context(), &s); err != nil {
		slog.Error("failed to update staff", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.update_failed")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

// DeleteStaff deletes a staff member. Assignments cascade via FK.
// DELETE /api/staff/{id}
func (h *StaffHandler) DeleteStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_id")
		return
	}
	if err := h.staffRepo.Delete(r.Context(), id, userID); err != nil {
		writeCRUDI18nError(w, r, http.StatusNotFound, "staff.not_found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetStaffAvailability returns staff with assignments inside a date window.
// Staff without assignments in the window are omitted (considered free).
//
// GET /api/staff/availability?date=YYYY-MM-DD          (single day)
// GET /api/staff/availability?start=YYYY-MM-DD&end=... (range, inclusive)
func (h *StaffHandler) GetStaffAvailability(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	if date := r.URL.Query().Get("date"); date != "" {
		start, end = date, date
	}

	if start == "" || end == "" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.availability_date_required")
		return
	}
	if _, err := time.Parse("2006-01-02", start); err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_start_date")
		return
	}
	if _, err := time.Parse("2006-01-02", end); err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_end_date")
		return
	}
	if end < start {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.end_before_start")
		return
	}

	items, err := h.staffRepo.GetAvailability(r.Context(), userID, start, end)
	if err != nil {
		slog.Error("staff availability failed", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_availability_failed")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// InviteStaffUser creates (or rotates) an invitation for a staff collaborator
// to activate a team-member account. Pro and Business plans only.
//
// POST /api/staff/{id}/invite
func (h *StaffHandler) InviteStaffUser(w http.ResponseWriter, r *http.Request) {
	if h.authSvc == nil {
		writeCRUDI18nError(w, r, http.StatusServiceUnavailable, "staff.invite_not_configured")
		return
	}

	userID := middleware.GetUserID(r.Context())
	staffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_id")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	plan := normalizePlan(user.Plan)
	if plan != "pro" && plan != "business" {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_plan_required")
		return
	}

	req := staffInviteRequest{TargetRole: "team_member"}
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}
	targetRole := strings.ToLower(strings.TrimSpace(req.TargetRole))
	if targetRole == "" {
		targetRole = "team_member"
	}
	if targetRole != "team_member" && targetRole != "assistant" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_target_role")
		return
	}
	if targetRole == "assistant" && plan != "business" {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.assistant_plan_required")
		return
	}

	staff, err := h.staffRepo.GetByID(r.Context(), staffID, userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusNotFound, "staff.not_found")
		return
	}
	if staff.Email == nil || strings.TrimSpace(*staff.Email) == "" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invite_email_required")
		return
	}

	rawToken, err := generateFormToken()
	if err != nil {
		slog.Error("failed to generate staff invite token", "error", err, "user_id", userID, "staff_id", staffID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.create_invite_token_failed")
		return
	}
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	hash := sha256.Sum256([]byte(rawToken))

	invite := &models.StaffInvite{
		StaffID:     staff.ID,
		OwnerUserID: userID,
		Email:       normalizeEmail(*staff.Email),
		TargetRole:  targetRole,
		TokenHash:   hex.EncodeToString(hash[:]),
		ExpiresAt:   expiresAt,
	}

	if err := h.staffRepo.CreateInvite(r.Context(), invite); err != nil {
		slog.Error("failed to create staff invite", "error", err, "user_id", userID, "staff_id", staffID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.create_invite_failed")
		return
	}

	acceptPath := "/team-invite?token=" + url.QueryEscape(rawToken)
	acceptURL := acceptPath
	if h.frontend != "" {
		acceptURL = h.frontend + acceptPath
	}

	if h.emailSvc == nil {
		slog.Info("staff invite created without email delivery", "user_id", userID, "staff_id", staffID)
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"invite_id":   invite.ID,
		"staff_id":    invite.StaffID,
		"email":       invite.Email,
		"target_role": invite.TargetRole,
		"status":      invite.Status,
		"accept_url":  acceptURL,
		"expires_at":  invite.ExpiresAt,
		"created_at":  invite.CreatedAt,
	})
}

// RevokeStaffInvite revokes the pending invite for a staff member.
// DELETE /api/staff/{id}/invite
func (h *StaffHandler) RevokeStaffInvite(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	staffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_id")
		return
	}

	if _, err := h.staffRepo.GetByID(r.Context(), staffID, userID); err != nil {
		writeCRUDI18nError(w, r, http.StatusNotFound, "staff.not_found")
		return
	}

	if err := h.staffRepo.RevokeInvite(r.Context(), staffID, userID); err != nil {
		slog.Error("failed to revoke staff invite", "error", err, "user_id", userID, "staff_id", staffID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.revoke_invite_failed")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetMyAssignments lists event assignments for the authenticated team-member.
//
// GET /api/staff/my-assignments
func (h *StaffHandler) GetMyAssignments(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	items, err := h.staffRepo.ListMyAssignments(r.Context(), userID)
	if err != nil {
		slog.Error("failed to list team-member assignments", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_assignments_failed")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

// RespondAssignment allows a team-member to accept or decline an assignment.
// For grouped offers, acceptance follows first-come-first-served semantics.
//
// POST /api/staff/assignments/{id}/respond
func (h *StaffHandler) RespondAssignment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	eventStaffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_assignment_id")
		return
	}

	var req assignmentResponseRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}

	response := strings.ToLower(strings.TrimSpace(req.Response))
	if response != "accept" && response != "decline" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_response_value")
		return
	}

	outcome, err := h.staffRepo.RespondToAssignment(r.Context(), userID, eventStaffID, response)
	if err != nil {
		switch {
		case err == repository.ErrAssignmentNotFound:
			writeCRUDI18nError(w, r, http.StatusNotFound, "staff.assignment_not_found")
		case err == repository.ErrAssignmentForbidden:
			writeCRUDI18nError(w, r, http.StatusForbidden, "staff.assignment_forbidden")
		case err == repository.ErrAssignmentNotPending:
			writeCRUDI18nError(w, r, http.StatusConflict, "staff.assignment_not_pending")
		case err == repository.ErrOfferAlreadyFilled:
			writeCRUDI18nError(w, r, http.StatusConflict, "staff.offer_already_filled")
		default:
			slog.Error("failed to respond assignment", "error", err, "user_id", userID, "event_staff_id", eventStaffID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.update_assignment_failed")
		}
		return
	}

	writeJSON(w, http.StatusOK, outcome)
}

// GetExecutionState returns the team-member execution state for an assignment
// (checklist progress + quick note). Previously device-only (#875).
//
// GET /api/staff/assignments/{id}/execution-state
func (h *StaffHandler) GetExecutionState(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	eventStaffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_assignment_id")
		return
	}

	state, err := h.staffRepo.GetExecutionState(r.Context(), userID, eventStaffID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrAssignmentNotFound):
			writeCRUDI18nError(w, r, http.StatusNotFound, "staff.assignment_not_found")
		case errors.Is(err, repository.ErrAssignmentForbidden):
			writeCRUDI18nError(w, r, http.StatusForbidden, "staff.assignment_forbidden")
		default:
			slog.Error("failed to get execution state", "error", err, "user_id", userID, "event_staff_id", eventStaffID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_execution_state_failed")
		}
		return
	}

	writeJSON(w, http.StatusOK, state)
}

// PutExecutionState upserts the team-member execution state for an assignment
// (checklist progress + quick note). Previously device-only (#875).
//
// PUT /api/staff/assignments/{id}/execution-state
func (h *StaffHandler) PutExecutionState(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	eventStaffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_assignment_id")
		return
	}

	var req executionStateRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}

	if len(req.QuickNote) > MaxQuickNoteLength {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.quick_note_too_long")
		return
	}

	state := repository.AssignmentExecutionState{
		Checklist: repository.ExecutionChecklist{
			Arrival:   req.Checklist.Arrival,
			Materials: req.Checklist.Materials,
			Closing:   req.Checklist.Closing,
		},
		QuickNote: req.QuickNote,
	}

	saved, err := h.staffRepo.UpsertExecutionState(r.Context(), userID, eventStaffID, state)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrAssignmentNotFound):
			writeCRUDI18nError(w, r, http.StatusNotFound, "staff.assignment_not_found")
		case errors.Is(err, repository.ErrAssignmentForbidden):
			writeCRUDI18nError(w, r, http.StatusForbidden, "staff.assignment_forbidden")
		default:
			slog.Error("failed to upsert execution state", "error", err, "user_id", userID, "event_staff_id", eventStaffID)
			writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.save_execution_state_failed")
		}
		return
	}

	writeJSON(w, http.StatusOK, saved)
}

// GetMyTimeline lists team-member assignment changes in reverse chronological order.
//
// GET /api/staff/my-timeline?unread_only=true&limit=50
func (h *StaffHandler) GetMyTimeline(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	unreadOnly := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("unread_only")), "true")
	limit := 50
	if value := strings.TrimSpace(r.URL.Query().Get("limit")); value != "" {
		if parsed, parseErr := parsePositiveInt(value, 200); parseErr != nil {
			writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_timeline_limit")
			return
		} else {
			limit = parsed
		}
	}

	items, err := h.staffRepo.ListMyTimeline(r.Context(), userID, unreadOnly, limit)
	if err != nil {
		slog.Error("failed to list team-member timeline", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_timeline_failed")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

// MarkMyTimelineRead marks timeline items as read.
//
// POST /api/staff/my-timeline/read
func (h *StaffHandler) MarkMyTimelineRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.fetch_user_failed")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeCRUDI18nError(w, r, http.StatusForbidden, "staff.team_member_access_required")
		return
	}

	var req markTimelineReadRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeCRUDI18nError(w, r, http.StatusBadRequest, "common.invalid_request_body")
		return
	}

	ids := make([]uuid.UUID, 0, len(req.IDs))
	for _, rawID := range req.IDs {
		id, parseErr := uuid.Parse(strings.TrimSpace(rawID))
		if parseErr != nil {
			writeCRUDI18nError(w, r, http.StatusBadRequest, "staff.invalid_timeline_item_id")
			return
		}
		ids = append(ids, id)
	}

	updated, err := h.staffRepo.MarkTimelineRead(r.Context(), userID, ids)
	if err != nil {
		slog.Error("failed to mark timeline read", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "staff.mark_timeline_read_failed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"updated": updated})
}

func parsePositiveInt(value string, max int) (int, error) {
	n := 0
	for _, ch := range value {
		if ch < '0' || ch > '9' {
			return 0, fmt.Errorf("invalid integer")
		}
		n = (n * 10) + int(ch-'0')
		if n > max {
			return 0, fmt.Errorf("too large")
		}
	}
	if n <= 0 {
		return 0, fmt.Errorf("must be positive")
	}
	return n, nil
}
