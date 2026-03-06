package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// AdminHandler handles admin-only operations.
type AdminHandler struct {
	adminRepo AdminRepository
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(adminRepo AdminRepository) *AdminHandler {
	return &AdminHandler{adminRepo: adminRepo}
}

// GetStats returns platform-wide KPIs.
// GET /api/admin/stats
func (h *AdminHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.adminRepo.GetPlatformStats(r.Context())
	if err != nil {
		slog.Error("admin: failed to get platform stats", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get platform stats"})
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

// ListUsers returns all users with their usage counts.
// GET /api/admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.adminRepo.GetAllUsers(r.Context())
	if err != nil {
		slog.Error("admin: failed to list users", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to list users"})
		return
	}

	if users == nil {
		users = []repository.AdminUser{}
	}

	writeJSON(w, http.StatusOK, users)
}

// GetUser returns a single user with usage stats.
// GET /api/admin/users/{id}
func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	user, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		slog.Error("admin: failed to get user", "error", err, "id", idStr)
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// upgradeRequest is the request body for upgrading a user.
type upgradeRequest struct {
	Plan      string  `json:"plan"`
	ExpiresAt *string `json:"expires_at"` // ISO 8601 date "YYYY-MM-DD"; nil = permanent gift
}

// UpgradeUser upgrades a free/basic user to pro.
// PUT /api/admin/users/{id}/upgrade
//
// Business rule: Can upgrade a free user to pro, but CANNOT downgrade
// a user who has paid (has stripe_customer_id or active subscription).
func (h *AdminHandler) UpgradeUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid user ID"})
		return
	}

	var req upgradeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Plan = "pro" // Default to 'pro' if no body
	}
	if req.Plan == "" {
		req.Plan = "pro"
	}

	// Validate target plan
	if req.Plan != "pro" && req.Plan != "premium" && req.Plan != "basic" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid plan. Must be 'basic', 'pro', or 'premium'"})
		return
	}

	// Get the current user info
	user, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "User not found"})
		return
	}

	// Prevent downgrading a user who has an active paid subscription
	if req.Plan == "basic" && user.HasPaidSub {
		writeJSON(w, http.StatusForbidden, map[string]string{
			"error": "No se puede rebajar a un usuario que tiene una suscripción activa pagada. El usuario debe cancelar su suscripción primero.",
		})
		return
	}

	// Parse optional expiry date
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", *req.ExpiresAt)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid expires_at format. Use YYYY-MM-DD"})
			return
		}
		// Expire at end of the specified day (UTC)
		endOfDay := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.UTC)
		expiresAt = &endOfDay
	}

	// Log the admin action
	adminID := middleware.GetUserID(r.Context())
	slog.Info("admin: upgrading user",
		"admin_id", adminID,
		"target_user_id", id,
		"from_plan", user.Plan,
		"to_plan", req.Plan,
		"expires_at", expiresAt,
	)

	// Perform the plan change
	if err := h.adminRepo.UpdateUserPlan(r.Context(), id, req.Plan, expiresAt); err != nil {
		slog.Error("admin: failed to upgrade user", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update plan"})
		return
	}

	// Return updated user
	updated, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": "Plan updated successfully"})
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// GetSubscriptions returns subscription overview stats.
// GET /api/admin/subscriptions
func (h *AdminHandler) GetSubscriptions(w http.ResponseWriter, r *http.Request) {
	overview, err := h.adminRepo.GetSubscriptionOverview(r.Context())
	if err != nil {
		slog.Error("admin: failed to get subscription overview", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to get subscription overview"})
		return
	}

	writeJSON(w, http.StatusOK, overview)
}
