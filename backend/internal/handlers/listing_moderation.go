package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// listingModerationStore is satisfied by *repository.PublicProfileRepo.
type listingModerationStore interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
	IsDirectoryPublicable(ctx context.Context, userID uuid.UUID) (bool, error)
	SubmitForReview(ctx context.Context, userID uuid.UUID, publicable bool, spamFlag bool) (*models.OrganizerPublicProfile, error)
	ApprovePublication(ctx context.Context, userID, adminID uuid.UUID) (*models.OrganizerPublicProfile, error)
	RejectPublication(ctx context.Context, userID, adminID uuid.UUID, reason string) (*models.OrganizerPublicProfile, error)
	ListModerationQueue(ctx context.Context, status string, limit int) ([]repository.ModerationListing, error)
}

// SubmitForDirectoryReview handles POST /api/users/me/public-profile/submit-for-review (#1130).
func (h *PublicProfileConfigHandler) SubmitForDirectoryReview(w http.ResponseWriter, r *http.Request) {
	if h.moderation == nil {
		writeError(w, http.StatusNotImplemented, "listing moderation not configured")
		return
	}
	userID := middleware.GetUserID(r.Context())

	profile, err := h.moderation.GetByUserID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrPublicProfileNotFound) {
			writeError(w, http.StatusBadRequest, "Save and enable your public profile before submitting")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to load public profile")
		return
	}
	if !profile.IsEnabled {
		writeError(w, http.StatusBadRequest, "Enable the public profile before submitting for review")
		return
	}

	publicable, err := h.moderation.IsDirectoryPublicable(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check publicability")
		return
	}
	if !publicable {
		writeError(w, http.StatusBadRequest, "Profile does not meet directory requirements (cover, bio, city, country, at least one public service)")
		return
	}

	headline, about := "", ""
	if profile.Headline != nil {
		headline = *profile.Headline
	}
	if profile.About != nil {
		about = *profile.About
	}
	spam := repository.DetectSpamFlag(headline, about)

	updated, err := h.moderation.SubmitForReview(r.Context(), userID, publicable, spam)
	if err != nil {
		if errors.Is(err, repository.ErrNotPublicable) {
			writeError(w, http.StatusBadRequest, "Profile does not meet directory requirements")
			return
		}
		if errors.Is(err, repository.ErrInvalidPublicationTransition) {
			writeError(w, http.StatusConflict, "Profile cannot be submitted from its current status")
			return
		}
		slog.Error("moderation: submit failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to submit for review")
		return
	}
	if h.userRepo != nil {
		updated.PublicSlug = h.currentSlug(r.Context(), userID, updated.PublicSlug)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": updated})
}

// ListListingModeration handles GET /api/admin/listing-moderation?status=pending_review.
func (h *AdminHandler) ListListingModeration(w http.ResponseWriter, r *http.Request) {
	if h.moderation == nil {
		writeError(w, http.StatusNotImplemented, "listing moderation not configured")
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status == "" {
		status = models.PublicationPendingReview
	}
	items, err := h.moderation.ListModerationQueue(r.Context(), status, 50)
	if err != nil {
		slog.Error("admin: list listing moderation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load moderation queue")
		return
	}
	if items == nil {
		items = []repository.ModerationListing{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": items})
}

// ApproveListing handles POST /api/admin/listing-moderation/{id}/approve.
func (h *AdminHandler) ApproveListing(w http.ResponseWriter, r *http.Request) {
	if h.moderation == nil {
		writeError(w, http.StatusNotImplemented, "listing moderation not configured")
		return
	}
	adminID := middleware.GetUserID(r.Context())
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user id")
		return
	}
	updated, err := h.moderation.ApprovePublication(r.Context(), userID, adminID)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidPublicationTransition) {
			writeError(w, http.StatusConflict, "Profile cannot be approved from its current status")
			return
		}
		slog.Error("admin: approve listing failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to approve listing")
		return
	}
	slog.Info("admin: listing approved", "admin_id", adminID, "user_id", userID)
	writeJSON(w, http.StatusOK, map[string]any{"data": updated})
}

// RejectListing handles POST /api/admin/listing-moderation/{id}/reject.
func (h *AdminHandler) RejectListing(w http.ResponseWriter, r *http.Request) {
	if h.moderation == nil {
		writeError(w, http.StatusNotImplemented, "listing moderation not configured")
		return
	}
	adminID := middleware.GetUserID(r.Context())
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid user id")
		return
	}
	var body struct {
		Reason string `json:"reason"`
	}
	if err := decodeJSON(w, r, &body); err != nil {
		return
	}
	if strings.TrimSpace(body.Reason) == "" {
		writeError(w, http.StatusBadRequest, "reason is required")
		return
	}
	updated, err := h.moderation.RejectPublication(r.Context(), userID, adminID, body.Reason)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidPublicationTransition) {
			writeError(w, http.StatusConflict, "Profile cannot be rejected from its current status")
			return
		}
		if strings.Contains(err.Error(), "reason is required") {
			writeError(w, http.StatusBadRequest, "reason is required")
			return
		}
		slog.Error("admin: reject listing failed", "error", err, "user_id", userID)
		writeError(w, http.StatusInternalServerError, "Failed to reject listing")
		return
	}
	// Provider sees the reason on next GET of their public profile config (UI).
	slog.Info("admin: listing rejected", "admin_id", adminID, "user_id", userID)
	writeJSON(w, http.StatusOK, map[string]any{"data": updated})
}
