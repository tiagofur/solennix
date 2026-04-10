package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// AuditLogger is the interface for creating audit log entries.
type AuditLogger interface {
	Create(ctx context.Context, log *models.AuditLog) error
}

// Audit creates middleware that logs state-changing operations asynchronously.
// It intercepts POST, PUT, DELETE requests and logs them AFTER the handler runs
// successfully (2xx status code). The audit write happens in a goroutine so it
// does not slow down the response.
func Audit(logger AuditLogger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only audit state-changing methods
			if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodDelete {
				next.ServeHTTP(w, r)
				return
			}

			// Wrap response writer to capture status code
			sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(sw, r)

			// Only log successful operations (2xx)
			if sw.status < 200 || sw.status >= 300 {
				return
			}

			// Extract user ID (may not exist for public routes)
			userID := GetUserID(r.Context())
			if userID == uuid.Nil {
				return
			}

			// Map HTTP method to action
			action := mapAction(r.Method)

			// Extract resource type and ID from URL path
			resourceType, resourceID := extractResource(r)

			// Skip paths that should not be audited
			if resourceType == "" {
				return
			}

			ip := extractIP(r)
			ua := r.UserAgent()

			// Fire and forget — use context.Background() because the request
			// context may be canceled by the time the goroutine runs.
			go func() {
				err := logger.Create(context.Background(), &models.AuditLog{
					UserID:       userID,
					Action:       action,
					ResourceType: resourceType,
					ResourceID:   resourceID,
					IPAddress:    &ip,
					UserAgent:    &ua,
				})
				if err != nil {
					slog.Error("audit: failed to create log entry", "error", err,
						"user_id", userID, "action", action, "resource_type", resourceType)
				}
			}()
		})
	}
}

// statusWriter wraps http.ResponseWriter to capture the status code.
type statusWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
}

func (w *statusWriter) WriteHeader(status int) {
	if !w.wroteHeader {
		w.status = status
		w.wroteHeader = true
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.wroteHeader = true
	}
	return w.ResponseWriter.Write(b)
}

// mapAction translates an HTTP method into an audit action string.
func mapAction(method string) string {
	switch method {
	case http.MethodPost:
		return "create"
	case http.MethodPut:
		return "update"
	case http.MethodDelete:
		return "delete"
	default:
		return "unknown"
	}
}

// resourceMap maps URL path segments to audit resource types.
var resourceMap = map[string]string{
	"clients":          "client",
	"events":           "event",
	"products":         "product",
	"inventory":        "inventory",
	"payments":         "payment",
	"unavailable-dates": "unavailable_date",
}

// skipPrefixes are path segments that should NOT be audited.
var skipPrefixes = map[string]bool{
	"auth":          true,
	"search":        true,
	"devices":       true,
	"uploads":       true,
	"subscriptions": true,
	"admin":         true,
	"dashboard":     true,
}

func trimAPIBasePrefix(pattern string) string {
	pattern = strings.TrimPrefix(pattern, "/api/v1/")
	pattern = strings.TrimPrefix(pattern, "/api/v1")
	pattern = strings.TrimPrefix(pattern, "/api/")
	pattern = strings.TrimPrefix(pattern, "/api")
	return strings.TrimPrefix(pattern, "/")
}

// extractResource parses the Chi route context to determine the resource type and optional ID.
// Returns empty resourceType for paths that should not be audited.
func extractResource(r *http.Request) (string, *uuid.UUID) {
	rctx := chi.RouteContext(r.Context())
	if rctx == nil {
		return "", nil
	}

	// Use the route pattern to get a clean path structure
	pattern := rctx.RoutePattern()
	if pattern == "" {
		return "", nil
	}

	pattern = trimAPIBasePrefix(pattern)

	parts := strings.Split(pattern, "/")
	if len(parts) == 0 {
		return "", nil
	}

	// Check if the first segment should be skipped
	if skipPrefixes[parts[0]] {
		return "", nil
	}

	// Map the first segment to a resource type
	resourceType, ok := resourceMap[parts[0]]
	if !ok {
		return "", nil
	}

	// Handle nested resources: /events/{id}/products → "event_product"
	// /events/{id}/extras → "event_extra"
	// /events/{id}/items → "event_items"
	// /events/{id}/equipment → "event_equipment"
	// /events/{id}/supplies → "event_supply"
	// /events/{id}/photos → "event_photo"
	if len(parts) >= 3 && parts[1] == "{id}" {
		switch parts[2] {
		case "products":
			resourceType = "event_product"
		case "extras":
			resourceType = "event_extra"
		case "items":
			resourceType = "event_items"
		case "equipment":
			resourceType = "event_equipment"
		case "supplies":
			resourceType = "event_supply"
		case "photos":
			resourceType = "event_photo"
		}
	}

	// Products sub-resources
	if len(parts) >= 3 && parts[0] == "products" && parts[1] == "{id}" {
		switch parts[2] {
		case "ingredients":
			resourceType = "product_ingredient"
		}
	}

	// Try to extract the resource ID from URL params
	var resourceID *uuid.UUID
	if idStr := chi.URLParam(r, "id"); idStr != "" {
		if id, err := uuid.Parse(idStr); err == nil {
			resourceID = &id
		}
	}

	return resourceType, resourceID
}
