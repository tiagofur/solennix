package handlers

import (
	"log/slog"
	"net/http"

	"github.com/tiagofur/solennix-backend/internal/middleware"
)

// auditSortAllowlist maps query param values to actual SQL column names for audit logs.
var auditSortAllowlist = map[string]string{
	"created_at": "created_at",
	"action":     "action",
	"resource":   "resource_type",
}

// AuditHandler handles audit log viewing endpoints.
type AuditHandler struct {
	auditRepo AuditRepository
}

// NewAuditHandler creates a new AuditHandler.
func NewAuditHandler(repo AuditRepository) *AuditHandler {
	return &AuditHandler{auditRepo: repo}
}

// GetActivity returns paginated audit logs for the authenticated user.
// GET /api/dashboard/activity?page=1&limit=20
func (h *AuditHandler) GetActivity(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	params := parsePaginationParams(r, auditSortAllowlist, "created_at")
	if params == nil {
		// Default pagination when no page param is provided
		params = &PaginationParams{Page: 1, Limit: 20, Sort: "created_at", Order: "DESC"}
	}

	offset := (params.Page - 1) * params.Limit
	logs, total, err := h.auditRepo.GetByUser(r.Context(), userID, offset, params.Limit)
	if err != nil {
		slog.Error("audit: failed to get activity", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to get activity log")
		return
	}

	writePaginatedJSON(w, http.StatusOK, logs, total, params)
}

// GetAllAuditLogs returns paginated audit logs across all users (admin only).
// GET /api/admin/audit-logs?page=1&limit=50
func (h *AuditHandler) GetAllAuditLogs(w http.ResponseWriter, r *http.Request) {
	params := parsePaginationParams(r, auditSortAllowlist, "created_at")
	if params == nil {
		params = &PaginationParams{Page: 1, Limit: 50, Sort: "created_at", Order: "DESC"}
	}

	offset := (params.Page - 1) * params.Limit
	logs, total, err := h.auditRepo.GetAll(r.Context(), offset, params.Limit)
	if err != nil {
		slog.Error("audit: failed to get all audit logs", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get audit logs")
		return
	}

	writePaginatedJSON(w, http.StatusOK, logs, total, params)
}
