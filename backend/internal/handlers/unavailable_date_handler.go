package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type UnavailableDateHandler struct {
	repo UnavailableDateRepository
}

func NewUnavailableDateHandler(repo UnavailableDateRepository) *UnavailableDateHandler {
	return &UnavailableDateHandler{repo: repo}
}

func (h *UnavailableDateHandler) GetUnavailableDates(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	startStr := r.URL.Query().Get("start")
	endStr := r.URL.Query().Get("end")

	if startStr == "" || endStr == "" {
		writeError(w, http.StatusBadRequest, "start and end dates are required")
		return
	}

	// Validate date formats
	if _, err := time.Parse("2006-01-02", startStr); err != nil {
		writeError(w, http.StatusBadRequest, "invalid start date format, expected YYYY-MM-DD")
		return
	}
	if _, err := time.Parse("2006-01-02", endStr); err != nil {
		writeError(w, http.StatusBadRequest, "invalid end date format, expected YYYY-MM-DD")
		return
	}

	dates, err := h.repo.GetByDateRange(r.Context(), userID, startStr, endStr)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get unavailable dates")
		return
	}
	writeJSON(w, http.StatusOK, dates)
}

func (h *UnavailableDateHandler) CreateUnavailableDate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var body struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		Reason    string `json:"reason"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Basic validation
	if body.StartDate == "" || body.EndDate == "" {
		writeError(w, http.StatusBadRequest, "start_date and end_date are required")
		return
	}

	start, err := time.Parse("2006-01-02", body.StartDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start_date format, expected YYYY-MM-DD")
		return
	}
	end, err := time.Parse("2006-01-02", body.EndDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end_date format, expected YYYY-MM-DD")
		return
	}

	if end.Before(start) {
		writeError(w, http.StatusBadRequest, "end_date must be after or equal to start_date")
		return
	}

	startTime, endTime, err := normalizeTimeRange(start, end, body.StartTime, body.EndTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	existing, err := h.repo.GetByDateRange(r.Context(), userID, body.StartDate, body.EndDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to validate unavailable date overlap")
		return
	}
	if hasOverlap(existing, body.StartDate, body.EndDate, startTime, endTime, uuid.Nil) {
		writeError(w, http.StatusConflict, "date range overlaps with an existing blocked period")
		return
	}

	var reasonPtr *string
	if body.Reason != "" {
		reasonPtr = &body.Reason
	}

	ud := &models.UnavailableDate{
		UserID:    userID,
		StartDate: body.StartDate,
		EndDate:   body.EndDate,
		StartTime: startTime,
		EndTime:   endTime,
		Reason:    reasonPtr,
	}

	if err := h.repo.Create(r.Context(), ud); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create unavailable date")
		return
	}

	writeJSON(w, http.StatusCreated, ud)
}

func (h *UnavailableDateHandler) UpdateUnavailableDate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	idStr := chi.URLParam(r, "id")

	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var body struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		StartTime string `json:"start_time"`
		EndTime   string `json:"end_time"`
		Reason    string `json:"reason"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if body.StartDate == "" || body.EndDate == "" {
		writeError(w, http.StatusBadRequest, "start_date and end_date are required")
		return
	}

	start, err := time.Parse("2006-01-02", body.StartDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start_date format, expected YYYY-MM-DD")
		return
	}
	end, err := time.Parse("2006-01-02", body.EndDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end_date format, expected YYYY-MM-DD")
		return
	}
	if end.Before(start) {
		writeError(w, http.StatusBadRequest, "end_date must be after or equal to start_date")
		return
	}

	startTime, endTime, err := normalizeTimeRange(start, end, body.StartTime, body.EndTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	existing, err := h.repo.GetByDateRange(r.Context(), userID, body.StartDate, body.EndDate)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to validate unavailable date overlap")
		return
	}
	if hasOverlap(existing, body.StartDate, body.EndDate, startTime, endTime, id) {
		writeError(w, http.StatusConflict, "date range overlaps with an existing blocked period")
		return
	}

	var reasonPtr *string
	if body.Reason != "" {
		reasonPtr = &body.Reason
	}

	ud := &models.UnavailableDate{
		ID:        id,
		UserID:    userID,
		StartDate: body.StartDate,
		EndDate:   body.EndDate,
		StartTime: startTime,
		EndTime:   endTime,
		Reason:    reasonPtr,
	}

	if err := h.repo.Update(r.Context(), ud); err != nil {
		writeError(w, http.StatusNotFound, "unavailable date not found")
		return
	}

	writeJSON(w, http.StatusOK, ud)
}

func (h *UnavailableDateHandler) DeleteUnavailableDate(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	idStr := chi.URLParam(r, "id")

	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.repo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "unavailable date not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func normalizeTimeRange(startDate, endDate time.Time, rawStart, rawEnd string) (*string, *string, error) {
	rawStart = strings.TrimSpace(rawStart)
	rawEnd = strings.TrimSpace(rawEnd)

	if rawStart == "" && rawEnd == "" {
		return nil, nil, nil
	}
	if rawStart == "" || rawEnd == "" {
		return nil, nil, errBadRequest("start_time and end_time are required together")
	}
	if !startDate.Equal(endDate) {
		return nil, nil, errBadRequest("time range requires start_date and end_date to be the same day")
	}

	startClock, err := time.Parse("15:04", rawStart)
	if err != nil {
		return nil, nil, errBadRequest("invalid start_time format, expected HH:MM")
	}
	endClock, err := time.Parse("15:04", rawEnd)
	if err != nil {
		return nil, nil, errBadRequest("invalid end_time format, expected HH:MM")
	}
	if !endClock.After(startClock) {
		return nil, nil, errBadRequest("end_time must be after start_time")
	}

	start := rawStart
	end := rawEnd
	return &start, &end, nil
}

func hasOverlap(existing []models.UnavailableDate, startDate, endDate string, startTime, endTime *string, ignoreID uuid.UUID) bool {
	for _, item := range existing {
		if ignoreID != uuid.Nil && item.ID == ignoreID {
			continue
		}

		if item.StartDate > endDate || item.EndDate < startDate {
			continue
		}

		// Full-day blocks overlap any other block sharing dates.
		if item.StartTime == nil || item.EndTime == nil || startTime == nil || endTime == nil {
			return true
		}

		if item.StartDate != startDate || item.EndDate != endDate {
			return true
		}

		curStart, err1 := time.Parse("15:04", *startTime)
		curEnd, err2 := time.Parse("15:04", *endTime)
		existingStart, err3 := time.Parse("15:04", *item.StartTime)
		existingEnd, err4 := time.Parse("15:04", *item.EndTime)
		if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
			return true
		}

		if curStart.Before(existingEnd) && existingStart.Before(curEnd) {
			return true
		}
	}

	return false
}

type errBadRequest string

func (e errBadRequest) Error() string { return string(e) }
