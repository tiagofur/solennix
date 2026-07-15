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
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

func newDashboardHandler(repo *MockDashboardRepo) *DashboardHandler {
	return NewDashboardHandler(repo)
}

func dashboardReq(path string) (*http.Request, uuid.UUID) {
	userID := uuid.New()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
	return req.WithContext(ctx), userID
}

// ---------------------------------------------------------------------------
// NewDashboardHandler
// ---------------------------------------------------------------------------

func TestNewDashboardHandler(t *testing.T) {
	repo := new(MockDashboardRepo)
	h := NewDashboardHandler(repo)
	assert.NotNil(t, h)
}

// ---------------------------------------------------------------------------
// GetKPIs
// ---------------------------------------------------------------------------

func TestGetKPIs(t *testing.T) {
	t.Run("GivenValidRequest_WhenKPIsExist_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		kpis := &repository.DashboardKPIs{TotalRevenue: 50000, EventsThisMonth: 5}
		repo.On("GetKPIs", mock.Anything, mock.Anything).Return(kpis, nil)

		req, _ := dashboardReq("/api/dashboard/kpis")
		rr := httptest.NewRecorder()
		h.GetKPIs(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "50000")
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetKPIs_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetKPIs", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/kpis")
		rr := httptest.NewRecorder()
		h.GetKPIs(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get dashboard KPIs")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetRevenueChart
// ---------------------------------------------------------------------------

func TestGetRevenueChart(t *testing.T) {
	t.Run("GivenValidPeriod_WhenDataExists_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		data := []repository.RevenueDataPoint{{Month: "2026-01", Revenue: 10000, EventCount: 3}}
		repo.On("GetRevenueChart", mock.Anything, mock.Anything, "year").Return(data, nil)

		req, _ := dashboardReq("/api/dashboard/revenue-chart?period=year")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "2026-01")
		repo.AssertExpectations(t)
	})

	t.Run("GivenNoPeriod_WhenCalled_ThenDefaultToYear", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetRevenueChart", mock.Anything, mock.Anything, "year").Return([]repository.RevenueDataPoint{}, nil)

		req, _ := dashboardReq("/api/dashboard/revenue-chart")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenMonthPeriod_WhenCalled_ThenUseMonth", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetRevenueChart", mock.Anything, mock.Anything, "month").Return([]repository.RevenueDataPoint{}, nil)

		req, _ := dashboardReq("/api/dashboard/revenue-chart?period=month")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenQuarterPeriod_WhenCalled_ThenUseQuarter", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetRevenueChart", mock.Anything, mock.Anything, "quarter").Return([]repository.RevenueDataPoint{}, nil)

		req, _ := dashboardReq("/api/dashboard/revenue-chart?period=quarter")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenInvalidPeriod_WhenCalled_ThenBadRequest", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		req, _ := dashboardReq("/api/dashboard/revenue-chart?period=invalid")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid period")
	})

	t.Run("GivenRepoError_WhenGetRevenueChart_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetRevenueChart", mock.Anything, mock.Anything, "year").Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/revenue-chart?period=year")
		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get revenue chart")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetEventsByStatus
// ---------------------------------------------------------------------------

func TestGetEventsByStatus(t *testing.T) {
	t.Run("GivenValidRequest_WhenDataExists_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		data := []repository.EventStatusCount{
			{Status: "confirmed", Count: 10},
			{Status: "pending", Count: 5},
		}
		repo.On("GetEventsByStatus", mock.Anything, mock.Anything, "all").Return(data, nil)

		req, _ := dashboardReq("/api/dashboard/events-by-status")
		rr := httptest.NewRecorder()
		h.GetEventsByStatus(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "confirmed")
		repo.AssertExpectations(t)
	})

	t.Run("GivenMonthScope_WhenCalled_ThenUseMonth", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetEventsByStatus", mock.Anything, mock.Anything, "month").Return([]repository.EventStatusCount{}, nil)

		req, _ := dashboardReq("/api/dashboard/events-by-status?scope=month")
		rr := httptest.NewRecorder()
		h.GetEventsByStatus(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenInvalidScope_WhenCalled_ThenBadRequest", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		req, _ := dashboardReq("/api/dashboard/events-by-status?scope=invalid")
		rr := httptest.NewRecorder()
		h.GetEventsByStatus(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid scope")
	})

	t.Run("GivenRepoError_WhenGetEventsByStatus_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetEventsByStatus", mock.Anything, mock.Anything, "all").Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/events-by-status")
		rr := httptest.NewRecorder()
		h.GetEventsByStatus(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get events by status")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetTopClients
// ---------------------------------------------------------------------------

func TestGetTopClients(t *testing.T) {
	t.Run("GivenValidRequest_WhenClientsExist_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		data := []repository.TopClient{
			{ID: uuid.New(), Name: "Alice", TotalSpent: 20000, TotalEvents: 5},
		}
		repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return(data, nil)

		req, _ := dashboardReq("/api/dashboard/top-clients")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "Alice")
		repo.AssertExpectations(t)
	})

	t.Run("GivenCustomLimit_WhenValid_ThenUseCustomLimit", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetTopClients", mock.Anything, mock.Anything, 5).Return([]repository.TopClient{}, nil)

		req, _ := dashboardReq("/api/dashboard/top-clients?limit=5")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenInvalidLimit_WhenCalled_ThenUseDefault10", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return([]repository.TopClient{}, nil)

		req, _ := dashboardReq("/api/dashboard/top-clients?limit=abc")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenNegativeLimit_WhenCalled_ThenUseDefault10", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return([]repository.TopClient{}, nil)

		req, _ := dashboardReq("/api/dashboard/top-clients?limit=-5")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenLimitOver50_WhenCalled_ThenUseDefault10", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		// limit=100 is out of range (>50), so parsed condition fails => stays default 10
		repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return([]repository.TopClient{}, nil)

		req, _ := dashboardReq("/api/dashboard/top-clients?limit=100")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetTopClients_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/top-clients")
		rr := httptest.NewRecorder()
		h.GetTopClients(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get top clients")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetProductDemand
// ---------------------------------------------------------------------------

func TestGetProductDemand(t *testing.T) {
	t.Run("GivenValidRequest_WhenDataExists_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		data := []repository.ProductDemandItem{
			{ID: uuid.New(), Name: "Pastel 3 pisos", TimesUsed: 15, TotalRevenue: 30000},
		}
		repo.On("GetProductDemand", mock.Anything, mock.Anything).Return(data, nil)

		req, _ := dashboardReq("/api/dashboard/product-demand")
		rr := httptest.NewRecorder()
		h.GetProductDemand(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "Pastel 3 pisos")
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetProductDemand_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetProductDemand", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/product-demand")
		rr := httptest.NewRecorder()
		h.GetProductDemand(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get product demand")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetForecast
// ---------------------------------------------------------------------------

func TestGetForecast(t *testing.T) {
	t.Run("GivenValidRequest_WhenDataExists_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		data := []repository.ForecastDataPoint{
			{Month: "2026-05", ConfirmedRevenue: 25000, ConfirmedEvents: 3},
		}
		repo.On("GetForecast", mock.Anything, mock.Anything).Return(data, nil)

		req, _ := dashboardReq("/api/dashboard/forecast")
		rr := httptest.NewRecorder()
		h.GetForecast(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "2026-05")
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetForecast_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetForecast", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/forecast")
		rr := httptest.NewRecorder()
		h.GetForecast(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get forecast")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// GetSummary
// ---------------------------------------------------------------------------

func TestGetSummary(t *testing.T) {
	t.Run("GivenValidRequest_WhenSummaryExists_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		summary := &repository.DashboardSummary{
			KPIs: &repository.DashboardKPIs{TotalRevenue: 50000, TotalProducts: 12},
			RevenueChart: []repository.RevenueDataPoint{
				{Month: "2026-07", Revenue: 10000, EventCount: 3},
			},
			EventsByStatus: []repository.EventStatusCount{
				{Status: "confirmed", Count: 5},
			},
			TopClients: []repository.TopClient{
				{ID: uuid.New(), Name: "Alice", TotalSpent: 20000, TotalEvents: 5},
			},
			ProductDemand: []repository.ProductDemandItem{
				{ID: uuid.New(), Name: "Pastel 3 pisos", TimesUsed: 15, TotalRevenue: 30000},
			},
			Forecast: []repository.ForecastDataPoint{
				{Month: "2026-08", ConfirmedRevenue: 25000, ConfirmedEvents: 3},
			},
		}
		repo.On("GetSummary", mock.Anything, mock.Anything).Return(summary, nil)

		req, _ := dashboardReq("/api/dashboard/summary")
		rr := httptest.NewRecorder()
		h.GetSummary(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "50000")
		assert.Contains(t, rr.Body.String(), "total_products")
		assert.Contains(t, rr.Body.String(), "Pastel 3 pisos")
		assert.Contains(t, rr.Body.String(), "revenue_chart")
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetSummary_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetSummary", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/summary")
		rr := httptest.NewRecorder()
		h.GetSummary(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get dashboard summary")
		repo.AssertExpectations(t)
	})
}

func TestGetAttention(t *testing.T) {
	t.Run("GivenValidRequest_WhenAttentionItemsExist_ThenReturnOK", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		items := []repository.AttentionItem{
			{
				EventID:        uuid.New(),
				EventDate:      "2026-07-15",
				ServiceType:    "Boda",
				Status:         "confirmed",
				ClientName:     "Ana Perez",
				TotalAmount:    5000,
				AmountPaid:     2000,
				PendingBalance: 3000,
				Reason:         "payment_due",
			},
			{
				EventID:        uuid.New(),
				EventDate:      "2026-07-20",
				ServiceType:    "XV Años",
				Status:         "quoted",
				ClientName:     "Juan Lopez",
				TotalAmount:    3000,
				AmountPaid:     0,
				PendingBalance: 3000,
				Reason:         "quote_urgent",
			},
		}
		repo.On("GetAttention", mock.Anything, mock.Anything).Return(items, nil)

		req, _ := dashboardReq("/api/dashboard/attention")
		rr := httptest.NewRecorder()
		h.GetAttention(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "payment_due")
		assert.Contains(t, rr.Body.String(), "quote_urgent")
		assert.Contains(t, rr.Body.String(), "Ana Perez")
		assert.Contains(t, rr.Body.String(), "pending_balance")
		repo.AssertExpectations(t)
	})

	t.Run("GivenNoAttentionItems_WhenGetAttention_ThenReturnEmptyArray", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetAttention", mock.Anything, mock.Anything).Return([]repository.AttentionItem{}, nil)

		req, _ := dashboardReq("/api/dashboard/attention")
		rr := httptest.NewRecorder()
		h.GetAttention(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "[]\n", rr.Body.String())
		repo.AssertExpectations(t)
	})

	t.Run("GivenRepoError_WhenGetAttention_ThenInternalServerError", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		repo.On("GetAttention", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))

		req, _ := dashboardReq("/api/dashboard/attention")
		rr := httptest.NewRecorder()
		h.GetAttention(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to get attention items")
		repo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// Localization coverage — verifies dashboard errors render the user's locale
// (issue #902). The default-path tests above inject no locale, so they fall
// back to NoContextLocale ("en") and keep asserting the English text.
// ---------------------------------------------------------------------------

func TestDashboardErrors_LocalizedToSpanish(t *testing.T) {
	cases := []struct {
		name     string
		endpoint string
		mockFn   func(repo *MockDashboardRepo)
		invoke   func(h *DashboardHandler, w http.ResponseWriter, r *http.Request)
		wantES   string
	}{
		{
			name:     "KPIs",
			endpoint: "/api/dashboard/kpis",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetKPIs", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetKPIs,
			wantES: "No se pudieron obtener los KPIs del dashboard",
		},
		{
			name:     "revenue chart",
			endpoint: "/api/dashboard/revenue-chart?period=year",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetRevenueChart", mock.Anything, mock.Anything, "year").Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetRevenueChart,
			wantES: "No se pudo obtener el grafico de ingresos",
		},
		{
			name:     "events by status",
			endpoint: "/api/dashboard/events-by-status",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetEventsByStatus", mock.Anything, mock.Anything, "all").Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetEventsByStatus,
			wantES: "No se pudieron obtener los eventos por estado",
		},
		{
			name:     "top clients",
			endpoint: "/api/dashboard/top-clients",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetTopClients", mock.Anything, mock.Anything, 10).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetTopClients,
			wantES: "No se pudieron obtener los mejores clientes",
		},
		{
			name:     "product demand",
			endpoint: "/api/dashboard/product-demand",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetProductDemand", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetProductDemand,
			wantES: "No se pudo obtener la demanda de productos",
		},
		{
			name:     "forecast",
			endpoint: "/api/dashboard/forecast",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetForecast", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetForecast,
			wantES: "No se pudo obtener el pronostico",
		},
		{
			name:     "summary",
			endpoint: "/api/dashboard/summary",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetSummary", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetSummary,
			wantES: "No se pudo obtener el resumen del dashboard",
		},
		{
			name:     "attention",
			endpoint: "/api/dashboard/attention",
			mockFn: func(repo *MockDashboardRepo) {
				repo.On("GetAttention", mock.Anything, mock.Anything).Return(nil, errors.New("db error"))
			},
			invoke: (*DashboardHandler).GetAttention,
			wantES: "No se pudieron obtener los items de atencion",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := new(MockDashboardRepo)
			tc.mockFn(repo)
			h := newDashboardHandler(repo)

			userID := uuid.New()
			req := httptest.NewRequest(http.MethodGet, tc.endpoint, nil)
			ctx := i18n.WithLocale(context.WithValue(req.Context(), middleware.UserIDKey, userID), "es")
			req = req.WithContext(ctx)

			rr := httptest.NewRecorder()
			tc.invoke(h, rr, req)

			assert.Contains(t, rr.Body.String(), tc.wantES)
			repo.AssertExpectations(t)
		})
	}
}

func TestDashboardErrors_LocalizedValidation(t *testing.T) {
	t.Run("GivenSpanishLocale_WhenInvalidPeriod_ThenSpanishMessage", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		userID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/api/dashboard/revenue-chart?period=invalid", nil)
		ctx := i18n.WithLocale(context.WithValue(req.Context(), middleware.UserIDKey, userID), "es")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		h.GetRevenueChart(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Periodo invalido")
	})

	t.Run("GivenSpanishLocale_WhenInvalidScope_ThenSpanishMessage", func(t *testing.T) {
		repo := new(MockDashboardRepo)
		h := newDashboardHandler(repo)

		userID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/api/dashboard/events-by-status?scope=invalid", nil)
		ctx := i18n.WithLocale(context.WithValue(req.Context(), middleware.UserIDKey, userID), "es")
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		h.GetEventsByStatus(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Ambito invalido")
	})
}
