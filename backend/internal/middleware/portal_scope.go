package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// PortalUserReader loads a user record to determine the caller's role.
type PortalUserReader interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}

// PortalOwnerResolver resolves the organizer (owner) linked to a portal user
// through the staff catalog (staff.invited_user_id → owner user_id).
type PortalOwnerResolver interface {
	FindOwnerByInvitedUserID(ctx context.Context, invitedUserID uuid.UUID) (uuid.UUID, error)
}

// PortalOwnerScope rewrites the request identity for assistant (Secretario)
// read routes (#1364). Invited users authenticate with their own user ID,
// but the assistant portal must display the linked organizer's agenda,
// staffing and directory. For role "assistant" the context user ID is
// replaced by the owner resolved via staff.invited_user_id; every other
// role passes through untouched. An assistant without a staff link is
// rejected (fail-closed) instead of reading an empty tenant.
//
// Apply ONLY to read-only routes — mutating handlers enforce their own role
// gates and must keep using the real caller ID. A nil reader or resolver
// degrades to pass-through so unit-test routers without real repos keep
// working; the production wiring always passes both.
func PortalOwnerScope(users PortalUserReader, staff PortalOwnerResolver) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if users == nil || staff == nil {
				next.ServeHTTP(w, r)
				return
			}

			callerID := GetUserID(r.Context())
			if callerID == uuid.Nil {
				next.ServeHTTP(w, r)
				return
			}

			caller, err := users.GetByID(r.Context(), callerID)
			if err != nil || caller == nil {
				slog.Error("portal scope: caller lookup failed", "error", err, "caller_id", callerID)
				writeAuthError(w, http.StatusInternalServerError, i18n.Message(r.Context(), "staff.portal_scope_failed"))
				return
			}
			if strings.ToLower(strings.TrimSpace(caller.Role)) != "assistant" {
				next.ServeHTTP(w, r)
				return
			}

			ownerID, err := staff.FindOwnerByInvitedUserID(r.Context(), callerID)
			if err != nil {
				slog.Warn("portal scope: no owner for assistant", "error", err, "caller_id", callerID)
				writeAuthError(w, http.StatusForbidden, i18n.Message(r.Context(), "staff.portal_no_team_link"))
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, ownerID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
