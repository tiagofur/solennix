package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/i18n"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// TokenBlacklist checks whether a token hash has been revoked.
type TokenBlacklist interface {
	IsRevoked(ctx context.Context, tokenHash string) (bool, error)
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

func (b *inMemoryBlacklist) IsRevoked(_ context.Context, tokenHash string) (bool, error) {
	_, found := b.m.Load(tokenHash)
	return found, nil
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
			revoked, err := tokenBlacklistInstance.IsRevoked(r.Context(), tokenHash)
			if err != nil {
				slog.Error("token blacklist check failed", "error", err)
				writeAuthError(w, http.StatusServiceUnavailable, i18n.Message(r.Context(), "auth.service_unavailable"))
				return
			}
			if revoked {
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

// WithUserID returns a copy of ctx carrying the given user ID. Intended for
// tests that exercise handlers depending on the auth middleware without
// spinning up the full JWT flow.
func WithUserID(ctx context.Context, userID uuid.UUID) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
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

// ParsePlatform extracts the platform ('web', 'ios', 'android', or 'unknown') from Request headers or User-Agent.
func ParsePlatform(r *http.Request) string {
	if platform := r.Header.Get("X-Client-Platform"); platform != "" {
		p := strings.ToLower(strings.TrimSpace(platform))
		if p == "ios" || p == "android" || p == "web" {
			return p
		}
	}

	ua := strings.ToLower(r.UserAgent())
	if ua == "" {
		return "unknown"
	}
	if strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad") || strings.Contains(ua, "ios") || strings.Contains(ua, "cfnetwork") || strings.Contains(ua, "darwin") {
		return "ios"
	}
	if strings.Contains(ua, "android") || strings.Contains(ua, "okhttp") {
		return "android"
	}
	if strings.Contains(ua, "mozilla") || strings.Contains(ua, "webkit") || strings.Contains(ua, "gecko") || strings.Contains(ua, "chrome") || strings.Contains(ua, "safari") {
		return "web"
	}
	return "unknown"
}

// ActivityBuffer maintains in-memory daily active platform interaction counts for batch UPSERTs.
type ActivityBuffer struct {
	mu   sync.Mutex
	data map[uuid.UUID]map[string]int
}

func NewActivityBuffer() *ActivityBuffer {
	return &ActivityBuffer{
		data: make(map[uuid.UUID]map[string]int),
	}
}

func (b *ActivityBuffer) Increment(userID uuid.UUID, platform string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.data == nil {
		b.data = make(map[uuid.UUID]map[string]int)
	}
	if _, exists := b.data[userID]; !exists {
		b.data[userID] = make(map[string]int)
	}
	b.data[userID][platform]++
}

func (b *ActivityBuffer) Flush() map[uuid.UUID]map[string]int {
	b.mu.Lock()
	defer b.mu.Unlock()

	flushed := b.data
	b.data = make(map[uuid.UUID]map[string]int)
	return flushed
}

var (
	activityBuf *ActivityBuffer
	bufOnce     sync.Once
	workerStarted bool
	workerMu      sync.Mutex
)

func GetActivityBuffer() *ActivityBuffer {
	bufOnce.Do(func() {
		activityBuf = NewActivityBuffer()
	})
	return activityBuf
}

func startActivityWorker(repo ActivityTrackerRepo) {
	workerMu.Lock()
	defer workerMu.Unlock()
	if workerStarted {
		return
	}

	platformRepo, ok := repo.(interface {
		UpsertUserPlatforms(ctx context.Context, records []models.UserPlatform) error
	})
	if !ok {
		// Log warning but do not crash; allows legacy mock tests to pass without implementing the upsert interface
		slog.Warn("platform activity tracking: repository does not implement UpsertUserPlatforms")
		return
	}

	workerStarted = true
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			flushData(platformRepo)
		}
	}()
}

func flushData(repo interface {
	UpsertUserPlatforms(ctx context.Context, records []models.UserPlatform) error
}) {
	buffer := GetActivityBuffer()
	data := buffer.Flush()
	if len(data) == 0 {
		return
	}

	records := make([]models.UserPlatform, 0)
	for userID, platforms := range data {
		for platform, count := range platforms {
			records = append(records, models.UserPlatform{
				UserID:           userID,
				Platform:         platform,
				InteractionCount: count,
			})
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := repo.UpsertUserPlatforms(ctx, records); err != nil {
		slog.Error("failed to flush user platform activity metrics", "error", err)
	}
}

type userCacheEntry struct {
	Role                 string
	RegistrationPlatform string
}

var userCache sync.Map // Map[uuid.UUID]userCacheEntry

// ActivityTracker creates a middleware that asynchronously updates user's last active timestamp (throttled) and logs platform activity.
func ActivityTracker(repo ActivityTrackerRepo) func(http.Handler) http.Handler {
	startActivityWorker(repo)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID != uuid.Nil {
				platform := ParsePlatform(r)

				var role string
				var regPlatform string
				var cached bool

				if val, found := userCache.Load(userID); found {
					entry := val.(userCacheEntry)
					role = entry.Role
					regPlatform = entry.RegistrationPlatform
					cached = true
				} else {
					// Query repository dynamically if it supports GetByID to avoid circular dependency
					if userRepo, ok := repo.(interface {
						GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
					}); ok {
						user, err := userRepo.GetByID(r.Context(), userID)
						if err == nil && user != nil {
							role = user.Role
							regPlatform = user.RegistrationPlatform
							userCache.Store(userID, userCacheEntry{
								Role:                 role,
								RegistrationPlatform: regPlatform,
							})
							cached = true
						}
					}
				}

				if cached {
					// Exclude administrators from activity statistics
					if role != "admin" {
						GetActivityBuffer().Increment(userID, platform)
					}

					// Retroactively set registration platform on next login if it was missing or unknown
					if (regPlatform == "" || regPlatform == "unknown") && platform != "unknown" {
						if updater, ok := repo.(interface {
							UpdateRegistrationPlatform(ctx context.Context, id uuid.UUID, platform string) error
						}); ok {
							go func() {
								err := updater.UpdateRegistrationPlatform(context.Background(), userID, platform)
								if err == nil {
									userCache.Store(userID, userCacheEntry{
										Role:                 role,
										RegistrationPlatform: platform,
									})
								}
							}()
						}
					}
				} else {
					// Safe fallback for tests / mock repos that do not implement user fetching
					GetActivityBuffer().Increment(userID, platform)
				}

				go func() {
					_ = repo.UpdateLastActiveAt(context.Background(), userID)
				}()
			}
			next.ServeHTTP(w, r)
		})
	}
}
