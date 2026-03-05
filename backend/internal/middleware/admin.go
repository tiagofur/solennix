package middleware

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// AdminUserRepo is the minimal interface needed by AdminOnly middleware.
type AdminUserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

// AdminOnly creates middleware that restricts access to admin users only.
// Must be used after Auth middleware (requires UserIDKey in context).
func AdminOnly(userRepo AdminUserRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == uuid.Nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "Authentication required"})
				return
			}

			user, err := userRepo.GetByID(r.Context(), userID)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "User not found"})
				return
			}

			if user.Role != "admin" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "Admin access required"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
