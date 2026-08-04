package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type registrationFunnelRecorder interface {
	Record(ctx context.Context, e repository.RegistrationFunnelEvent) error
}

// RegistrationFunnelHandler handles the public registration-funnel beacon (slice 3).
type RegistrationFunnelHandler struct {
	repo registrationFunnelRecorder
}

func NewRegistrationFunnelHandler(repo registrationFunnelRecorder) *RegistrationFunnelHandler {
	return &RegistrationFunnelHandler{repo: repo}
}

type recordRegistrationFunnelRequest struct {
	Step   string `json:"step"`
	Method string `json:"method"`
}

// Record handles POST /api/public/registration-funnel — always 204.
// Only the client-trusted step register_view is accepted; others are ignored.
func (h *RegistrationFunnelHandler) Record(w http.ResponseWriter, r *http.Request) {
	if h == nil || h.repo == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	var req recordRegistrationFunnelRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	step := NormalizeFunnelStep(req.Step)
	if step != "register_view" {
		// Soft allowlist: never 400; skip untrusted client steps.
		w.WriteHeader(http.StatusNoContent)
		return
	}
	method := NormalizeFunnelMethod(req.Method)

	ip := inboundClientIP(r)
	ua := r.UserAgent()
	day := time.Now().UTC().Format("2006-01-02")
	sum := sha256.Sum256([]byte(ip + "|" + ua + "|" + day + "|funnel:register_view"))
	hash := hex.EncodeToString(sum[:])

	device := ClassifyDeviceClass(ua)
	var countryPtr *string
	if cc := CoarseCountryCode(r); cc != "" {
		countryPtr = &cc
	}
	platform := middleware.ParsePlatform(r)

	bg, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), 2*time.Second)
	defer cancel()
	if err := h.repo.Record(bg, repository.RegistrationFunnelEvent{
		Step:        step,
		Method:      method,
		Platform:    platform,
		VisitorHash: hash,
		DeviceClass: device,
		CountryCode: countryPtr,
	}); err != nil {
		slog.Warn("registration funnel: record failed", "step", step, "error", err)
	}

	w.WriteHeader(http.StatusNoContent)
}
