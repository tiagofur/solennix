package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type fakeInboundAnalytics struct {
	stats *repository.InboundAnalytics
	err   error
	days  int
	uid   uuid.UUID
}

func (f *fakeInboundAnalytics) GetInboundAnalytics(_ context.Context, organizerUserID uuid.UUID, periodDays int) (*repository.InboundAnalytics, error) {
	f.uid = organizerUserID
	f.days = periodDays
	return f.stats, f.err
}

type fakeInboundUserRepo struct {
	user *models.User
}

func (f *fakeInboundUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*models.User, error) {
	return f.user, nil
}

func TestGetInboundAnalytics_ProReturnsFull(t *testing.T) {
	uid := uuid.New()
	store := &fakeInboundAnalytics{
		stats: &repository.InboundAnalytics{
			PeriodDays: 30, Views: 10, UniqueVisitors: 4, Requests: 3, Responded: 2,
			ResponseRate: 2.0 / 3, Converted: 1, ConversionRate: 1.0 / 3,
			RequestsByStatus: map[string]int{"pending": 1, "responded": 1, "booked": 1},
			Sources:          map[string]int{"directory": 6, "share": 4},
			ViewsByDay:       []repository.InboundDayCount{{Date: "2026-08-01", Count: 2}},
		},
	}
	h := &PublicProfileConfigHandler{
		userRepo:  &fakeInboundUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		analytics: store,
	}
	req := httptest.NewRequest(http.MethodGet, "/api/users/me/inbound-analytics?days=30", nil)
	req = req.WithContext(middleware.WithUserID(req.Context(), uid))
	w := httptest.NewRecorder()
	h.GetInboundAnalytics(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]any)
	assert.Equal(t, float64(10), data["views"])
	assert.Equal(t, float64(3), data["requests"])
	assert.Equal(t, false, data["limited"])
	assert.Equal(t, 30, store.days)
}

func TestGetInboundAnalytics_FreeReturnsTeaserOnly(t *testing.T) {
	uid := uuid.New()
	store := &fakeInboundAnalytics{
		stats: &repository.InboundAnalytics{
			PeriodDays: 30, Views: 5, UniqueVisitors: 2, Requests: 9, Converted: 4,
			RequestsByStatus: map[string]int{"booked": 4},
			Sources:          map[string]int{"directory": 5},
		},
	}
	h := &PublicProfileConfigHandler{
		userRepo:  &fakeInboundUserRepo{user: &models.User{ID: uid, Plan: "basic"}},
		analytics: store,
	}
	req := httptest.NewRequest(http.MethodGet, "/api/users/me/inbound-analytics?days=30", nil)
	req = req.WithContext(middleware.WithUserID(req.Context(), uid))
	w := httptest.NewRecorder()
	h.GetInboundAnalytics(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]any)
	assert.Equal(t, float64(5), data["views"])
	assert.Equal(t, true, data["limited"])
	// Funnel stripped for Free.
	assert.Equal(t, float64(0), data["requests"])
}

func TestDeriveTrafficSource(t *testing.T) {
	assert.Equal(t, "directory", deriveTrafficSource("https://solennix.app/proveedores?city=x", "", ""))
	assert.Equal(t, "directory", deriveTrafficSource("https://solennix.app/providers?city=x", "", ""))
	assert.Equal(t, "share", deriveTrafficSource("", "share", ""))
	assert.Equal(t, "direct", deriveTrafficSource("", "", ""))
	assert.Equal(t, "directory", deriveTrafficSource("", "proveedores", ""))
	assert.Equal(t, "directory", deriveTrafficSource("", "providers", ""))
}
