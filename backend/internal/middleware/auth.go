package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// TokenBlacklist checks whether a token hash has been revoked.
type TokenBlacklist interface {
	IsRevoked(ctx context.Context, tokenHash string) bool
	Revoke(ctx context.Context, tokenHash string, expiresAt time.Time) error
}

// tokenBlacklistInstance holds the active blacklist implementation.
// Set via SetTokenBlacklist; defaults to in-memory fallback.
var tokenBlacklistInstance TokenBlacklist = &inMemoryBlacklist{}

// SetTokenBlacklist configures the persistent token blacklist (call from main).
func SetTokenBlacklist(bl TokenBlacklist) {
	tokenBlacklistInstance = bl
}

// GetTokenBlacklist returns the active blacklist (used by handlers to revoke tokens).
func GetTokenBlacklist() TokenBlacklist {
	return tokenBlacklistInstance
}

// inMemoryBlacklist is a fallback using sync.Map (lost on restart).
type inMemoryBlacklist struct {
	m sync.Map
}

func (b *inMemoryBlacklist) IsRevoked(_ context.Context, tokenHash string) bool {
	_, found := b.m.Load(tokenHash)
	return found
}

func (b *inMemoryBlacklist) Revoke(_ context.Context, tokenHash string, expiresAt time.Time) error {
	b.m.Store(tokenHash, expiresAt)
	return nil
}

type contextKey string

const UserIDKey contextKey = "userID"
const UserEmailKey contextKey = "userEmail"

// Auth creates a middleware that validates JWT tokens from httpOnly cookie or Authorization header.
// Priority: 1) Cookie (secure), 2) Authorization header (for API clients/mobile)
func Auth(authService *services.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var token string

			// Try to get token from httpOnly cookie first (SECURE)
			if cookie, err := r.Cookie("auth_token"); err == nil {
				token = cookie.Value
			}

			// Fallback to Authorization header (for API clients/mobile/backward compatibility)
			if token == "" {
				authHeader := r.Header.Get("Authorization")
				if authHeader != "" {
					parts := strings.SplitN(authHeader, " ", 2)
					if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
						token = parts[1]
					}
				}
			}

			// No token found in either cookie or header
			if token == "" {
				writeAuthError(w, http.StatusUnauthorized, i18n.Message(r.Context(), "auth.required"))
				return
			}

			// Check if token has been revoked (e.g., by logout)
			tokenHash := sha256Hex(token)
			if tokenBlacklistInstance.IsRevoked(r.Context(), tokenHash) {
				writeAuthError(w, http.StatusUnauthorized, i18n.Message(r.Context(), "auth.token_revoked"))
				return
			}

			// Validate token
			claims, err := authService.ValidateToken(token)
			if err != nil {
				writeAuthError(w, http.StatusUnauthorized, i18n.Message(r.Context(), "auth.token_invalid_or_expired"))
				return
			}

			// Add claims to context
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// sha256Hex returns the hex-encoded SHA-256 hash of a string.
func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func writeAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// GetUserID extracts the user ID from the request context.
func GetUserID(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(UserIDKey).(uuid.UUID)
	return id
}

// GetUserEmail extracts the user email from the request context.
func GetUserEmail(ctx context.Context) string {
	email, _ := ctx.Value(UserEmailKey).(string)
	return email
}

// ActivityTrackerRepo defines the interface needed for updating last active timestamp.
type ActivityTrackerRepo interface {
	UpdateLastActiveAt(ctx context.Context, id uuid.UUID) error
}

// ActivityTracker creates a middleware that asynchronously updates user's last active timestamp (throttled).
func ActivityTracker(repo ActivityTrackerRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID != uuid.Nil {
				go func() {
					_ = repo.UpdateLastActiveAt(context.Background(), userID)
				}()
			}
			next.ServeHTTP(w, r)
		})
	}
}
