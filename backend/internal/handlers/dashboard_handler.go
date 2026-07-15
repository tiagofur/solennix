package handlers

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/tiagofur/solennix-backend/internal/middleware"
)

// DashboardHandler handles user-scoped dashboard analytics.
type DashboardHandler struct {
	dashboardRepo DashboardRepository
}

// NewDashboardHandler creates a new DashboardHandler.
func NewDashboardHandler(repo DashboardRepository) *DashboardHandler {
	return &DashboardHandler{dashboardRepo: repo}
}

// GetKPIs returns user-scoped key performance indicators.
// GET /api/dashboard/kpis
func (h *DashboardHandler) GetKPIs(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	kpis, err := h.dashboardRepo.GetKPIs(r.Context(), userID)
	if err != nil {
		slog.Error("dashboard: failed to get KPIs", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_kpis_failed")
		return
	}

	writeJSON(w, http.StatusOK, kpis)
}

// GetRevenueChart returns monthly revenue data.
// GET /api/dashboard/revenue-chart?period=month|quarter|year
func (h *DashboardHandler) GetRevenueChart(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "year"
	}
	if period != "month" && period != "quarter" && period != "year" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "dashboard.invalid_period")
		return
	}

	data, err := h.dashboardRepo.GetRevenueChart(r.Context(), userID, period)
	if err != nil {
		slog.Error("dashboard: failed to get revenue chart", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_revenue_chart_failed")
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetEventsByStatus returns event counts grouped by status.
// GET /api/dashboard/events-by-status?scope=month|all
// Default scope is "all" for backwards compatibility. The dashboard uses
// scope=month so its status chart is consistent with the other
// month-scoped KPI cards.
func (h *DashboardHandler) GetEventsByStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	scope := r.URL.Query().Get("scope")
	if scope == "" {
		scope = "all"
	}
	if scope != "month" && scope != "all" {
		writeCRUDI18nError(w, r, http.StatusBadRequest, "dashboard.invalid_scope")
		return
	}

	data, err := h.dashboardRepo.GetEventsByStatus(r.Context(), userID, scope)
	if err != nil {
		slog.Error("dashboard: failed to get events by status", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_events_by_status_failed")
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetTopClients returns top clients by total spent.
// GET /api/dashboard/top-clients?limit=10
func (h *DashboardHandler) GetTopClients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 50 {
			limit = parsed
		}
	}

	data, err := h.dashboardRepo.GetTopClients(r.Context(), userID, limit)
	if err != nil {
		slog.Error("dashboard: failed to get top clients", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_top_clients_failed")
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetProductDemand returns most used products from event_products.
// GET /api/dashboard/product-demand
func (h *DashboardHandler) GetProductDemand(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	data, err := h.dashboardRepo.GetProductDemand(r.Context(), userID)
	if err != nil {
		slog.Error("dashboard: failed to get product demand", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_product_demand_failed")
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetForecast returns revenue forecast based on confirmed future events.
// GET /api/dashboard/forecast
func (h *DashboardHandler) GetForecast(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	data, err := h.dashboardRepo.GetForecast(r.Context(), userID)
	if err != nil {
		slog.Error("dashboard: failed to get forecast", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_forecast_failed")
		return
	}

	writeJSON(w, http.StatusOK, data)
}

// GetSummary returns KPIs + the 5 chart/widget datasets in one response so the
// client can fetch the entire dashboard analytics surface in a single round-trip
// instead of 6 sequential GETs (issue #807).
// GET /api/dashboard/summary
func (h *DashboardHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	summary, err := h.dashboardRepo.GetSummary(r.Context(), userID)
	if err != nil {
		slog.Error("dashboard: failed to get summary", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_summary_failed")
		return
	}

	writeJSON(w, http.StatusOK, summary)
}

// GetAttention returns events needing follow-up (pending payments, overdue,
// urgent quotes) with the reason classification and pending balance computed
// server-side. Replaces the client-side attention logic that fetched the full
// unpaginated event + payment lists on every dashboard load (issue #861).
// GET /api/dashboard/attention
func (h *DashboardHandler) GetAttention(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	items, err := h.dashboardRepo.GetAttention(r.Context(), userID)
	if err != nil {
		slog.Error("dashboard: failed to get attention items", "error", err, "user_id", userID)
		writeCRUDI18nError(w, r, http.StatusInternalServerError, "dashboard.fetch_attention_failed")
		return
	}

	writeJSON(w, http.StatusOK, items)
}
