package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func makeUnavailReq(method, path, body string, userID uuid.UUID) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	return req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
}

func TestUnavailableDateHandler_GetUnavailableDates(t *testing.T) {
	userID := uuid.New()

	t.Run("Success", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		reason := "vacation"
		dates := []models.UnavailableDate{
			{ID: uuid.New(), UserID: userID, StartDate: "2026-03-01", EndDate: "2026-03-05", Reason: &reason},
		}
		repo.On("GetByDateRange", mock.Anything, userID, "2026-03-01", "2026-03-31").Return(dates, nil)

		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?start=2026-03-01&end=2026-03-31", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "2026-03-01")
		repo.AssertExpectations(t)
	})

	t.Run("MissingStartDate_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?end=2026-03-31", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "start and end dates are required")
	})

	t.Run("MissingEndDate_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?start=2026-03-01", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "start and end dates are required")
	})

	t.Run("InvalidStartDateFormat_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?start=bad-date&end=2026-03-31", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid start date format")
	})

	t.Run("InvalidEndDateFormat_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?start=2026-03-01&end=notadate", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid end date format")
	})

	t.Run("RepoError_Returns500", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("GetByDateRange", mock.Anything, userID, "2026-03-01", "2026-03-31").Return(nil, assert.AnError)

		req := makeUnavailReq(http.MethodGet, "/api/unavailable-dates?start=2026-03-01&end=2026-03-31", "", userID)
		rr := httptest.NewRecorder()
		h.GetUnavailableDates(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "failed to get unavailable dates")
		repo.AssertExpectations(t)
	})
}

func TestUnavailableDateHandler_CreateUnavailableDate(t *testing.T) {
	userID := uuid.New()

	t.Run("Success", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-01", "2026-04-03").Return([]models.UnavailableDate{}, nil)
		repo.On("Create", mock.Anything, mock.AnythingOfType("*models.UnavailableDate")).Return(nil)

		body := `{"start_date":"2026-04-01","end_date":"2026-04-03","reason":"conference"}`
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", body, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Contains(t, rr.Body.String(), "2026-04-01")
		repo.AssertExpectations(t)
	})

	t.Run("Success_WithoutReason", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-01", "2026-04-01").Return([]models.UnavailableDate{}, nil)
		repo.On("Create", mock.Anything, mock.AnythingOfType("*models.UnavailableDate")).Return(nil)

		body := `{"start_date":"2026-04-01","end_date":"2026-04-01"}`
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", body, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("InvalidJSON_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{bad`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid request body")
	})

	t.Run("MissingStartDate_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"end_date":"2026-04-03"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "start_date and end_date are required")
	})

	t.Run("MissingEndDate_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"start_date":"2026-04-01"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "start_date and end_date are required")
	})

	t.Run("InvalidStartDateFormat_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"start_date":"not-a-date","end_date":"2026-04-03"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid start_date format")
	})

	t.Run("InvalidEndDateFormat_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"start_date":"2026-04-01","end_date":"bad"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid end_date format")
	})

	t.Run("EndBeforeStart_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"start_date":"2026-04-05","end_date":"2026-04-01"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "end_date must be after or equal to start_date")
	})

	t.Run("RepoError_Returns500", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-01", "2026-04-03").Return([]models.UnavailableDate{}, nil)
		repo.On("Create", mock.Anything, mock.AnythingOfType("*models.UnavailableDate")).Return(assert.AnError)

		body := `{"start_date":"2026-04-01","end_date":"2026-04-03"}`
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", body, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "failed to create unavailable date")
		repo.AssertExpectations(t)
	})

	t.Run("OverlappingRange_Returns409", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		reason := "busy"
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-01", "2026-04-03").Return([]models.UnavailableDate{
			{ID: uuid.New(), UserID: userID, StartDate: "2026-04-02", EndDate: "2026-04-05", Reason: &reason},
		}, nil)

		body := `{"start_date":"2026-04-01","end_date":"2026-04-03"}`
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", body, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusConflict, rr.Code)
		assert.Contains(t, rr.Body.String(), "overlaps")
		repo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
	})

	t.Run("InvalidTimeRange_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodPost, "/api/unavailable-dates", `{"start_date":"2026-04-01","end_date":"2026-04-01","start_time":"18:00","end_time":"10:00"}`, userID)
		rr := httptest.NewRecorder()
		h.CreateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "end_time must be after start_time")
	})
}

func TestUnavailableDateHandler_UpdateUnavailableDate(t *testing.T) {
	userID := uuid.New()
	dateID := uuid.New()

	t.Run("Success", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-10", "2026-04-10").Return([]models.UnavailableDate{}, nil)
		repo.On("Update", mock.Anything, mock.AnythingOfType("*models.UnavailableDate")).Return(nil)

		req := makeUnavailReq(http.MethodPut, "/api/unavailable-dates/"+dateID.String(), `{"start_date":"2026-04-10","end_date":"2026-04-10","start_time":"09:00","end_time":"12:00","reason":"doctor"}`, userID)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", dateID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rr := httptest.NewRecorder()
		h.UpdateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "09:00")
		repo.AssertExpectations(t)
	})

	t.Run("Overlap_Returns409", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		existingStart := "11:00"
		existingEnd := "13:00"
		repo.On("GetByDateRange", mock.Anything, userID, "2026-04-10", "2026-04-10").Return([]models.UnavailableDate{{ID: uuid.New(), UserID: userID, StartDate: "2026-04-10", EndDate: "2026-04-10", StartTime: &existingStart, EndTime: &existingEnd}}, nil)

		req := makeUnavailReq(http.MethodPut, "/api/unavailable-dates/"+dateID.String(), `{"start_date":"2026-04-10","end_date":"2026-04-10","start_time":"12:00","end_time":"14:00"}`, userID)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", dateID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rr := httptest.NewRecorder()
		h.UpdateUnavailableDate(rr, req)

		assert.Equal(t, http.StatusConflict, rr.Code)
		assert.Contains(t, rr.Body.String(), "overlaps")
	})
}

func TestUnavailableDateHandler_DeleteUnavailableDate(t *testing.T) {
	userID := uuid.New()
	dateID := uuid.New()

	t.Run("Success", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("Delete", mock.Anything, dateID, userID).Return(nil)

		req := makeUnavailReq(http.MethodDelete, "/api/unavailable-dates/"+dateID.String(), "", userID)
		// Set chi URL param
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", dateID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rr := httptest.NewRecorder()
		h.DeleteUnavailableDate(rr, req)

		assert.Equal(t, http.StatusNoContent, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("InvalidID_Returns400", func(t *testing.T) {
		h := NewUnavailableDateHandler(new(MockUnavailableDateRepo))
		req := makeUnavailReq(http.MethodDelete, "/api/unavailable-dates/not-a-uuid", "", userID)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "not-a-uuid")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rr := httptest.NewRecorder()
		h.DeleteUnavailableDate(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "invalid id")
	})

	t.Run("NotFound_Returns404", func(t *testing.T) {
		repo := new(MockUnavailableDateRepo)
		h := NewUnavailableDateHandler(repo)
		repo.On("Delete", mock.Anything, dateID, userID).Return(assert.AnError)

		req := makeUnavailReq(http.MethodDelete, "/api/unavailable-dates/"+dateID.String(), "", userID)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", dateID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		rr := httptest.NewRecorder()
		h.DeleteUnavailableDate(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "unavailable date not found")
		repo.AssertExpectations(t)
	})
}
