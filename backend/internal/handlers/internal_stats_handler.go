package handlers

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

// InternalStats is the aggregate-only payload consumed by the CRM metrics
// collector. It must never contain PII (emails, names, ids, event content).
type InternalStats struct {
	Users    InternalUserStats  `json:"users"`
	Events   InternalEventStats `json:"events"`
	Clients  InternalTotalStats `json:"clients"`
	Products InternalTotalStats `json:"products"`
	Quotes   InternalQuoteStats `json:"quotes"`
}

type InternalUserStats struct {
	Total     int `json:"total"`
	New30d    int `json:"new30d"`
	Active7d  int `json:"active7d"`
	Active30d int `json:"active30d"`
}

type InternalEventStats struct {
	Total      int `json:"total"`
	Created30d int `json:"created30d"`
}

type InternalTotalStats struct {
	Total int `json:"total"`
}

type InternalQuoteStats struct {
	Total      int `json:"total"`
	Created30d int `json:"created30d"`
}

// internalStatsQuerier is the minimal pgx surface needed (satisfied by *pgxpool.Pool).
type internalStatsQuerier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// InternalStatsLoader computes the stats snapshot.
type InternalStatsLoader func(ctx context.Context) (*InternalStats, error)

const internalStatsCacheTTL = 5 * time.Minute

// InternalStatsHandler serves GET /internal/stats behind a static Bearer token.
type InternalStatsHandler struct {
	tokenHash [32]byte
	enabled   bool
	load      InternalStatsLoader

	mu       sync.Mutex
	cached   *InternalStats
	cachedAt time.Time
	now      func() time.Time
}

// NewInternalStatsHandler builds the handler. An empty token disables the
// endpoint entirely (404), so a missing env var can never expose it.
func NewInternalStatsHandler(token string, load InternalStatsLoader) *InternalStatsHandler {
	token = strings.TrimSpace(token)
	return &InternalStatsHandler{
		tokenHash: sha256.Sum256([]byte(token)),
		enabled:   token != "",
		load:      load,
		now:       time.Now,
	}
}

func (h *InternalStatsHandler) authorized(r *http.Request) bool {
	const prefix = "Bearer "
	auth := r.Header.Get("Authorization")
	if len(auth) <= len(prefix) || !strings.EqualFold(auth[:len(prefix)], prefix) {
		return false
	}
	got := sha256.Sum256([]byte(strings.TrimSpace(auth[len(prefix):])))
	return subtle.ConstantTimeCompare(got[:], h.tokenHash[:]) == 1
}

// ServeHTTP handles GET /internal/stats.
func (h *InternalStatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !h.enabled {
		http.NotFound(w, r)
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	if !h.authorized(r) {
		w.Header().Set("WWW-Authenticate", "Bearer")
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	h.mu.Lock()
	cached := h.cached
	fresh := cached != nil && h.now().Sub(h.cachedAt) < internalStatsCacheTTL
	h.mu.Unlock()

	if !fresh {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		stats, err := h.load(ctx)
		if err != nil {
			slog.Error("internal stats: load failed", "error", err)
			writeError(w, http.StatusInternalServerError, "Failed to load stats")
			return
		}
		h.mu.Lock()
		h.cached, h.cachedAt = stats, h.now()
		h.mu.Unlock()
		cached = stats
	}

	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, http.StatusOK, cached)
}

// WithInternalStats routes /internal/stats to h and everything else to next.
// Mounted outside the /api router so it bypasses CSRF/user auth middleware.
func WithInternalStats(next http.Handler, h *InternalStatsHandler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/internal/stats" {
			h.ServeHTTP(w, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// NewPoolInternalStatsLoader returns a loader that runs indexed counts against
// the database. Users are end-user accounts only (active, not soft-deleted),
// matching the admin dashboard definition. "Quotes" are events in status
// 'quoted' (there is no separate quotes table).
func NewPoolInternalStatsLoader(q internalStatsQuerier) InternalStatsLoader {
	const activeUser = `role = 'user' AND COALESCE(account_status, 'active') = 'active' AND deleted_at IS NULL`
	return func(ctx context.Context) (*InternalStats, error) {
		s := &InternalStats{}
		queries := []struct {
			name string
			sql  string
			dest *int
		}{
			{"users.total", `SELECT COUNT(*) FROM users WHERE ` + activeUser, &s.Users.Total},
			{"users.new30d", `SELECT COUNT(*) FROM users WHERE ` + activeUser + ` AND created_at >= NOW() - INTERVAL '30 days'`, &s.Users.New30d},
			{"users.active7d", `SELECT COUNT(*) FROM users WHERE ` + activeUser + ` AND last_active_at >= NOW() - INTERVAL '7 days'`, &s.Users.Active7d},
			{"users.active30d", `SELECT COUNT(*) FROM users WHERE ` + activeUser + ` AND last_active_at >= NOW() - INTERVAL '30 days'`, &s.Users.Active30d},
			{"events.total", `SELECT COUNT(*) FROM events`, &s.Events.Total},
			{"events.created30d", `SELECT COUNT(*) FROM events WHERE created_at >= NOW() - INTERVAL '30 days'`, &s.Events.Created30d},
			{"clients.total", `SELECT COUNT(*) FROM clients`, &s.Clients.Total},
			{"products.total", `SELECT COUNT(*) FROM products`, &s.Products.Total},
			{"quotes.total", `SELECT COUNT(*) FROM events WHERE status = 'quoted'`, &s.Quotes.Total},
			{"quotes.created30d", `SELECT COUNT(*) FROM events WHERE status = 'quoted' AND created_at >= NOW() - INTERVAL '30 days'`, &s.Quotes.Created30d},
		}
		for _, qr := range queries {
			if err := q.QueryRow(ctx, qr.sql).Scan(qr.dest); err != nil {
				return nil, fmt.Errorf("internal stats %s: %w", qr.name, err)
			}
		}
		return s, nil
	}
}
