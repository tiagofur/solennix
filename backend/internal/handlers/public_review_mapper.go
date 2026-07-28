package handlers

import (
	"context"
	"net/http"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// publicReviewDeps groups the dependencies needed to serve sanitized public
// reviews for GET /api/public/organizers/{slug}/reviews. Keeping them as local
// interfaces lets the handler stay unit-testable with fakes and lets the real
// handler delegate without changing its own struct shape.
type publicReviewDeps struct {
	user    publicReviewUserResolver
	profile publicReviewProfileResolver
	reviews publicReviewLister
}

type publicReviewUserResolver interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}
type publicReviewProfileResolver interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}
type publicReviewLister interface {
	ListPublicByOrganizerSlug(ctx context.Context, slug string) ([]*models.EventReview, error)
}

// listPublicReviews writes the sanitized PublicReview[] for the given slug.
// Returns [] (never nil) when:
//   - the organizer is unknown / inactive (no user found via GetByPublicSlug),
//   - the public profile is disabled or missing,
//   - the plan is Free (reviews are Pro+ only),
//   - the reviews feature is not available for the plan,
//   - show_reviews toggle is off.
// Otherwise fetches and sanitizes each EventReview via toPublicReview (no PII).
// Must stay aligned with GET /api/public/organizers/{slug}: disabled profiles
// must not leak reviews on this sub-route.
func listPublicReviews(w http.ResponseWriter, r *http.Request, slug string, deps publicReviewDeps) {
	ctx := r.Context()
	user, err := deps.user.GetByPublicSlug(ctx, slug)
	if err != nil || user == nil {
		writeJSON(w, http.StatusOK, map[string]any{"data": []models.PublicReview{}})
		return
	}
	// Defense in depth if the repo ever returns non-active accounts.
	if !isPubliclyVisibleAccount(user) {
		writeJSON(w, http.StatusOK, map[string]any{"data": []models.PublicReview{}})
		return
	}
	// Free / plans without the reviews feature -> empty list.
	if !FeatureAvailable(user.Plan, "reviews") {
		writeJSON(w, http.StatusOK, map[string]any{"data": []models.PublicReview{}})
		return
	}
	profile, err := deps.profile.GetByUserID(ctx, user.ID)
	if err != nil || profile == nil || !profile.IsEnabled || !profile.ShowReviews {
		writeJSON(w, http.StatusOK, map[string]any{"data": []models.PublicReview{}})
		return
	}
	raw, err := deps.reviews.ListPublicByOrganizerSlug(ctx, slug)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"data": []models.PublicReview{}})
		return
	}
	out := make([]models.PublicReview, 0, len(raw))
	for _, er := range raw {
		out = append(out, toPublicReview(er))
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": out})
}

// toPublicReview maps an EventReview (which carries PII) into the sanitized
// PublicReview DTO. It strips client_id, user_id, event_id, review_request_id,
// client_name, email, and any internal field, exposing only the public-safe
// projection. display_name is server-computed from the first letter of the
// client's first name token, falling back to a generic label when the name is
// missing or unparseable.
func toPublicReview(er *models.EventReview) models.PublicReview {
	return models.PublicReview{
		Rating:            er.Rating,
		Comment:           er.Comment,
		SubmittedAt:       er.SubmittedAt,
		OrganizerResponse: er.OrganizerResponse,
		DisplayName:       computeDisplayName(er.ClientName),
		EventLabel:        er.EventLabel,
	}
}

// computeDisplayName returns the first letter of the client's first name token
// uppercased and suffixed with "." (e.g. "Ana López" -> "A."). When the name is
// nil, empty, whitespace-only, or starts with a non-letter, it returns the
// generic "Verified client" fallback so no PII is ever surfaced.
func computeDisplayName(name *string) string {
	const fallback = "Verified client"
	if name == nil {
		return fallback
	}
	trimmed := strings.TrimSpace(*name)
	if trimmed == "" {
		return fallback
	}
	// First rune of the first token.
	for _, r := range trimmed {
		if unicode.IsLetter(r) {
			return strings.ToUpper(string(r)) + "."
		}
		return fallback
	}
	return fallback
}
