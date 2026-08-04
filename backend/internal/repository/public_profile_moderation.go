package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ModerationListing is a queue row for admin review (#1130).
type ModerationListing struct {
	UserID             uuid.UUID `json:"user_id"`
	PublicSlug         string    `json:"public_slug"`
	BusinessName       string    `json:"business_name"`
	Plan               string    `json:"plan"`
	City               *string   `json:"city,omitempty"`
	Country            *string   `json:"country,omitempty"`
	Headline           *string   `json:"headline,omitempty"`
	About              *string   `json:"about,omitempty"`
	CoverURL           *string   `json:"cover_url,omitempty"`
	PublicationStatus  string    `json:"publication_status"`
	SpamFlag           bool      `json:"publication_spam_flag"`
	SubmittedAt        *time.Time `json:"publication_submitted_at,omitempty"`
	RejectionReason    *string   `json:"publication_rejection_reason,omitempty"`
}

var (
	// ErrNotPublicable is returned when directory criteria are not met.
	ErrNotPublicable = fmt.Errorf("profile does not meet publicability criteria")
	// ErrInvalidPublicationTransition is returned for illegal status changes.
	ErrInvalidPublicationTransition = fmt.Errorf("invalid publication status transition")
)

// soft spam markers — auto-flag only, never auto-reject (#1130).
var spamMarkers = []string{
	"crypto", "bitcoin", "forex", "casino", "viagra", "click here",
	"http://bit.ly", "t.me/", "onlyfans",
}

// DetectSpamFlag returns true when headline/about look suspicious.
func DetectSpamFlag(headline, about string) bool {
	blob := strings.ToLower(headline + " " + about)
	for _, m := range spamMarkers {
		if strings.Contains(blob, m) {
			return true
		}
	}
	// Many raw URLs in about is a soft signal.
	if strings.Count(blob, "http://")+strings.Count(blob, "https://") >= 3 {
		return true
	}
	return false
}

// SubmitForReview moves unpublished/rejected → pending_review when publicable.
func (r *PublicProfileRepo) SubmitForReview(ctx context.Context, userID uuid.UUID, publicable bool, spamFlag bool) (*models.OrganizerPublicProfile, error) {
	if !publicable {
		return nil, ErrNotPublicable
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_profiles
		SET publication_status = 'pending_review',
		    publication_rejection_reason = NULL,
		    publication_submitted_at = NOW(),
		    publication_spam_flag = $2,
		    updated_at = NOW()
		WHERE user_id = $1
		  AND publication_status IN ('unpublished', 'rejected', 'pending_review')
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km,
			publication_status, publication_rejection_reason, publication_reviewed_at,
			publication_reviewed_by, publication_submitted_at, publication_spam_flag,
			created_at, updated_at`,
		userID, spamFlag,
	)
	p, err := scanProfile(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrInvalidPublicationTransition
		}
		return nil, fmt.Errorf("submit for review: %w", err)
	}
	return p, nil
}

// ApprovePublication sets published.
func (r *PublicProfileRepo) ApprovePublication(ctx context.Context, userID, adminID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_profiles
		SET publication_status = 'published',
		    publication_rejection_reason = NULL,
		    publication_reviewed_at = NOW(),
		    publication_reviewed_by = $2,
		    publication_spam_flag = false,
		    updated_at = NOW()
		WHERE user_id = $1
		  AND publication_status IN ('pending_review', 'rejected', 'unpublished')
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km,
			publication_status, publication_rejection_reason, publication_reviewed_at,
			publication_reviewed_by, publication_submitted_at, publication_spam_flag,
			created_at, updated_at`,
		userID, adminID,
	)
	p, err := scanProfile(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrInvalidPublicationTransition
		}
		return nil, fmt.Errorf("approve publication: %w", err)
	}
	return p, nil
}

// RejectPublication sets rejected with a reason.
func (r *PublicProfileRepo) RejectPublication(ctx context.Context, userID, adminID uuid.UUID, reason string) (*models.OrganizerPublicProfile, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("rejection reason is required")
	}
	if len(reason) > 1000 {
		reason = reason[:1000]
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_profiles
		SET publication_status = 'rejected',
		    publication_rejection_reason = $3,
		    publication_reviewed_at = NOW(),
		    publication_reviewed_by = $2,
		    updated_at = NOW()
		WHERE user_id = $1
		  AND publication_status IN ('pending_review', 'published')
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km,
			publication_status, publication_rejection_reason, publication_reviewed_at,
			publication_reviewed_by, publication_submitted_at, publication_spam_flag,
			created_at, updated_at`,
		userID, adminID, reason,
	)
	p, err := scanProfile(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrInvalidPublicationTransition
		}
		return nil, fmt.Errorf("reject publication: %w", err)
	}
	return p, nil
}

// ListModerationQueue returns listings for admin review, spam-flagged first.
func (r *PublicProfileRepo) ListModerationQueue(ctx context.Context, status string, limit int) ([]ModerationListing, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	status = strings.TrimSpace(status)
	if status == "" {
		status = models.PublicationPendingReview
	}
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, COALESCE(u.public_slug, ''), COALESCE(u.business_name, u.name, ''),
		       u.plan, opp.city, opp.country, opp.headline, opp.about, u.cover_url,
		       opp.publication_status, opp.publication_spam_flag,
		       opp.publication_submitted_at, opp.publication_rejection_reason
		FROM organizer_public_profiles opp
		JOIN users u ON u.id = opp.user_id
		WHERE opp.publication_status = $1
		  AND u.deleted_at IS NULL
		ORDER BY opp.publication_spam_flag DESC NULLS LAST,
		         opp.publication_submitted_at ASC NULLS LAST,
		         opp.updated_at DESC
		LIMIT $2`, status, limit)
	if err != nil {
		return nil, fmt.Errorf("list moderation queue: %w", err)
	}
	defer rows.Close()

	out := make([]ModerationListing, 0)
	for rows.Next() {
		var m ModerationListing
		if err := rows.Scan(
			&m.UserID, &m.PublicSlug, &m.BusinessName, &m.Plan,
			&m.City, &m.Country, &m.Headline, &m.About, &m.CoverURL,
			&m.PublicationStatus, &m.SpamFlag, &m.SubmittedAt, &m.RejectionReason,
		); err != nil {
			return nil, fmt.Errorf("scan moderation row: %w", err)
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// IsDirectoryPublicable checks cover + text + city/country + ≥1 public product + enabled + slug.
// Mirrors SearchPublicProfiles publicability (minus publication_status).
func (r *PublicProfileRepo) IsDirectoryPublicable(ctx context.Context, userID uuid.UUID) (bool, error) {
	var ok bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM organizer_public_profiles opp
			JOIN users u ON u.id = opp.user_id
			WHERE u.id = $1
			  AND opp.is_enabled = true
			  AND u.deleted_at IS NULL
			  AND COALESCE(u.account_status, 'active') = 'active'
			  AND u.public_slug IS NOT NULL AND u.public_slug <> ''
			  AND u.cover_url IS NOT NULL AND u.cover_url <> ''
			  AND ( (opp.headline IS NOT NULL AND opp.headline <> '')
			        OR (opp.about IS NOT NULL AND opp.about <> '') )
			  AND opp.city IS NOT NULL AND opp.city <> ''
			  AND opp.country IS NOT NULL AND opp.country <> ''
			  AND EXISTS (
			    SELECT 1 FROM products p
			    WHERE p.user_id = u.id AND p.is_active = true AND p.show_on_public_profile = true
			  )
		)`, userID).Scan(&ok)
	if err != nil {
		return false, fmt.Errorf("check publicable: %w", err)
	}
	return ok, nil
}
