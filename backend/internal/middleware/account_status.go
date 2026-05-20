package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// UserAccountRepository is the minimal contract needed to validate account status.
type UserAccountRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

// AccountStatusActive blocks access for non-active accounts on protected routes.
func AccountStatusActive(userRepo UserAccountRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == uuid.Nil {
				writeAuthError(w, http.StatusUnauthorized, i18n.Message(r.Context(), "auth.required"))
				return
			}

			user, err := userRepo.GetByID(r.Context(), userID)
			if err != nil || user == nil {
				writeAuthError(w, http.StatusUnauthorized, i18n.Message(r.Context(), "auth.token_invalid_or_expired"))
				return
			}

			status := user.AccountStatus
			if status == "" {
				status = repository.AccountStatusActive
			}

			if status == repository.AccountStatusBlocked {
				writeAuthError(w, http.StatusForbidden, i18n.Message(r.Context(), "auth.account_blocked"))
				return
			}
			if status == repository.AccountStatusDeleted {
				writeAuthError(w, http.StatusForbidden, i18n.Message(r.Context(), "auth.account_deleted"))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
