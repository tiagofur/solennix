package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// profileViewRecorder is satisfied by *repository.PublicProfileRepo.
type profileViewRecorder interface {
	RecordProfileView(ctx context.Context, v repository.ProfileView) error
}

// inboundAnalyticsStore is satisfied by *repository.PublicProfileRepo.
type inboundAnalyticsStore interface {
	GetInboundAnalytics(ctx context.Context, organizerUserID uuid.UUID, periodDays int) (*repository.InboundAnalytics, error)
}

// recordPublicProfileView best-effort records a privacy-safe page view for #1131.
// Never blocks or fails the public profile response.
func recordPublicProfileView(
	ctx context.Context,
	recorder profileViewRecorder,
	organizerUserID uuid.UUID,
	slug string,
	r *http.Request,
) {
	if recorder == nil || organizerUserID == uuid.Nil || slug == "" {
		return
	}
	ip := inboundClientIP(r)
	ua := r.UserAgent()
	day := time.Now().UTC().Format("2006-01-02")
	sum := sha256.Sum256([]byte(ip + "|" + ua + "|" + day))
	hash := hex.EncodeToString(sum[:])

	ref := strings.TrimSpace(r.Referer())
	var refPtr *string
	if ref != "" {
		// Cap length to avoid abusive headers filling the table.
		if len(ref) > 500 {
			ref = ref[:500]
		}
		refPtr = &ref
	}
	source := deriveTrafficSource(ref, r.URL.Query().Get("src"), r.URL.Query().Get("utm_source"))

	// Detach from request cancellation so slow clients still record.
	bg, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	if err := recorder.RecordProfileView(bg, repository.ProfileView{
		OrganizerUserID: organizerUserID,
		Slug:            slug,
		VisitorHash:     hash,
		Referrer:        refPtr,
		Source:          source,
	}); err != nil {
		slog.Warn("inbound analytics: record view failed", "slug", slug, "error", err)
	}
}

func inboundClientIP(r *http.Request) string {
	// Prefer leftmost X-Forwarded-For when behind a trusted proxy (prod).
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		return xri
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func deriveTrafficSource(referer, srcQuery, utmSource string) string {
	s := strings.ToLower(strings.TrimSpace(srcQuery))
	if s == "" {
		s = strings.ToLower(strings.TrimSpace(utmSource))
	}
	switch s {
	case "directory", "proveedores", "share", "direct", "other":
		if s == "proveedores" {
			return "directory"
		}
		return s
	}
	if referer == "" {
		return "direct"
	}
	// Parse path when possible.
	if u, err := url.Parse(referer); err == nil {
		path := strings.ToLower(u.Path)
		if strings.Contains(path, "/proveedores") {
			return "directory"
		}
		if strings.Contains(path, "/u/") {
			return "share"
		}
	}
	low := strings.ToLower(referer)
	if strings.Contains(low, "proveedores") {
		return "directory"
	}
	return "other"
}

// GetInboundAnalytics handles GET /api/users/me/inbound-analytics?days=7|30|90.
// Free plan: teaser (views only, limited=true). Pro+: full funnel.
func (h *PublicProfileConfigHandler) GetInboundAnalytics(w http.ResponseWriter, r *http.Request) {
	if h.analytics == nil {
		writeError(w, http.StatusNotImplemented, "inbound analytics not configured")
		return
	}
	userID := middleware.GetUserID(r.Context())
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "Failed to load account")
		return
	}

	days := 30
	if raw := strings.TrimSpace(r.URL.Query().Get("days")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			days = n
		}
	}
	// Clamp to product-allowed ranges.
	switch {
	case days <= 7:
		days = 7
	case days <= 30:
		days = 30
	default:
		days = 90
	}

	stats, err := h.analytics.GetInboundAnalytics(r.Context(), userID, days)
	if err != nil {
		slog.Error("inbound analytics: aggregate failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to load inbound analytics")
		return
	}

	// Free teaser: only monthly-ish views (use requested period but strip funnel).
	if !FeatureAvailable(user.Plan, "public_profile_full") {
		teaser := &repository.InboundAnalytics{
			PeriodDays:     stats.PeriodDays,
			Views:          stats.Views,
			UniqueVisitors: stats.UniqueVisitors,
			PreviousViews:  stats.PreviousViews,
			ViewsChangePct: stats.ViewsChangePct,
			ViewsByDay:     stats.ViewsByDay,
			Limited:        true,
			// Empty maps so JSON is stable.
			RequestsByStatus: map[string]int{},
			Sources:          map[string]int{},
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": teaser})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"data": stats})
}
