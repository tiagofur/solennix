package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// StaffHandler handles CRUD for the organizer's staff catalog (PRD: Personal feature).
type StaffHandler struct {
	staffRepo StaffRepository
}

func NewStaffHandler(staffRepo StaffRepository) *StaffHandler {
	return &StaffHandler{staffRepo: staffRepo}
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
// Phase 1 has no tier gating — all plans can manage staff. Phase 2 will
// gate `notification_email_opt_in = true` to Pro+; Phase 3 will gate the
// invitation flow to Business+.
func (h *StaffHandler) CreateStaff(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var s models.Staff
	if err := decodeJSON(r, &s); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := ValidateStaff(&s); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
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
		writeError(w, http.StatusBadRequest, err.Error())
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
