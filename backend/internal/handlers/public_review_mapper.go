package handlers

import (
	"strings"
	"unicode"

	"github.com/tiagofur/solennix-backend/internal/models"
)

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
