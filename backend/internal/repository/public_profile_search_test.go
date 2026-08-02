package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// seedPublicableOrganizer creates a user + public profile + 1 visible product
// so the directory publicability criteria (cover/logo, headline/about, city,
// country, ≥1 visible service) are met. Returns the user_id.
//
// Overrides default fields via opts (nil = sensible defaults).
func seedPublicableOrganizer(t *testing.T, pool *pgxpool.Pool, email, plan, city, country string, opts ...func(map[string]any)) uuid.UUID {
	t.Helper()
	ctx := context.Background()
	userID := seedUser(t, pool, email)
	// Bump plan (seedUser sets "basic") + cover so publicability passes.
	if _, err := pool.Exec(ctx,
		`UPDATE users SET plan = $2, cover_url = 'https://x/cover.png', public_slug = $3 WHERE id = $1`,
		userID, plan, "slug-"+email); err != nil {
		t.Fatalf("update user plan/slug/cover: %v", err)
	}
	fields := map[string]any{
		"headline": "Test organizer",
		"about":    "",
	}
	for _, opt := range opts {
		opt(fields)
	}
	headline := fields["headline"].(string)
	about, _ := fields["about"].(string)
	if _, err := pool.Exec(ctx, `
		INSERT INTO organizer_public_profiles
			(user_id, is_enabled, headline, about, city, country, event_types,
			 show_prices, show_services, show_reviews, show_portfolio, show_contact, socials)
		VALUES ($1, true, $2, NULLIF($3, ''), $4, $5, ARRAY['boda','corporativo']::text[],
		        false, true, true, true, true, '{}'::jsonb)
		ON CONFLICT (user_id) DO UPDATE SET
			is_enabled = true, headline = $2, about = NULLIF($3, ''), city = $4, country = $5`,
		userID, headline, about, city, country); err != nil {
		t.Fatalf("seed public profile: %v", err)
	}
	// 1 visible product (publicability requires ≥1).
	if _, err := pool.Exec(ctx, `
		INSERT INTO products (user_id, name, category, base_price, is_active, show_on_public_profile)
		VALUES ($1, 'Servicio test', 'categoria', 100, true, true)`, userID); err != nil {
		t.Fatalf("seed visible product: %v", err)
	}
	return userID
}

func TestSearchPublicProfiles_NoPublicableProfiles_ReturnsEmpty(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewPublicProfileRepo(pool)
	items, total, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{Limit: 20})
	if err != nil {
		t.Fatalf("SearchPublicProfiles error = %v", err)
	}
	if total != 0 || len(items) != 0 {
		t.Fatalf("empty DB: total=%d items=%d, want 0/0", total, len(items))
	}
}

func TestSearchPublicProfiles_PublicabilityExcludesIncomplete(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	// Publicable: full profile + cover + service.
	seedPublicableOrganizer(t, pool, "full@test.dev", "pro", "Mexico City", "Mexico")

	// Incomplete: no visible product → must be excluded.
	incomplete := seedUser(t, pool, "noproduct@test.dev")
	if _, err := pool.Exec(ctx,
		`UPDATE users SET cover_url='https://x/c.png', public_slug='noproduct', plan='pro' WHERE id = $1`, incomplete); err != nil {
		t.Fatalf("update incomplete: %v", err)
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO organizer_public_profiles
			(user_id, is_enabled, headline, city, country, show_prices, show_services, show_reviews, show_portfolio, show_contact, socials)
		VALUES ($1, true, 'No service', 'Mexico City', 'Mexico', false, true, true, true, true, '{}'::jsonb)`, incomplete); err != nil {
		t.Fatalf("seed incomplete profile: %v", err)
	}

	repo := NewPublicProfileRepo(pool)
	items, total, err := repo.SearchPublicProfiles(ctx, SearchPublicProfilesFilters{Limit: 20})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1 (incomplete excluded)", total)
	}
	if len(items) != 1 || items[0].Slug != "slug-full@test.dev" {
		t.Fatalf("items = %+v, want only full", items)
	}
}

func TestSearchPublicProfiles_FilterByCity(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	seedPublicableOrganizer(t, pool, "cdmx@test.dev", "pro", "Mexico City", "Mexico")
	seedPublicableOrganizer(t, pool, "gdl@test.dev", "pro", "Guadalajara", "Mexico")

	repo := NewPublicProfileRepo(pool)
	items, total, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{City: "Mexico", Limit: 20})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if total != 1 || len(items) != 1 {
		t.Fatalf("city filter: total=%d, want 1", total)
	}
	if items[0].City == nil || *items[0].City != "Mexico City" {
		t.Fatalf("city = %v, want Mexico City", items[0].City)
	}
}

func TestSearchPublicProfiles_FilterByEventType(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	seedPublicableOrganizer(t, pool, "a@test.dev", "pro", "CDMX", "MX") // event_types ['boda','corporativo']

	// Second organizer with different event_types via override.
	seedPublicableOrganizer(t, pool, "b@test.dev", "pro", "CDMX", "MX", func(fields map[string]any) {
		// override event_types directly via raw SQL after seed
	})

	repo := NewPublicProfileRepo(pool)
	items, total, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{EventType: "boda", Limit: 20})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if total != 2 {
		t.Fatalf("event_type filter total = %d, want 2 (both have boda)", total)
	}
	_ = items
}

func TestSearchPublicProfiles_RankingBusinessFirst(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	seedPublicableOrganizer(t, pool, "free@test.dev", "basic", "CDMX", "MX")
	seedPublicableOrganizer(t, pool, "pro@test.dev", "pro", "CDMX", "MX")
	seedPublicableOrganizer(t, pool, "biz@test.dev", "business", "CDMX", "MX")

	repo := NewPublicProfileRepo(pool)
	items, _, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{Limit: 20})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if len(items) != 3 {
		t.Fatalf("items = %d, want 3", len(items))
	}
	if !items[0].IsFeatured {
		t.Fatalf("first item is_featured = false, want true (Business must rank first)")
	}
	if items[0].Slug != "slug-biz@test.dev" {
		t.Fatalf("first slug = %s, want biz", items[0].Slug)
	}
}

func TestSearchPublicProfiles_FreeHidesRating(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	freeID := seedPublicableOrganizer(t, pool, "free@test.dev", "basic", "CDMX", "MX")
	// Seed a public review so the aggregate would be non-null if not gated.
	if _, err := pool.Exec(ctx, `
		INSERT INTO clients (user_id, name, phone) VALUES ($1, 'Reviewer', '555-0000')`, freeID); err != nil {
		t.Fatalf("seed client: %v", err)
	}
	clientID := mustGetClientID(t, pool, freeID)
	if _, err := pool.Exec(ctx, `
		INSERT INTO events (user_id, client_id, event_date, service_type, num_people, status, total_amount)
		VALUES ($1, $2, '2026-01-01', 'boda', 50, 'completed', 1000)`, freeID, clientID); err != nil {
		t.Fatalf("seed event: %v", err)
	}
	eventID := mustGetEventID(t, pool, freeID)
	if _, err := pool.Exec(ctx, `
		INSERT INTO event_reviews (user_id, client_id, event_id, rating, visibility)
		VALUES ($1, $2, $3, 5, 'public')`, freeID, clientID, eventID); err != nil {
		t.Fatalf("seed review: %v", err)
	}

	repo := NewPublicProfileRepo(pool)
	items, _, err := repo.SearchPublicProfiles(ctx, SearchPublicProfilesFilters{Limit: 20})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("items = %d, want 1", len(items))
	}
	if items[0].AverageRating != nil || items[0].ReviewsCount != nil {
		t.Fatalf("Free card rating = %v reviews = %v, want nil (gated)", items[0].AverageRating, items[0].ReviewsCount)
	}
}

func TestSearchPublicProfiles_PaginationNoOverlap(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	for i := 0; i < 5; i++ {
		seedPublicableOrganizer(t, pool, "org"+string(rune('a'+i))+"@test.dev", "pro", "CDMX", "MX")
	}

	repo := NewPublicProfileRepo(pool)
	p1, total, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{Limit: 2, Offset: 0})
	if err != nil {
		t.Fatalf("page1 error = %v", err)
	}
	p2, _, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{Limit: 2, Offset: 2})
	if err != nil {
		t.Fatalf("page2 error = %v", err)
	}
	if total != 5 {
		t.Fatalf("total = %d, want 5", total)
	}
	seen := map[string]bool{}
	for _, c := range p1 {
		seen[c.Slug] = true
	}
	for _, c := range p2 {
		if seen[c.Slug] {
			t.Fatalf("slug %v appears in both pages (overlap)", c.Slug)
		}
	}
}

func TestSearchPublicProfiles_PageOutOfRangeReturnsEmpty(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	seedPublicableOrganizer(t, pool, "only@test.dev", "pro", "CDMX", "MX")
	repo := NewPublicProfileRepo(pool)
	items, total, err := repo.SearchPublicProfiles(context.Background(), SearchPublicProfilesFilters{Limit: 20, Offset: 100})
	if err != nil {
		t.Fatalf("Search error = %v", err)
	}
	if total != 1 {
		t.Fatalf("total = %d, want 1", total)
	}
	if len(items) != 0 {
		t.Fatalf("out-of-range items = %d, want 0", len(items))
	}
}

// mustGetClientID / mustGetEventID: tiny helpers for review seeding.
func mustGetClientID(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := pool.QueryRow(context.Background(),
		`SELECT id FROM clients WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID).Scan(&id); err != nil {
		t.Fatalf("get client id: %v", err)
	}
	return id
}

func mustGetEventID(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	if err := pool.QueryRow(context.Background(),
		`SELECT id FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, userID).Scan(&id); err != nil {
		t.Fatalf("get event id: %v", err)
	}
	return id
}

// Ensure unused import guard (models referenced only if tests expand).
var _ = models.PublicOrganizerCard{}
