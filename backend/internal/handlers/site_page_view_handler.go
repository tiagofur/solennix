package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/tiagofur/solennix-backend/internal/repository"
)

type sitePageViewRecorder interface {
	Record(ctx context.Context, v repository.SitePageView) error
}

// SitePageViewHandler handles public marketing page-view beacons (slice 2).
type SitePageViewHandler struct {
	repo sitePageViewRecorder
}

func NewSitePageViewHandler(repo sitePageViewRecorder) *SitePageViewHandler {
	return &SitePageViewHandler{repo: repo}
}

type recordPageViewRequest struct {
	PageKey string `json:"page_key"`
}

// Record handles POST /api/public/page-views — always 204.
func (h *SitePageViewHandler) Record(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.repo == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var req recordPageViewRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}
	pageKey := NormalizeMarketingPageKey(req.PageKey)

	ip := inboundClientIP(r)
	ua := r.UserAgent()
	day := time.Now().UTC().Format("2006-01-02")
	sum := sha256.Sum256([]byte(ip + "|" + ua + "|" + day + "|page:" + pageKey))
	hash := hex.EncodeToString(sum[:])

	ref := strings.TrimSpace(r.Referer())
	var refPtr *string
	if ref != "" {
		if len(ref) > 500 {
			ref = ref[:500]
		}
		refPtr = &ref
	}
	source := deriveTrafficSource(ref, r.URL.Query().Get("src"), r.URL.Query().Get("utm_source"))
	device := ClassifyDeviceClass(ua)
	var countryPtr *string
	if cc := CoarseCountryCode(r); cc != "" {
		countryPtr = &cc
	}

	bg, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 2*time.Second)
	defer cancel()
	if err := h.repo.Record(bg, repository.SitePageView{
		PageKey:     pageKey,
		VisitorHash: hash,
		DeviceClass: device,
		CountryCode: countryPtr,
		Referrer:    refPtr,
		Source:      source,
	}); err != nil {
		slog.Warn("site page view: record failed", "page_key", pageKey, "error", err)
	}

	w.WriteHeader(http.StatusNoContent)
}
