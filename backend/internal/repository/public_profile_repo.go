package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// PublicProfileRepo reads organizer_public_profiles rows and portfolio items.
type PublicProfileRepo struct {
	pool *pgxpool.Pool
}

func NewPublicProfileRepo(pool *pgxpool.Pool) *PublicProfileRepo {
	return &PublicProfileRepo{pool: pool}
}

// MaxPublicPortfolioItems is the hard cap for Pro+ portfolio (sort_order 0–5).
const MaxPublicPortfolioItems = 6

// ErrPublicProfileNotFound is returned by GetByUserID when the organizer has
// no profile row yet. Callers map this to a 404 on public endpoints.
var ErrPublicProfileNotFound = fmt.Errorf("public profile not found")

// ErrPortfolioItemNotFound is returned when a portfolio item is missing or not owned.
var ErrPortfolioItemNotFound = fmt.Errorf("portfolio item not found")

// ErrPortfolioFull is returned when create would exceed MaxPublicPortfolioItems.
var ErrPortfolioFull = fmt.Errorf("portfolio max items reached")

// ErrPortfolioSortTaken is returned when (user_id, sort_order) is already used.
var ErrPortfolioSortTaken = fmt.Errorf("portfolio sort_order already taken")

// GetByUserID loads the organizer public-profile config. Returns
// ErrPublicProfileNotFound (wrapping pgx.ErrNoRows) when no row exists.
func (r *PublicProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			created_at, updated_at
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

	serviceAreas := p.ServiceAreas
	if serviceAreas == nil {
		serviceAreas = []string{}
	}
	eventTypes := p.EventTypes
	if eventTypes == nil {
		eventTypes = []string{}
	}
	languages := p.Languages
	if languages == nil {
		languages = []string{}
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO organizer_public_profiles (
			user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact, socials,
			about, service_areas, min_guests, max_guests, event_types, response_time, languages
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
			about          = EXCLUDED.about,
			service_areas  = EXCLUDED.service_areas,
			min_guests     = EXCLUDED.min_guests,
			max_guests     = EXCLUDED.max_guests,
			event_types    = EXCLUDED.event_types,
			response_time  = EXCLUDED.response_time,
			languages      = EXCLUDED.languages,
			updated_at     = NOW()
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			created_at, updated_at`,
		p.UserID, p.IsEnabled, p.Headline, p.ContactType, p.ContactValue,
		p.City, p.Region, p.Country, p.Latitude, p.Longitude,
		p.ShowPrices, p.ShowServices, p.ShowReviews, p.ShowPortfolio, p.ShowContact, socials,
		p.About, serviceAreas, p.MinGuests, p.MaxGuests, eventTypes, p.ResponseTime, languages,
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
		&socials, &p.About, &p.ServiceAreas, &p.MinGuests, &p.MaxGuests, &p.EventTypes, &p.ResponseTime, &p.Languages,
		&p.CreatedAt, &p.UpdatedAt,
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

// ListPortfolioByUserID returns portfolio items for the organizer ordered by sort_order.
// Caps at MaxPublicPortfolioItems for safety even if data is inconsistent.
func (r *PublicProfileRepo) ListPortfolioByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPortfolioItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, event_id, title, event_date::text, photo_url, thumbnail_url,
			sort_order, created_at, updated_at
		FROM organizer_public_portfolio_items
		WHERE user_id = $1
		ORDER BY sort_order ASC
		LIMIT $2`, userID, MaxPublicPortfolioItems)
	if err != nil {
		return nil, fmt.Errorf("list portfolio: %w", err)
	}
	defer rows.Close()

	items := make([]models.OrganizerPublicPortfolioItem, 0)
	for rows.Next() {
		item, err := scanPortfolioItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list portfolio rows: %w", err)
	}
	return items, nil
}

// CountPortfolioByUserID returns how many portfolio items the organizer has.
func (r *PublicProfileRepo) CountPortfolioByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM organizer_public_portfolio_items WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count portfolio: %w", err)
	}
	return n, nil
}

// CreatePortfolioItem inserts a portfolio row. Enforces max items and sort range.
// On unique (user_id, sort_order) conflict returns ErrPortfolioSortTaken.
func (r *PublicProfileRepo) CreatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error {
	if item.SortOrder < 0 || item.SortOrder > 5 {
		return fmt.Errorf("sort_order must be between 0 and 5")
	}
	count, err := r.CountPortfolioByUserID(ctx, item.UserID)
	if err != nil {
		return err
	}
	if count >= MaxPublicPortfolioItems {
		return ErrPortfolioFull
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO organizer_public_portfolio_items
			(user_id, event_id, title, event_date, photo_url, thumbnail_url, sort_order)
		VALUES ($1, $2, $3, NULLIF($4, '')::date, $5, $6, $7)
		RETURNING id, user_id, event_id, title, event_date::text, photo_url, thumbnail_url,
			sort_order, created_at, updated_at`,
		item.UserID, item.EventID, item.Title, nullStr(item.EventDate),
		item.PhotoURL, item.ThumbnailURL, item.SortOrder,
	)
	stored, err := scanPortfolioItem(row)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrPortfolioSortTaken
		}
		return fmt.Errorf("create portfolio item: %w", err)
	}
	*item = *stored
	return nil
}

// UpdatePortfolioItem updates fields of an owned portfolio item.
func (r *PublicProfileRepo) UpdatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error {
	if item.SortOrder < 0 || item.SortOrder > 5 {
		return fmt.Errorf("sort_order must be between 0 and 5")
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_portfolio_items SET
			event_id = $3,
			title = $4,
			event_date = NULLIF($5, '')::date,
			photo_url = $6,
			thumbnail_url = $7,
			sort_order = $8,
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, event_id, title, event_date::text, photo_url, thumbnail_url,
			sort_order, created_at, updated_at`,
		item.ID, item.UserID, item.EventID, item.Title, nullStr(item.EventDate),
		item.PhotoURL, item.ThumbnailURL, item.SortOrder,
	)
	stored, err := scanPortfolioItem(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrPortfolioItemNotFound
		}
		if isUniqueViolation(err) {
			return ErrPortfolioSortTaken
		}
		return fmt.Errorf("update portfolio item: %w", err)
	}
	*item = *stored
	return nil
}

// DeletePortfolioItem removes an owned portfolio item.
func (r *PublicProfileRepo) DeletePortfolioItem(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM organizer_public_portfolio_items WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete portfolio item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPortfolioItemNotFound
	}
	return nil
}

// GetPortfolioItem loads one owned portfolio item.
func (r *PublicProfileRepo) GetPortfolioItem(ctx context.Context, userID, id uuid.UUID) (*models.OrganizerPublicPortfolioItem, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, event_id, title, event_date::text, photo_url, thumbnail_url,
			sort_order, created_at, updated_at
		FROM organizer_public_portfolio_items
		WHERE id = $1 AND user_id = $2`, id, userID)
	item, err := scanPortfolioItem(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrPortfolioItemNotFound
		}
		return nil, fmt.Errorf("get portfolio item: %w", err)
	}
	return item, nil
}

type portfolioRowScanner interface {
	Scan(dest ...interface{}) error
}

// PublicProfileSlug is a lightweight (slug, updated_at) row for the sitemap.
type PublicProfileSlug struct {
	Slug      string
	UpdatedAt time.Time
}

// ListEnabledSlugs returns the public_slug of every enabled public profile
// whose owner account is active (for the dynamic sitemap). Ordered by update.
func (r *PublicProfileRepo) ListEnabledSlugs(ctx context.Context) ([]PublicProfileSlug, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.public_slug, COALESCE(opp.updated_at, u.updated_at) AS updated_at
		FROM organizer_public_profiles opp
		JOIN users u ON u.id = opp.user_id
		WHERE opp.is_enabled = true
		  AND u.public_slug IS NOT NULL AND u.public_slug <> ''
		  AND COALESCE(u.account_status, 'active') = 'active'
		  AND u.deleted_at IS NULL
		ORDER BY updated_at DESC
		LIMIT $1`, GetAllSafetyLimit)
	if err != nil {
		return nil, fmt.Errorf("list enabled public slugs: %w", err)
	}
	defer rows.Close()

	var out []PublicProfileSlug
	for rows.Next() {
		var s PublicProfileSlug
		if err := rows.Scan(&s.Slug, &s.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan public slug: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func scanPortfolioItem(row portfolioRowScanner) (*models.OrganizerPublicPortfolioItem, error) {
	var item models.OrganizerPublicPortfolioItem
	var eventDate *string
	if err := row.Scan(
		&item.ID, &item.UserID, &item.EventID, &item.Title, &eventDate,
		&item.PhotoURL, &item.ThumbnailURL, &item.SortOrder, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	item.EventDate = eventDate
	return &item, nil
}

func nullStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
