package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// ---------------------------------------------------------------------------
// TestNewAdminHandler
// ---------------------------------------------------------------------------

func TestNewAdminHandler(t *testing.T) {
	repo := new(MockAdminRepo)
	handler := NewAdminHandler(repo)
	assert.NotNil(t, handler)
}

// ---------------------------------------------------------------------------
// TestAdminHandler_GetStats
// ---------------------------------------------------------------------------

func TestAdminHandler_GetStats(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		stats := &repository.PlatformStats{
			TotalUsers:  42,
			BasicUsers:  30,
			ProUsers:    10,
			PremiumUsers: 2,
			TotalEvents: 100,
		}
		repo.On("GetPlatformStats", mock.Anything).Return(stats, nil)

		req := httptest.NewRequest("GET", "/api/admin/stats", nil)
		w := httptest.NewRecorder()

		handler.GetStats(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp repository.PlatformStats
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, 42, resp.TotalUsers)
		assert.Equal(t, 100, resp.TotalEvents)
		repo.AssertExpectations(t)
	})

	t.Run("repo error", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		repo.On("GetPlatformStats", mock.Anything).Return(nil, assert.AnError)

		req := httptest.NewRequest("GET", "/api/admin/stats", nil)
		w := httptest.NewRecorder()

		handler.GetStats(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Failed to get platform stats")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// TestAdminHandler_ListUsers
// ---------------------------------------------------------------------------

func TestAdminHandler_ListUsers(t *testing.T) {
	t.Run("success with data", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		users := []repository.AdminUser{
			{ID: uuid.New(), Email: "a@b.com", Name: "Alice", Plan: "pro"},
			{ID: uuid.New(), Email: "c@d.com", Name: "Bob", Plan: "basic"},
		}
		repo.On("GetAllUsers", mock.Anything).Return(users, nil)

		req := httptest.NewRequest("GET", "/api/admin/users", nil)
		w := httptest.NewRecorder()

		handler.ListUsers(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp []repository.AdminUser
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Len(t, resp, 2)
		repo.AssertExpectations(t)
	})

	t.Run("success with nil users returns empty array", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		repo.On("GetAllUsers", mock.Anything).Return(nil, nil)

		req := httptest.NewRequest("GET", "/api/admin/users", nil)
		w := httptest.NewRecorder()

		handler.ListUsers(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp []repository.AdminUser
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Len(t, resp, 0)
		repo.AssertExpectations(t)
	})

	t.Run("repo error", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		repo.On("GetAllUsers", mock.Anything).Return(nil, assert.AnError)

		req := httptest.NewRequest("GET", "/api/admin/users", nil)
		w := httptest.NewRecorder()

		handler.ListUsers(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Failed to list users")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// TestAdminHandler_GetUser
// ---------------------------------------------------------------------------

func TestAdminHandler_GetUser(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{
			ID:    userID,
			Email: "test@example.com",
			Name:  "Test User",
			Plan:  "pro",
		}
		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil)

		req := httptest.NewRequest("GET", "/api/admin/users/"+userID.String(), nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", userID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		w := httptest.NewRecorder()

		handler.GetUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp repository.AdminUser
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, userID, resp.ID)
		repo.AssertExpectations(t)
	})

	t.Run("invalid UUID", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		req := httptest.NewRequest("GET", "/api/admin/users/not-a-uuid", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "not-a-uuid")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		w := httptest.NewRecorder()

		handler.GetUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid user ID")
	})

	t.Run("repo error (not found)", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		repo.On("GetUserByID", mock.Anything, userID).Return(nil, assert.AnError)

		req := httptest.NewRequest("GET", "/api/admin/users/"+userID.String(), nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", userID.String())
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		w := httptest.NewRecorder()

		handler.GetUser(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "User not found")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// TestAdminHandler_UpgradeUser
// ---------------------------------------------------------------------------

func TestAdminHandler_UpgradeUser(t *testing.T) {
	// helper to build request with chi URL param, admin context, and JSON body
	buildReq := func(userID uuid.UUID, body interface{}) *http.Request {
		var bodyReader *bytes.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			bodyReader = bytes.NewReader(b)
		} else {
			bodyReader = bytes.NewReader([]byte{})
		}
		req := httptest.NewRequest("PUT", "/api/admin/users/"+userID.String()+"/upgrade", bodyReader)
		req.Header.Set("Content-Type", "application/json")

		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", userID.String())
		ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)

		adminID := uuid.New()
		ctx = context.WithValue(ctx, middleware.UserIDKey, adminID)
		return req.WithContext(ctx)
	}

	t.Run("success basic to pro", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]string{"plan": "pro"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp repository.AdminUser
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, "pro", resp.Plan)
		repo.AssertExpectations(t)
	})

	t.Run("invalid UUID", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		req := httptest.NewRequest("PUT", "/api/admin/users/bad-id/upgrade", bytes.NewReader([]byte(`{"plan":"pro"}`)))
		req.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", "bad-id")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid user ID")
	})

	t.Run("invalid plan", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		req := buildReq(userID, map[string]string{"plan": "enterprise"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid plan")
	})

	t.Run("user not found", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		repo.On("GetUserByID", mock.Anything, userID).Return(nil, assert.AnError)

		req := buildReq(userID, map[string]string{"plan": "pro"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
		assert.Contains(t, w.Body.String(), "User not found")
		repo.AssertExpectations(t)
	})

	t.Run("active paid sub blocks downgrade to basic", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: true}
		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil)

		req := buildReq(userID, map[string]string{"plan": "basic"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Contains(t, w.Body.String(), "suscripción activa pagada")
		repo.AssertExpectations(t)
	})

	t.Run("invalid expires_at date", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil)

		req := buildReq(userID, map[string]interface{}{
			"plan":       "pro",
			"expires_at": "not-a-date",
		})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid expires_at format")
		repo.AssertExpectations(t)
	})

	t.Run("UpdateUserPlan error", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(assert.AnError)

		req := buildReq(userID, map[string]string{"plan": "pro"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Failed to update plan")
		repo.AssertExpectations(t)
	})

	t.Run("re-fetch error returns message", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(nil, assert.AnError).Once()

		req := buildReq(userID, map[string]string{"plan": "pro"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "Plan updated successfully")
		repo.AssertExpectations(t)
	})

	t.Run("default plan when body is empty", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		// Send empty body so JSON decode fails → defaults to "pro"
		req := httptest.NewRequest("PUT", "/api/admin/users/"+userID.String()+"/upgrade", bytes.NewReader([]byte{}))
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("id", userID.String())
		ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
		ctx = context.WithValue(ctx, middleware.UserIDKey, uuid.New())
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp repository.AdminUser
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "pro", resp.Plan)
		repo.AssertExpectations(t)
	})

	t.Run("success with valid expires_at date", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		// The expiry date is parsed and set to end of day UTC
		expectedExpiry := time.Date(2026, 12, 31, 23, 59, 59, 0, time.UTC)
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", &expectedExpiry).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]interface{}{
			"plan":       "pro",
			"expires_at": "2026-12-31",
		})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp repository.AdminUser
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "pro", resp.Plan)
		repo.AssertExpectations(t)
	})

	t.Run("upgrade to premium plan", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "premium", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "premium", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]string{"plan": "premium"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp repository.AdminUser
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "premium", resp.Plan)
		repo.AssertExpectations(t)
	})

	t.Run("downgrade to basic allowed when no paid sub", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "basic", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]string{"plan": "basic"})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp repository.AdminUser
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "basic", resp.Plan)
		repo.AssertExpectations(t)
	})

	t.Run("empty expires_at string is ignored", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]interface{}{
			"plan":       "pro",
			"expires_at": "",
		})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		repo.AssertExpectations(t)
	})

	t.Run("default plan when plan field is empty string", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		userID := uuid.New()
		user := &repository.AdminUser{ID: userID, Plan: "basic", HasPaidSub: false}
		updatedUser := &repository.AdminUser{ID: userID, Plan: "pro", HasPaidSub: false}

		repo.On("GetUserByID", mock.Anything, userID).Return(user, nil).Once()
		repo.On("UpdateUserPlan", mock.Anything, userID, "pro", (*time.Time)(nil)).Return(nil)
		repo.On("GetUserByID", mock.Anything, userID).Return(updatedUser, nil).Once()

		req := buildReq(userID, map[string]string{"plan": ""})
		w := httptest.NewRecorder()

		handler.UpgradeUser(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp repository.AdminUser
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "pro", resp.Plan)
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// TestAdminHandler_GetSubscriptions
// ---------------------------------------------------------------------------

func TestAdminHandler_GetSubscriptions(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		overview := &repository.SubscriptionOverview{
			TotalActive:   15,
			TotalCanceled: 3,
			StripeCount:   10,
			AppleCount:    4,
			GoogleCount:   1,
		}
		repo.On("GetSubscriptionOverview", mock.Anything).Return(overview, nil)

		req := httptest.NewRequest("GET", "/api/admin/subscriptions", nil)
		w := httptest.NewRecorder()

		handler.GetSubscriptions(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp repository.SubscriptionOverview
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)
		assert.Equal(t, 15, resp.TotalActive)
		assert.Equal(t, 10, resp.StripeCount)
		repo.AssertExpectations(t)
	})

	t.Run("repo error", func(t *testing.T) {
		repo := new(MockAdminRepo)
		handler := NewAdminHandler(repo)

		repo.On("GetSubscriptionOverview", mock.Anything).Return(nil, assert.AnError)

		req := httptest.NewRequest("GET", "/api/admin/subscriptions", nil)
		w := httptest.NewRecorder()

		handler.GetSubscriptions(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Failed to get subscription overview")
		repo.AssertExpectations(t)
	})
}
