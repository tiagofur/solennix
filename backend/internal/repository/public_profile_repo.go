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
	p := &models.OrganizerPublicProfile{}
	var socials []byte

	query := `SELECT user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, created_at, updated_at
		FROM organizer_public_profiles WHERE user_id = $1`

	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.IsEnabled, &p.Headline, &p.ContactType, &p.ContactValue,
		&p.City, &p.Region, &p.Country, &p.Latitude, &p.Longitude,
		&p.ShowPrices, &p.ShowServices, &p.ShowReviews, &p.ShowPortfolio, &p.ShowContact,
		&socials, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Wrap both the sentinel (for callers that switch on it) and the
			// pgx error (for errors.Is(err, pgx.ErrNoRows)).
			return nil, fmt.Errorf("%w: %w", ErrPublicProfileNotFound, err)
		}
		return nil, fmt.Errorf("get public profile: %w", err)
	}

	if len(socials) > 0 && string(socials) != "null" {
		if err := json.Unmarshal(socials, &p.Socials); err != nil {
			return nil, fmt.Errorf("decode socials: %w", err)
		}
	}
	return p, nil
}
