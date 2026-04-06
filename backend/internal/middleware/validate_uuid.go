package middleware

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// ValidateUUID validates that the specified URL parameters are valid UUIDs.
// Returns 400 Bad Request if any parameter is not a valid UUID.
// If a parameter is not present in the current route, it is silently skipped.
func ValidateUUID(params ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			for _, param := range params {
				value := chi.URLParam(r, param)
				if value == "" {
					continue // param not in this route
				}
				if _, err := uuid.Parse(value); err != nil {
					writeAuthError(w, http.StatusBadRequest, "Invalid "+param+" format: must be a valid UUID")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
