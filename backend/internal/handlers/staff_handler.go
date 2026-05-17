package handlers

import (
	"crypto/sha256"
	"fmt"
	"encoding/hex"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// StaffHandler handles CRUD for the organizer's staff catalog (PRD: Personal feature).
type StaffHandler struct {
	staffRepo StaffRepository
	userRepo  UserRepository
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
			writeError(w, http.StatusInternalServerError, "Failed to search staff")
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
			writeError(w, http.StatusInternalServerError, "Failed to fetch staff")
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
		writeError(w, http.StatusInternalServerError, "Failed to fetch staff")
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
		writeError(w, http.StatusBadRequest, "Invalid staff ID")
		return
	}
	s, err := h.staffRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Staff not found")
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
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		count, err := h.staffRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify staff limits")
			return
		}
		if count >= 1 {
			writePlanLimitError(w, "staff_seats", count, 1)
			return
		}
	} else if user.Plan == "pro" || user.Plan == "premium" {
		count, err := h.staffRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify staff limits")
			return
		}
		if count >= 2 {
			writePlanLimitError(w, "staff_seats", count, 2)
			return
		}
	}
	// Business: unlimited — no check needed

	var s models.Staff
	if err := decodeJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := ValidateStaff(&s); err != nil {
		writeError(w, http.StatusBadRequest, validationErrorMessage(r.Context(), err))
		return
	}
	s.UserID = userID
	if err := h.staffRepo.Create(r.Context(), &s); err != nil {
		slog.Error("failed to create staff", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to create staff")
		return
	}
	writeJSON(w, http.StatusCreated, s)
}

// UpdateStaff updates a staff member.
// PUT /api/staff/{id}
func (h *StaffHandler) UpdateStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid staff ID")
		return
	}
	var s models.Staff
	if err := decodeJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
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
		writeError(w, http.StatusInternalServerError, "Failed to update staff")
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
		writeError(w, http.StatusBadRequest, "Invalid staff ID")
		return
	}
	if err := h.staffRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Staff not found")
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
		writeError(w, http.StatusBadRequest, "date or (start,end) is required")
		return
	}
	if _, err := time.Parse("2006-01-02", start); err != nil {
		writeError(w, http.StatusBadRequest, "invalid start date, expected YYYY-MM-DD")
		return
	}
	if _, err := time.Parse("2006-01-02", end); err != nil {
		writeError(w, http.StatusBadRequest, "invalid end date, expected YYYY-MM-DD")
		return
	}
	if end < start {
		writeError(w, http.StatusBadRequest, "end must be on or after start")
		return
	}

	items, err := h.staffRepo.GetAvailability(r.Context(), userID, start, end)
	if err != nil {
		slog.Error("staff availability failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to fetch availability")
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
		writeError(w, http.StatusServiceUnavailable, "Invite support is not configured")
		return
	}

	userID := middleware.GetUserID(r.Context())
	staffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid staff ID")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	plan := normalizePlan(user.Plan)
	if plan != "pro" && plan != "business" {
		writeError(w, http.StatusForbidden, "Team member login is available on Pro and Business plans")
		return
	}

	req := staffInviteRequest{TargetRole: "team_member"}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	targetRole := strings.ToLower(strings.TrimSpace(req.TargetRole))
	if targetRole == "" {
		targetRole = "team_member"
	}
	if targetRole != "team_member" && targetRole != "assistant" {
		writeError(w, http.StatusBadRequest, "target_role must be one of: team_member, assistant")
		return
	}
	if targetRole == "assistant" && plan != "business" {
		writeError(w, http.StatusForbidden, "Assistant access is available on Business plan")
		return
	}

	staff, err := h.staffRepo.GetByID(r.Context(), staffID, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Staff not found")
		return
	}
	if staff.Email == nil || strings.TrimSpace(*staff.Email) == "" {
		writeError(w, http.StatusBadRequest, "Staff must have an email before sending an invite")
		return
	}

	rawToken, err := generateFormToken()
	if err != nil {
		slog.Error("failed to generate staff invite token", "error", err, "user_id", userID, "staff_id", staffID)
		writeError(w, http.StatusInternalServerError, "Failed to create invite token")
		return
	}
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	hash := sha256.Sum256([]byte(rawToken))

	invite := &models.StaffInvite{
		StaffID:     staff.ID,
		OwnerUserID: userID,
		Email:       strings.TrimSpace(*staff.Email),
		TargetRole:  targetRole,
		TokenHash:   hex.EncodeToString(hash[:]),
		ExpiresAt:   expiresAt,
	}

	if err := h.staffRepo.CreateInvite(r.Context(), invite); err != nil {
		slog.Error("failed to create staff invite", "error", err, "user_id", userID, "staff_id", staffID)
		writeError(w, http.StatusInternalServerError, "Failed to create invite")
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
		writeError(w, http.StatusBadRequest, "Invalid staff ID")
		return
	}

	if _, err := h.staffRepo.GetByID(r.Context(), staffID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Staff not found")
		return
	}

	if err := h.staffRepo.RevokeInvite(r.Context(), staffID, userID); err != nil {
		slog.Error("failed to revoke staff invite", "error", err, "user_id", userID, "staff_id", staffID)
		writeError(w, http.StatusInternalServerError, "Failed to revoke invite")
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
		writeError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeError(w, http.StatusForbidden, "Team member access required")
		return
	}

	items, err := h.staffRepo.ListMyAssignments(r.Context(), userID)
	if err != nil {
		slog.Error("failed to list team-member assignments", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to fetch assignments")
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
		writeError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeError(w, http.StatusForbidden, "Team member access required")
		return
	}

	eventStaffID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	var req assignmentResponseRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response := strings.ToLower(strings.TrimSpace(req.Response))
	if response != "accept" && response != "decline" {
		writeError(w, http.StatusBadRequest, "response must be one of: accept, decline")
		return
	}

	outcome, err := h.staffRepo.RespondToAssignment(r.Context(), userID, eventStaffID, response)
	if err != nil {
		switch {
		case err == repository.ErrAssignmentNotFound:
			writeError(w, http.StatusNotFound, "Assignment not found")
		case err == repository.ErrAssignmentForbidden:
			writeError(w, http.StatusForbidden, "Assignment does not belong to current user")
		case err == repository.ErrAssignmentNotPending:
			writeError(w, http.StatusConflict, "Assignment is no longer pending")
		case err == repository.ErrOfferAlreadyFilled:
			writeError(w, http.StatusConflict, "Offer slot already taken")
		default:
			slog.Error("failed to respond assignment", "error", err, "user_id", userID, "event_staff_id", eventStaffID)
			writeError(w, http.StatusInternalServerError, "Failed to update assignment response")
		}
		return
	}

	writeJSON(w, http.StatusOK, outcome)
}

// GetMyTimeline lists team-member assignment changes in reverse chronological order.
//
// GET /api/staff/my-timeline?unread_only=true&limit=50
func (h *StaffHandler) GetMyTimeline(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeError(w, http.StatusForbidden, "Team member access required")
		return
	}

	unreadOnly := strings.EqualFold(strings.TrimSpace(r.URL.Query().Get("unread_only")), "true")
	limit := 50
	if value := strings.TrimSpace(r.URL.Query().Get("limit")); value != "" {
		if parsed, parseErr := parsePositiveInt(value, 200); parseErr != nil {
			writeError(w, http.StatusBadRequest, "limit must be an integer between 1 and 200")
			return
		} else {
			limit = parsed
		}
	}

	items, err := h.staffRepo.ListMyTimeline(r.Context(), userID, unreadOnly, limit)
	if err != nil {
		slog.Error("failed to list team-member timeline", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to fetch timeline")
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
		writeError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	if !isTeamPortalRole(strings.ToLower(strings.TrimSpace(user.Role))) {
		writeError(w, http.StatusForbidden, "Team member access required")
		return
	}

	var req markTimelineReadRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	ids := make([]uuid.UUID, 0, len(req.IDs))
	for _, rawID := range req.IDs {
		id, parseErr := uuid.Parse(strings.TrimSpace(rawID))
		if parseErr != nil {
			writeError(w, http.StatusBadRequest, "Invalid timeline item ID")
			return
		}
		ids = append(ids, id)
	}

	updated, err := h.staffRepo.MarkTimelineRead(r.Context(), userID, ids)
	if err != nil {
		slog.Error("failed to mark timeline read", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to mark timeline as read")
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
