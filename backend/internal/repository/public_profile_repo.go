package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// PublicProfileRepo reads organizer_public_profiles rows.
// PR2 ships GetByUserID only (read path for the public aggregate GET);
// upsert arrives in PR3 with the auth Settings endpoint.
type PublicProfileRepo struct {
	pool *pgxpool.Pool
}

func NewPublicProfileRepo(pool *pgxpool.Pool) *PublicProfileRepo {
	return &PublicProfileRepo{pool: pool}
}

// ErrPublicProfileNotFound is returned by GetByUserID when the organizer has
// no profile row yet. Callers map this to a 404 on public endpoints.
var ErrPublicProfileNotFound = fmt.Errorf("public profile not found")

// GetByUserID loads the organizer public-profile config. Returns
// ErrPublicProfileNotFound (wrapping pgx.ErrNoRows) when no row exists.
func (r *PublicProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, created_at, updated_at
		FROM organizer_public_profiles WHERE user_id = $1`, userID)
	p, err := scanProfile(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Wrap both the sentinel (for callers that switch on it) and the
			// pgx error (for errors.Is(err, pgx.ErrNoRows)).
			return nil, fmt.Errorf("%w: %w", ErrPublicProfileNotFound, err)
		}
		return nil, fmt.Errorf("get public profile: %w", err)
	}
	return p, nil
}

// Upsert creates or updates the organizer public-profile config. On insert,
// DB defaults fill fields the caller omits (show_* toggles default true,
// show_prices defaults false). On conflict (user_id), all listed fields are
// replaced. Returns the stored row (with DB-applied defaults and timestamps).
func (r *PublicProfileRepo) Upsert(ctx context.Context, p *models.OrganizerPublicProfile) (*models.OrganizerPublicProfile, error) {
	socials, err := json.Marshal(p.Socials)
	if err != nil {
		return nil, fmt.Errorf("encode socials: %w", err)
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO organizer_public_profiles (
			user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact, socials
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		ON CONFLICT (user_id) DO UPDATE SET
			is_enabled     = EXCLUDED.is_enabled,
			headline       = EXCLUDED.headline,
			contact_type   = EXCLUDED.contact_type,
			contact_value  = EXCLUDED.contact_value,
			city           = EXCLUDED.city,
			region         = EXCLUDED.region,
			country        = EXCLUDED.country,
			latitude       = EXCLUDED.latitude,
			longitude      = EXCLUDED.longitude,
			show_prices    = EXCLUDED.show_prices,
			show_services  = EXCLUDED.show_services,
			show_reviews   = EXCLUDED.show_reviews,
			show_portfolio = EXCLUDED.show_portfolio,
			show_contact   = EXCLUDED.show_contact,
			socials        = EXCLUDED.socials,
			updated_at     = NOW()
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, created_at, updated_at`,
		p.UserID, p.IsEnabled, p.Headline, p.ContactType, p.ContactValue,
		p.City, p.Region, p.Country, p.Latitude, p.Longitude,
		p.ShowPrices, p.ShowServices, p.ShowReviews, p.ShowPortfolio, p.ShowContact, socials,
	)
	stored, err := scanProfile(row)
	if err != nil {
		return nil, fmt.Errorf("upsert public profile: %w", err)
	}
	return stored, nil
}

// rowScanner abstracts pgx.Row and pgx.QueryRow return values so scanProfile
// can serve both GetByUserID (QueryRow) and Upsert (QueryRow).
type rowScanner interface {
	Scan(dest ...interface{}) error
}

// scanProfile decodes a public-profile row, including the JSONB socials field,
// into a fully-populated *models.OrganizerPublicProfile.
func scanProfile(row rowScanner) (*models.OrganizerPublicProfile, error) {
	p := &models.OrganizerPublicProfile{}
	var socials []byte
	if err := row.Scan(
		&p.UserID, &p.IsEnabled, &p.Headline, &p.ContactType, &p.ContactValue,
		&p.City, &p.Region, &p.Country, &p.Latitude, &p.Longitude,
		&p.ShowPrices, &p.ShowServices, &p.ShowReviews, &p.ShowPortfolio, &p.ShowContact,
		&socials, &p.CreatedAt, &p.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if len(socials) > 0 && string(socials) != "null" {
		if err := json.Unmarshal(socials, &p.Socials); err != nil {
			return nil, fmt.Errorf("decode socials: %w", err)
		}
	}
	return p, nil
}
