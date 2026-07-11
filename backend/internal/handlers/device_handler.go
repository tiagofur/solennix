package handlers

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// DeviceRepository defines the interface for device token operations
type DeviceRepository interface {
	Register(ctx context.Context, userID uuid.UUID, token, platform string) (*models.DeviceToken, error)
	Unregister(ctx context.Context, userID uuid.UUID, token string) error
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.DeviceToken, error)
	UnregisterAllForUser(ctx context.Context, userID uuid.UUID) error
}

type DeviceHandler struct {
	deviceRepo DeviceRepository
}

func NewDeviceHandler(deviceRepo DeviceRepository) *DeviceHandler {
	return &DeviceHandler{deviceRepo: deviceRepo}
}

// RegisterDevice handles POST /api/devices/register
func (h *DeviceHandler) RegisterDevice(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Token    string `json:"token"`
		Platform string `json:"platform"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	// Validate platform
	if req.Platform != "ios" && req.Platform != "android" && req.Platform != "web" {
		writeError(w, http.StatusBadRequest, "platform must be 'ios', 'android', or 'web'")
		return
	}

	device, err := h.deviceRepo.Register(r.Context(), userID, req.Token, req.Platform)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to register device")
		return
	}

	writeJSON(w, http.StatusOK, device)
}

// UnregisterDevice handles POST /api/devices/unregister
func (h *DeviceHandler) UnregisterDevice(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Token string `json:"token"`
	}
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	if err := h.deviceRepo.Unregister(r.Context(), userID, req.Token); err != nil {
		// Don't expose if token wasn't found - just succeed silently
		// This prevents enumeration attacks
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
