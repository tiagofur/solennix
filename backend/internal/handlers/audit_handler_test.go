package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// GetActivity
// ---------------------------------------------------------------------------

func TestGetActivity(t *testing.T) {
	t.Run("GivenValidRequest_WhenAuditLogsExist_ThenReturnPaginated", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		logs := []models.AuditLog{{ID: uuid.New(), Action: "create", ResourceType: "event"}}
		repo.On("GetByUser", mock.Anything, mock.Anything, 0, 20).Return(logs, 1, nil)

		req := httptest.NewRequest(http.MethodGet, "/dashboard/activity?page=1&limit=20", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, uuid.New())
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetActivity(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total":1`)
		assert.Contains(t, rr.Body.String(), `"page":1`)
		repo.AssertExpectations(t)
	})

	t.Run("GivenNoPaginationParams_WhenCalled_ThenUseDefaults", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		logs := []models.AuditLog{}
		repo.On("GetByUser", mock.Anything, mock.Anything, 0, 20).Return(logs, 0, nil)

		req := httptest.NewRequest(http.MethodGet, "/dashboard/activity", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, uuid.New())
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetActivity(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total":0`)
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetActivity_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		repo.On("GetByUser", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
			Return(nil, 0, errors.New("db error"))

		req := httptest.NewRequest(http.MethodGet, "/dashboard/activity?page=1", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, uuid.New())
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetActivity(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get activity log")
		repo.AssertExpectations(t)
	})

	t.Run("GivenCustomPagination_WhenPageIs2_ThenOffsetCalculated", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		logs := []models.AuditLog{{ID: uuid.New(), Action: "update", ResourceType: "client"}}
		// page=2, limit=10 -> offset = (2-1)*10 = 10
		repo.On("GetByUser", mock.Anything, mock.Anything, 10, 10).Return(logs, 15, nil)

		req := httptest.NewRequest(http.MethodGet, "/dashboard/activity?page=2&limit=10", nil)
		ctx := context.WithValue(req.Context(), middleware.UserIDKey, uuid.New())
		req = req.WithContext(ctx)
		rr := httptest.NewRecorder()

		handler.GetActivity(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total":15`)
		assert.Contains(t, rr.Body.String(), `"page":2`)
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetAllAuditLogs
// ---------------------------------------------------------------------------

func TestGetAllAuditLogs(t *testing.T) {
	t.Run("GivenValidRequest_WhenLogsExist_ThenReturnPaginated", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		logs := []models.AuditLog{
			{ID: uuid.New(), Action: "create", ResourceType: "event"},
			{ID: uuid.New(), Action: "delete", ResourceType: "client"},
		}
		repo.On("GetAll", mock.Anything, 0, 50).Return(logs, 2, nil)

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs?page=1&limit=50", nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total":2`)
		repo.AssertExpectations(t)
	})

	t.Run("GivenNoPaginationParams_WhenCalled_ThenUseDefaults", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		repo.On("GetAll", mock.Anything, 0, 50).Return([]models.AuditLog{}, 0, nil)

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs", nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetAllAuditLogs_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		repo.On("GetAll", mock.Anything, mock.Anything, mock.Anything).
			Return(nil, 0, errors.New("db error"))

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs?page=1", nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get audit logs")
		repo.AssertExpectations(t)
	})

	t.Run("GivenPage3Limit25_WhenCalled_ThenCorrectOffset", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		// page=3, limit=25 -> offset = (3-1)*25 = 50
		repo.On("GetAll", mock.Anything, 50, 25).Return([]models.AuditLog{}, 100, nil)

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs?page=3&limit=25", nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total_pages":4`)
		repo.AssertExpectations(t)
	})

	t.Run("GivenUserIDQueryParam_WhenValid_ThenReturnUserFilteredLogs", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		userID := uuid.New()
		logs := []models.AuditLog{
			{ID: uuid.New(), UserID: userID, Action: "create", ResourceType: "event"},
		}
		repo.On("GetByUser", mock.Anything, userID, 0, 50).Return(logs, 1, nil)

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs?user_id="+userID.String(), nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), `"total":1`)
		repo.AssertExpectations(t)
	})

	t.Run("GivenUserIDQueryParam_WhenInvalid_ThenReturnBadRequest", func(t *testing.T) {
		repo := new(MockAuditRepo)
		handler := NewAuditHandler(repo)

		req := httptest.NewRequest(http.MethodGet, "/admin/audit-logs?user_id=invalid-uuid", nil)
		rr := httptest.NewRecorder()

		handler.GetAllAuditLogs(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid user_id format")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// NewAuditHandler
// ---------------------------------------------------------------------------

func TestNewAuditHandler(t *testing.T) {
	repo := new(MockAuditRepo)
	handler := NewAuditHandler(repo)
	assert.NotNil(t, handler)
}
