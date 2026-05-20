package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
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
		writeError(w, http.StatusInternalServerError, "Failed to get platform stats")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

// ListUsers returns all users with their usage counts.
// GET /api/admin/users
func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	accountType := strings.TrimSpace(r.URL.Query().Get("account_type"))
	if accountType == "" {
		accountType = repository.AdminAccountTypeUsers
	}
	moderationStatus := strings.TrimSpace(r.URL.Query().Get("moderation_status"))
	if moderationStatus == "" {
		moderationStatus = repository.AdminModerationStatusAll
	}

	users, err := h.adminRepo.GetAllUsers(r.Context(), accountType)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "invalid account type") {
			writeError(w, http.StatusBadRequest, "Invalid account_type. Must be one of: users, team, assistants, admins, all")
			return
		}
		slog.Error("admin: failed to list users", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list users")
		return
	}

	if users == nil {
		users = []repository.AdminUser{}
	}

	filtered, err := filterUsersByModerationStatus(users, moderationStatus)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid moderation_status. Must be one of: all, active, blocked, eligible_for_deletion")
		return
	}

	writeJSON(w, http.StatusOK, filtered)
}

func filterUsersByModerationStatus(users []repository.AdminUser, moderationStatus string) ([]repository.AdminUser, error) {
	normalized := strings.ToLower(strings.TrimSpace(moderationStatus))
	now := time.Now().UTC()

	switch normalized {
	case repository.AdminModerationStatusAll:
		return users, nil
	case repository.AdminModerationStatusActive:
		out := make([]repository.AdminUser, 0, len(users))
		for _, u := range users {
			if u.AccountStatus == repository.AccountStatusActive {
				out = append(out, u)
			}
		}
		return out, nil
	case repository.AdminModerationStatusBlocked:
		out := make([]repository.AdminUser, 0, len(users))
		for _, u := range users {
			if u.AccountStatus == repository.AccountStatusBlocked {
				out = append(out, u)
			}
		}
		return out, nil
	case repository.AdminModerationStatusEligibleForDeletion:
		out := make([]repository.AdminUser, 0, len(users))
		for _, u := range users {
			if u.AccountStatus != repository.AccountStatusBlocked {
				continue
			}
			if u.DeletionEligibleAt != nil && !u.DeletionEligibleAt.After(now) {
				out = append(out, u)
			}
		}
		return out, nil
	default:
		return nil, errors.New("invalid moderation status")
	}
}

// GetUser returns a single user with usage stats.
// GET /api/admin/users/{id}
func (h *AdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	user, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		slog.Error("admin: failed to get user", "error", err, "id", idStr)
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// upgradeRequest is the request body for upgrading a user.
type upgradeRequest struct {
	Plan      string  `json:"plan"`
	ExpiresAt *string `json:"expires_at"` // ISO 8601 date "YYYY-MM-DD"; nil = permanent gift
}

type blockUserRequest struct {
	Reason string `json:"reason"`
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
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req upgradeRequest
	if err := decodeJSON(r, &req); err != nil {
		req.Plan = "pro" // Default to 'pro' if no body
	}
	if req.Plan == "" {
		req.Plan = "pro"
	}

	// Validate target plan. 'premium' is a legacy DB value kept by migration
	// 040 for pre-existing rows but is NOT a currently sellable tier in Stripe
	// or RevenueCat, so the admin gift flow no longer accepts it.
	if req.Plan != "pro" && req.Plan != "business" && req.Plan != "basic" {
		writeError(w, http.StatusBadRequest, "Invalid plan. Must be 'basic', 'pro', or 'business'")
		return
	}

	// Get the current user info
	user, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	role := strings.ToLower(strings.TrimSpace(user.Role))
	if role == "" {
		role = "user"
	}
	if role != "user" {
		writeError(w, http.StatusForbidden, "Only end-user accounts can be upgraded/downgraded from this panel")
		return
	}

	// Prevent downgrading a user who has an active paid subscription
	if req.Plan == "basic" && user.HasPaidSub {
		writeError(w, http.StatusForbidden, "No se puede rebajar a un usuario que tiene una suscripción activa pagada. El usuario debe cancelar su suscripción primero.")
		return
	}

	// Parse optional expiry date
	var expiresAt *time.Time
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse("2006-01-02", *req.ExpiresAt)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid expires_at format. Use YYYY-MM-DD")
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
		writeError(w, http.StatusInternalServerError, "Failed to update plan")
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

// BlockUser blocks an end-user account and sets deletion eligibility to 6 months.
// PUT /api/admin/users/{id}/block
func (h *AdminHandler) BlockUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req blockUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		writeError(w, http.StatusBadRequest, "Block reason is required")
		return
	}

	adminID := middleware.GetUserID(r.Context())
	if err := h.adminRepo.BlockUser(r.Context(), id, adminID, reason); err != nil {
		switch {
		case errors.Is(err, repository.ErrAdminUserNotFound):
			writeError(w, http.StatusNotFound, "User not found")
			return
		case errors.Is(err, repository.ErrAdminUserAlreadyDeleted):
			writeError(w, http.StatusConflict, "User is already deleted")
			return
		case errors.Is(err, repository.ErrAdminUserNotBlockable):
			writeError(w, http.StatusForbidden, "Only end-user accounts can be blocked")
			return
		default:
			slog.Error("admin: failed to block user", "error", err, "target_user_id", id, "admin_id", adminID)
			writeError(w, http.StatusInternalServerError, "Failed to block user")
			return
		}
	}

	updated, err := h.adminRepo.GetUserByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"message": "User blocked successfully"})
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// DeleteUser removes a previously blocked user once the 6-month retention has passed.
// DELETE /api/admin/users/{id}
func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	if err := h.adminRepo.DeleteBlockedUserIfEligible(r.Context(), id); err != nil {
		switch {
		case errors.Is(err, repository.ErrAdminUserNotFound):
			writeError(w, http.StatusNotFound, "User not found")
		case errors.Is(err, repository.ErrAdminUserNotBlocked):
			writeError(w, http.StatusConflict, "User must be blocked before deletion")
		case errors.Is(err, repository.ErrAdminUserNotEligibleForDelete):
			writeError(w, http.StatusConflict, "User is not eligible for deletion yet")
		case errors.Is(err, repository.ErrAdminUserAlreadyDeleted):
			writeError(w, http.StatusConflict, "User is already deleted")
		default:
			slog.Error("admin: failed to delete user", "error", err, "target_user_id", id)
			writeError(w, http.StatusInternalServerError, "Failed to delete user")
		}
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// GetSubscriptions returns subscription overview stats.
// GET /api/admin/subscriptions
func (h *AdminHandler) GetSubscriptions(w http.ResponseWriter, r *http.Request) {
	overview, err := h.adminRepo.GetSubscriptionOverview(r.Context())
	if err != nil {
		slog.Error("admin: failed to get subscription overview", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get subscription overview")
		return
	}

	writeJSON(w, http.StatusOK, overview)
}
