package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
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

// MaxPublicPackages is the hard cap for curated packages per organizer.
const MaxPublicPackages = 6

// MaxPublicFaqItems is the hard cap for FAQ entries per organizer.
const MaxPublicFaqItems = 12

// ErrPublicProfileNotFound is returned by GetByUserID when the organizer has
// no profile row yet. Callers map this to a 404 on public endpoints.
var ErrPublicProfileNotFound = fmt.Errorf("public profile not found")

// ErrPortfolioItemNotFound is returned when a portfolio item is missing or not owned.
var ErrPortfolioItemNotFound = fmt.Errorf("portfolio item not found")

// ErrPortfolioFull is returned when create would exceed MaxPublicPortfolioItems.
var ErrPortfolioFull = fmt.Errorf("portfolio max items reached")

// ErrPortfolioSortTaken is returned when (user_id, sort_order) is already used.
var ErrPortfolioSortTaken = fmt.Errorf("portfolio sort_order already taken")

// ErrPackageNotFound is returned when a package is missing or not owned.
var ErrPackageNotFound = fmt.Errorf("package not found")

// ErrPackagesFull is returned when create would exceed MaxPublicPackages.
var ErrPackagesFull = fmt.Errorf("packages max items reached")

// ErrFaqItemNotFound is returned when an FAQ item is missing or not owned.
var ErrFaqItemNotFound = fmt.Errorf("faq item not found")

// ErrFaqFull is returned when create would exceed MaxPublicFaqItems.
var ErrFaqFull = fmt.Errorf("faq max items reached")

// GetByUserID loads the organizer public-profile config. Returns
// ErrPublicProfileNotFound (wrapping pgx.ErrNoRows) when no row exists.
func (r *PublicProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km,
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
			about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
		ON CONFLICT (user_id) DO UPDATE SET
			is_enabled       = EXCLUDED.is_enabled,
			headline         = EXCLUDED.headline,
			contact_type     = EXCLUDED.contact_type,
			contact_value    = EXCLUDED.contact_value,
			city             = EXCLUDED.city,
			region           = EXCLUDED.region,
			country          = EXCLUDED.country,
			latitude         = EXCLUDED.latitude,
			longitude        = EXCLUDED.longitude,
			show_prices      = EXCLUDED.show_prices,
			show_services    = EXCLUDED.show_services,
			show_reviews     = EXCLUDED.show_reviews,
			show_portfolio   = EXCLUDED.show_portfolio,
			show_contact     = EXCLUDED.show_contact,
			socials          = EXCLUDED.socials,
			about            = EXCLUDED.about,
			service_areas    = EXCLUDED.service_areas,
			min_guests       = EXCLUDED.min_guests,
			max_guests       = EXCLUDED.max_guests,
			event_types      = EXCLUDED.event_types,
			response_time    = EXCLUDED.response_time,
			languages        = EXCLUDED.languages,
			show_packages    = EXCLUDED.show_packages,
			show_faq         = EXCLUDED.show_faq,
			show_policies    = EXCLUDED.show_policies,
			service_radius_km = EXCLUDED.service_radius_km,
			updated_at       = NOW()
		RETURNING user_id, is_enabled, headline, contact_type, contact_value,
			city, region, country, latitude, longitude,
			show_prices, show_services, show_reviews, show_portfolio, show_contact,
			socials, about, service_areas, min_guests, max_guests, event_types, response_time, languages,
			show_packages, show_faq, show_policies, service_radius_km,
			created_at, updated_at`,
		p.UserID, p.IsEnabled, p.Headline, p.ContactType, p.ContactValue,
		p.City, p.Region, p.Country, p.Latitude, p.Longitude,
		p.ShowPrices, p.ShowServices, p.ShowReviews, p.ShowPortfolio, p.ShowContact, socials,
		p.About, serviceAreas, p.MinGuests, p.MaxGuests, eventTypes, p.ResponseTime, languages,
		p.ShowPackages, p.ShowFaq, p.ShowPolicies, p.ServiceRadiusKm,
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
		&p.ShowPackages, &p.ShowFaq, &p.ShowPolicies, &p.ServiceRadiusKm,
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

// ListEnabledSlugs returns the public_slug of every *directory-publicable*
// profile (same criteria as SearchPublicProfiles) for the dynamic sitemap.
// Incomplete enabled profiles remain reachable via /u/:slug but are not
// advertised to crawlers.
func (r *PublicProfileRepo) ListEnabledSlugs(ctx context.Context) ([]PublicProfileSlug, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.public_slug, COALESCE(opp.updated_at, u.updated_at) AS updated_at
		FROM organizer_public_profiles opp
		JOIN users u ON u.id = opp.user_id
		WHERE opp.is_enabled = true
		  AND u.public_slug IS NOT NULL AND u.public_slug <> ''
		  AND COALESCE(u.account_status, 'active') = 'active'
		  AND u.deleted_at IS NULL
		  AND u.cover_url IS NOT NULL AND u.cover_url <> ''
		  AND ( (opp.headline IS NOT NULL AND opp.headline <> '')
		        OR (opp.about IS NOT NULL AND opp.about <> '') )
		  AND opp.city IS NOT NULL AND opp.city <> ''
		  AND opp.country IS NOT NULL AND opp.country <> ''
		  AND EXISTS (
		    SELECT 1 FROM products p
		    WHERE p.user_id = u.id AND p.is_active = true AND p.show_on_public_profile = true
		  )
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

// SearchPublicProfilesFilters controls the directory search (#1116 / #1128).
// All fields optional; empty filters return all publicable organizers.
type SearchPublicProfilesFilters struct {
	City      string   // case-insensitive partial (ILIKE)
	Country   string   // case-insensitive exact
	EventType string   // membership in opp.event_types[]
	Query     string   // case-insensitive partial across name/headline/about/city
	SortBy    string   // "relevance" (default) | "rating" | "recent" | "distance"
	Order     string   // "desc" (default) | "asc"
	Lat       *float64 // visitor latitude for bounding-box geo filter + distance sort (#1127)
	Lng       *float64 // visitor longitude
	RadiusKm  *float64 // bounding-box radius (default 50 if Lat/Lng present but RadiusKm nil)
	// #1128 advanced filters
	MinBudget       *float64 // any public package/product price >= min
	MaxBudget       *float64 // any public package/product price <= max
	ServiceCategory string   // product category (ILIKE partial); public active products only
	AvailableOn     string   // YYYY-MM-DD — exclude organizers with unavailable_dates covering that day
	Limit           int
	Offset          int
}

// SearchPublicProfiles returns a paginated slice of publicable organizer cards
// (#1116 directory). Publicability criteria (cover image, headline/about, city+
// country, ≥1 visible service) are enforced in SQL via EXISTS subquery, not in
// Go — so we never load rows we'd discard. Plan-aware ranking (Business first)
// and review aggregates (visibility='public') are computed in the same query.
//
// See openspec/changes/add-organizers-search/design.md (D3, D4, D5, D6).
func (r *PublicProfileRepo) SearchPublicProfiles(ctx context.Context, f SearchPublicProfilesFilters) ([]models.PublicOrganizerCard, int, error) {
	if f.Limit <= 0 || f.Limit > GetAllSafetyLimit {
		f.Limit = 20
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	// Build WHERE clause + args for the publicability + visitor filters.
	// Cover is required (PRD §4.4); logo alone is not enough for the directory.
	where := `
		WHERE opp.is_enabled = true
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
		  )`
	args := []any{}
	n := 1
	if f.City != "" {
		where += fmt.Sprintf(" AND opp.city ILIKE $%d", n)
		args = append(args, "%"+f.City+"%")
		n++
	}
	if f.Country != "" {
		where += fmt.Sprintf(" AND opp.country ILIKE $%d", n)
		args = append(args, f.Country)
		n++
	}
	if f.EventType != "" {
		where += fmt.Sprintf(" AND $%d = ANY(COALESCE(opp.event_types, '{}'::text[]))", n)
		args = append(args, f.EventType)
		n++
	}
	if f.Query != "" {
		where += fmt.Sprintf(` AND (
			u.business_name ILIKE $%d
			OR opp.headline ILIKE $%d
			OR opp.about ILIKE $%d
			OR opp.city ILIKE $%d)`, n, n, n, n)
		args = append(args, "%"+f.Query+"%")
		n++
	}

	// Budget (#1128): organizer has at least one public price (package from_price
	// or product base_price) within [min, max]. No priced offers → excluded.
	if f.MinBudget != nil || f.MaxBudget != nil {
		priceSub := `
			SELECT from_price AS price
			FROM organizer_public_packages pkg
			WHERE pkg.user_id = u.id AND pkg.from_price IS NOT NULL
			UNION ALL
			SELECT p.base_price AS price
			FROM products p
			WHERE p.user_id = u.id AND p.is_active = true
			  AND p.show_on_public_profile = true AND p.base_price > 0`
		budgetClause := " AND EXISTS (SELECT 1 FROM (" + priceSub + ") priced WHERE 1=1"
		if f.MinBudget != nil {
			budgetClause += fmt.Sprintf(" AND priced.price >= $%d", n)
			args = append(args, *f.MinBudget)
			n++
		}
		if f.MaxBudget != nil {
			budgetClause += fmt.Sprintf(" AND priced.price <= $%d", n)
			args = append(args, *f.MaxBudget)
			n++
		}
		budgetClause += ")"
		where += budgetClause
	}

	// Service category (#1128): active public product with matching category.
	if cat := strings.TrimSpace(f.ServiceCategory); cat != "" {
		where += fmt.Sprintf(` AND EXISTS (
			SELECT 1 FROM products p
			WHERE p.user_id = u.id AND p.is_active = true AND p.show_on_public_profile = true
			  AND p.category ILIKE $%d
		)`, n)
		args = append(args, "%"+cat+"%")
		n++
	}

	// Availability (#1128): no full-day (or multi-day) block covering available_on.
	if day := strings.TrimSpace(f.AvailableOn); day != "" {
		where += fmt.Sprintf(` AND NOT EXISTS (
			SELECT 1 FROM unavailable_dates ud
			WHERE ud.user_id = u.id
			  AND ud.start_date <= $%d::date
			  AND ud.end_date >= $%d::date
		)`, n, n)
		args = append(args, day)
		n++
	}

	// Bounding-box geo filter (#1127 D4). Computa un rectángulo aproximado
	// alrededor del visitante: 1° lat ≈ 111km, 1° lng ≈ 111*cos(lat) km.
	// Sin PostGIS — simple WHERE BETWEEN, soportado por idx_public_profiles_geo.
	visitorLat := 0.0
	visitorLng := 0.0
	if f.Lat != nil && f.Lng != nil {
		visitorLat = *f.Lat
		visitorLng = *f.Lng
		radiusKm := 50.0
		if f.RadiusKm != nil && *f.RadiusKm > 0 {
			radiusKm = *f.RadiusKm
		}
		latDelta := radiusKm / 111.0
		lngDelta := radiusKm / (111.0 * cosDeg(visitorLat))
		where += fmt.Sprintf(` AND opp.latitude IS NOT NULL AND opp.longitude IS NOT NULL
			AND opp.latitude BETWEEN $%d AND $%d
			AND opp.longitude BETWEEN $%d AND $%d`, n, n+1, n+2, n+3)
		args = append(args, visitorLat-latDelta, visitorLat+latDelta, visitorLng-lngDelta, visitorLng+lngDelta)
		n += 4
		// Honor provider service_radius_km when set: approx km distance must be
		// within the organizer's declared coverage (null = unlimited coverage).
		// Uses the same equirectangular approximation as distance sort.
		where += fmt.Sprintf(` AND (
			opp.service_radius_km IS NULL
			OR (
				POWER((opp.latitude - $%d) * 111.0, 2)
				+ POWER((opp.longitude - $%d) * 111.0 * $%d, 2)
			) <= POWER(opp.service_radius_km, 2)
		)`, n, n+1, n+2)
		args = append(args, visitorLat, visitorLng, cosDeg(visitorLat))
		n += 3
	}

	// Ranking. Default relevance = plan-featured → rating → reviews → recency.
	// sort=rating/recent/distance override the order column.
	orderClause := "ORDER BY (u.plan = 'business') DESC NULLS LAST, avg_rating DESC NULLS LAST, review_count DESC NULLS LAST, u.updated_at DESC"
	switch f.SortBy {
	case "rating":
		orderClause = "ORDER BY avg_rating DESC NULLS LAST, review_count DESC NULLS LAST"
		if f.Order == "asc" {
			orderClause = "ORDER BY avg_rating ASC NULLS LAST, review_count ASC NULLS LAST"
		}
	case "recent":
		orderClause = "ORDER BY u.updated_at DESC"
		if f.Order == "asc" {
			orderClause = "ORDER BY u.updated_at ASC"
		}
	case "distance":
		// Euclidean distance squared (sufficient for ranking; haversine is overkill).
		// Requires visitor coords; if absent, falls back to relevance.
		if f.Lat != nil && f.Lng != nil {
			orderClause = fmt.Sprintf(
				"ORDER BY POWER(opp.latitude - %f, 2) + POWER(opp.longitude - %f, 2) ASC NULLS LAST",
				visitorLat, visitorLng)
		}
	}

	// Count first (cheap, no joins to reviews).
	var total int
	countQuery := `SELECT count(*) FROM organizer_public_profiles opp JOIN users u ON u.id = opp.user_id ` + where
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count public organizers: %w", err)
	}

	listQuery := fmt.Sprintf(`
		SELECT
			u.public_slug,
			COALESCE(u.business_name, ''),
			opp.headline,
			opp.city,
			opp.country,
			u.cover_url,
			u.logo_url,
			COALESCE(opp.event_types, '{}'::text[]),
			-- Free plan gating: do not expose rating/reviews social proof (spec).
			-- Pro+ (plan in pro/business/premium) gets aggregates; basic gets NULL.
			CASE WHEN u.plan IN ('pro', 'business', 'premium') THEN AVG(er.rating)::float8 ELSE NULL END AS avg_rating,
			CASE WHEN u.plan IN ('pro', 'business', 'premium') THEN COUNT(er.id)::int ELSE 0 END AS review_count,
			(u.plan = 'business') AS is_featured,
			opp.response_time
		FROM organizer_public_profiles opp
		JOIN users u ON u.id = opp.user_id
		LEFT JOIN event_reviews er ON er.user_id = u.id AND er.visibility = 'public'
		%s
		GROUP BY u.public_slug, u.business_name, opp.headline, opp.city, opp.country,
		         u.cover_url, u.logo_url, opp.event_types, u.plan, opp.response_time, u.updated_at,
		         opp.latitude, opp.longitude
		%s
		LIMIT $%d OFFSET $%d`, where, orderClause, n, n+1)
	args = append(args, f.Limit, f.Offset)

	rows, err := r.pool.Query(ctx, listQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("search public organizers: %w", err)
	}
	defer rows.Close()

	out := make([]models.PublicOrganizerCard, 0)
	for rows.Next() {
		var c models.PublicOrganizerCard
		var avgRating *float64
		var reviewCount int
		if err := rows.Scan(
			&c.Slug, &c.BusinessName, &c.Headline, &c.City, &c.Country,
			&c.CoverURL, &c.LogoURL, &c.PrimaryEventTypes,
			&avgRating, &reviewCount, &c.IsFeatured, &c.ResponseTime,
		); err != nil {
			return nil, 0, fmt.Errorf("scan public organizer card: %w", err)
		}
		// Aggregates are NULL for Free (basic) — see CASE WHEN in the SELECT.
		// Populate the card only when the DB returned a real rating.
		if avgRating != nil {
			c.AverageRating = avgRating
			c.ReviewsCount = &reviewCount
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate public organizer cards: %w", err)
	}
	return out, total, nil
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

// -----------------------------------------------------------------------------
// Packages (organizer_public_packages)
// -----------------------------------------------------------------------------

// ListPackagesByUserID returns curated packages for the organizer ordered by
// sort_order. Caps at MaxPublicPackages for safety even if data is inconsistent.
func (r *PublicProfileRepo) ListPackagesByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPackage, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, title, description, from_price, inclusions, image_url,
			is_featured, sort_order, created_at, updated_at
		FROM organizer_public_packages
		WHERE user_id = $1
		ORDER BY sort_order ASC
		LIMIT $2`, userID, MaxPublicPackages)
	if err != nil {
		return nil, fmt.Errorf("list packages: %w", err)
	}
	defer rows.Close()

	items := make([]models.OrganizerPublicPackage, 0)
	for rows.Next() {
		item, err := scanPackage(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list packages rows: %w", err)
	}
	return items, nil
}

// CountPackagesByUserID returns how many packages the organizer has.
func (r *PublicProfileRepo) CountPackagesByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM organizer_public_packages WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count packages: %w", err)
	}
	return n, nil
}

// CreatePackage inserts a package row. Enforces the MaxPublicPackages cap.
func (r *PublicProfileRepo) CreatePackage(ctx context.Context, pkg *models.OrganizerPublicPackage) error {
	count, err := r.CountPackagesByUserID(ctx, pkg.UserID)
	if err != nil {
		return err
	}
	if count >= MaxPublicPackages {
		return ErrPackagesFull
	}

	inclusions, err := json.Marshal(pkg.Inclusions)
	if err != nil {
		return fmt.Errorf("encode inclusions: %w", err)
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO organizer_public_packages
			(user_id, title, description, from_price, inclusions, image_url, is_featured, sort_order)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, title, description, from_price, inclusions, image_url,
			is_featured, sort_order, created_at, updated_at`,
		pkg.UserID, pkg.Title, pkg.Description, pkg.FromPrice, inclusions,
		pkg.ImageURL, pkg.IsFeatured, pkg.SortOrder,
	)
	stored, err := scanPackage(row)
	if err != nil {
		return fmt.Errorf("create package: %w", err)
	}
	*pkg = *stored
	return nil
}

// UpdatePackage updates fields of an owned package.
func (r *PublicProfileRepo) UpdatePackage(ctx context.Context, pkg *models.OrganizerPublicPackage) error {
	inclusions, err := json.Marshal(pkg.Inclusions)
	if err != nil {
		return fmt.Errorf("encode inclusions: %w", err)
	}
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_packages SET
			title = $3,
			description = $4,
			from_price = $5,
			inclusions = $6,
			image_url = $7,
			is_featured = $8,
			sort_order = $9,
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, title, description, from_price, inclusions, image_url,
			is_featured, sort_order, created_at, updated_at`,
		pkg.ID, pkg.UserID, pkg.Title, pkg.Description, pkg.FromPrice, inclusions,
		pkg.ImageURL, pkg.IsFeatured, pkg.SortOrder,
	)
	stored, err := scanPackage(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrPackageNotFound
		}
		return fmt.Errorf("update package: %w", err)
	}
	*pkg = *stored
	return nil
}

// DeletePackage removes an owned package.
func (r *PublicProfileRepo) DeletePackage(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM organizer_public_packages WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete package: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrPackageNotFound
	}
	return nil
}

// GetPackage loads one owned package.
func (r *PublicProfileRepo) GetPackage(ctx context.Context, userID, id uuid.UUID) (*models.OrganizerPublicPackage, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, title, description, from_price, inclusions, image_url,
			is_featured, sort_order, created_at, updated_at
		FROM organizer_public_packages
		WHERE id = $1 AND user_id = $2`, id, userID)
	pkg, err := scanPackage(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrPackageNotFound
		}
		return nil, fmt.Errorf("get package: %w", err)
	}
	return pkg, nil
}

type packageRowScanner interface {
	Scan(dest ...interface{}) error
}

// scanPackage decodes a package row, including the JSONB inclusions field, into
// a fully-populated *models.OrganizerPublicPackage.
func scanPackage(row packageRowScanner) (*models.OrganizerPublicPackage, error) {
	var pkg models.OrganizerPublicPackage
	var inclusions []byte
	if err := row.Scan(
		&pkg.ID, &pkg.UserID, &pkg.Title, &pkg.Description, &pkg.FromPrice, &inclusions,
		&pkg.ImageURL, &pkg.IsFeatured, &pkg.SortOrder, &pkg.CreatedAt, &pkg.UpdatedAt,
	); err != nil {
		return nil, err
	}
	if len(inclusions) > 0 && string(inclusions) != "null" {
		if err := json.Unmarshal(inclusions, &pkg.Inclusions); err != nil {
			return nil, fmt.Errorf("decode inclusions: %w", err)
		}
	}
	return &pkg, nil
}

// -----------------------------------------------------------------------------
// FAQ (organizer_public_faq)
// -----------------------------------------------------------------------------

// ListFaqByUserID returns FAQ entries for the organizer ordered by sort_order.
// Caps at MaxPublicFaqItems for safety even if data is inconsistent.
func (r *PublicProfileRepo) ListFaqByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicFaqItem, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, question, answer, sort_order, created_at, updated_at
		FROM organizer_public_faq
		WHERE user_id = $1
		ORDER BY sort_order ASC
		LIMIT $2`, userID, MaxPublicFaqItems)
	if err != nil {
		return nil, fmt.Errorf("list faq: %w", err)
	}
	defer rows.Close()

	items := make([]models.OrganizerPublicFaqItem, 0)
	for rows.Next() {
		item, err := scanFaqItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list faq rows: %w", err)
	}
	return items, nil
}

// CountFaqByUserID returns how many FAQ entries the organizer has.
func (r *PublicProfileRepo) CountFaqByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM organizer_public_faq WHERE user_id = $1`, userID).Scan(&n)
	if err != nil {
		return 0, fmt.Errorf("count faq: %w", err)
	}
	return n, nil
}

// CreateFaqItem inserts an FAQ row. Enforces the MaxPublicFaqItems cap.
func (r *PublicProfileRepo) CreateFaqItem(ctx context.Context, item *models.OrganizerPublicFaqItem) error {
	count, err := r.CountFaqByUserID(ctx, item.UserID)
	if err != nil {
		return err
	}
	if count >= MaxPublicFaqItems {
		return ErrFaqFull
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO organizer_public_faq
			(user_id, question, answer, sort_order)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, question, answer, sort_order, created_at, updated_at`,
		item.UserID, item.Question, item.Answer, item.SortOrder,
	)
	stored, err := scanFaqItem(row)
	if err != nil {
		return fmt.Errorf("create faq item: %w", err)
	}
	*item = *stored
	return nil
}

// UpdateFaqItem updates fields of an owned FAQ entry.
func (r *PublicProfileRepo) UpdateFaqItem(ctx context.Context, item *models.OrganizerPublicFaqItem) error {
	row := r.pool.QueryRow(ctx, `
		UPDATE organizer_public_faq SET
			question = $3,
			answer = $4,
			sort_order = $5,
			updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, question, answer, sort_order, created_at, updated_at`,
		item.ID, item.UserID, item.Question, item.Answer, item.SortOrder,
	)
	stored, err := scanFaqItem(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrFaqItemNotFound
		}
		return fmt.Errorf("update faq item: %w", err)
	}
	*item = *stored
	return nil
}

// DeleteFaqItem removes an owned FAQ entry.
func (r *PublicProfileRepo) DeleteFaqItem(ctx context.Context, userID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		DELETE FROM organizer_public_faq WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete faq item: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrFaqItemNotFound
	}
	return nil
}

// GetFaqItem loads one owned FAQ entry.
func (r *PublicProfileRepo) GetFaqItem(ctx context.Context, userID, id uuid.UUID) (*models.OrganizerPublicFaqItem, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, question, answer, sort_order, created_at, updated_at
		FROM organizer_public_faq
		WHERE id = $1 AND user_id = $2`, id, userID)
	item, err := scanFaqItem(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrFaqItemNotFound
		}
		return nil, fmt.Errorf("get faq item: %w", err)
	}
	return item, nil
}

type faqRowScanner interface {
	Scan(dest ...interface{}) error
}

// scanFaqItem decodes an FAQ row into a *models.OrganizerPublicFaqItem.
func scanFaqItem(row faqRowScanner) (*models.OrganizerPublicFaqItem, error) {
	var item models.OrganizerPublicFaqItem
	if err := row.Scan(
		&item.ID, &item.UserID, &item.Question, &item.Answer,
		&item.SortOrder, &item.CreatedAt, &item.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &item, nil
}

// cosDeg returns the cosine of an angle given in degrees (used for bounding-box
// longitude delta computation: 1° lng ≈ 111*cos(lat) km).
func cosDeg(deg float64) float64 {
	return math.Cos(deg * math.Pi / 180.0)
}
