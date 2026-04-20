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
		writeError(w, http.StatusInternalServerError, "Failed to get dashboard KPIs")
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
		writeError(w, http.StatusBadRequest, "Invalid period. Must be 'month', 'quarter', or 'year'")
		return
	}

	data, err := h.dashboardRepo.GetRevenueChart(r.Context(), userID, period)
	if err != nil {
		slog.Error("dashboard: failed to get revenue chart", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to get revenue chart")
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
		writeError(w, http.StatusBadRequest, "Invalid scope. Must be 'month' or 'all'")
		return
	}

	data, err := h.dashboardRepo.GetEventsByStatus(r.Context(), userID, scope)
	if err != nil {
		slog.Error("dashboard: failed to get events by status", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to get events by status")
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
		writeError(w, http.StatusInternalServerError, "Failed to get top clients")
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
		writeError(w, http.StatusInternalServerError, "Failed to get product demand")
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
		writeError(w, http.StatusInternalServerError, "Failed to get forecast")
		return
	}

	writeJSON(w, http.StatusOK, data)
}
