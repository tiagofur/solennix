package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// isNotFound reports whether err is (or wraps) pgx.ErrNoRows.
func isNotFound(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

func strPtr(s string) *string { return &s }

// TestPublicProfileRepo_GetByUserID covers the read path used by the public
// aggregate GET. Upsert/Update arrive in PR3.
func TestPublicProfileRepo_GetByUserID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "public.profile@test.dev")
	repo := NewPublicProfileRepo(pool)
	ctx := context.Background()

	// No row yet -> ErrNoRows (mapped to a not-found error).
	_, err := repo.GetByUserID(ctx, userID)
	if err == nil {
		t.Fatalf("GetByUserID() on missing row: expected error, got nil")
	}
	if !isNotFound(err) {
		t.Fatalf("GetByUserID() missing row err = %v, want a pgx.ErrNoRows-derived error", err)
	}

	// Seed a row directly.
	headline := "Wedding caterer"
	city := "Lisbon"
	_, err = pool.Exec(ctx, `
		INSERT INTO organizer_public_profiles
			(user_id, is_enabled, headline, city, show_prices, show_services, show_reviews, show_portfolio, show_contact, socials)
		VALUES ($1, true, $2, $3, false, true, true, true, true, '{"instagram":"@alice"}'::jsonb)
	`, userID, headline, city)
	if err != nil {
		t.Fatalf("seed profile: %v", err)
	}

	got, err := repo.GetByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}
	if !got.IsEnabled {
		t.Errorf("IsEnabled = false, want true")
	}
	if got.Headline == nil || *got.Headline != headline {
		t.Errorf("Headline = %v, want %q", got.Headline, headline)
	}
	if got.City == nil || *got.City != city {
		t.Errorf("City = %v, want %q", got.City, city)
	}
	if !got.ShowReviews {
		t.Errorf("ShowReviews = false, want true")
	}
	if got.Socials == nil || got.Socials["instagram"] != "@alice" {
		t.Errorf("Socials = %v, want instagram=@alice", got.Socials)
	}
}

func TestPublicProfileRepo_GetByUserID_Disabled(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "disabled.profile@test.dev")
	repo := NewPublicProfileRepo(pool)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO organizer_public_profiles (user_id, is_enabled) VALUES ($1, false)
	`, userID)
	if err != nil {
		t.Fatalf("seed disabled profile: %v", err)
	}

	got, err := repo.GetByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUserID() error = %v", err)
	}
	if got.IsEnabled {
		t.Errorf("IsEnabled = true, want false")
	}
}

func TestPublicProfileRepo_Upsert_CreatesThenUpdates(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "upsert.profile@test.dev")
	repo := NewPublicProfileRepo(pool)
	ctx := context.Background()

	// First call: insert (no row yet).
	headline := "Wedding caterer"
	created, err := repo.Upsert(ctx, &models.OrganizerPublicProfile{
		UserID:        userID,
		IsEnabled:     true,
		Headline:      strPtr(headline),
		City:          strPtr("Lisbon"),
		ShowPrices:    false,
		ShowServices:  true,
		ShowReviews:   true,
		ShowPortfolio: true,
		ShowContact:   true,
		Socials:       map[string]string{"instagram": "@alice"},
	})
	if err != nil {
		t.Fatalf("Upsert (create) error = %v", err)
	}
	if !created.IsEnabled {
		t.Errorf("create IsEnabled = false, want true")
	}
	if created.Headline == nil || *created.Headline != headline {
		t.Errorf("create Headline = %v, want %q", created.Headline, headline)
	}
	if created.Socials == nil || created.Socials["instagram"] != "@alice" {
		t.Errorf("create Socials = %v, want instagram=@alice", created.Socials)
	}

	// Verify the row is readable via GetByUserID and matches.
	got, err := repo.GetByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUserID after create: %v", err)
	}
	if !got.IsEnabled {
		t.Errorf("GetByUserID IsEnabled = false, want true")
	}

	// Second call: update same row (toggle off, change headline).
	newHeadline := "Updated headline"
	updated, err := repo.Upsert(ctx, &models.OrganizerPublicProfile{
		UserID:        userID,
		IsEnabled:     false,
		Headline:      strPtr(newHeadline),
		ShowPrices:    true,
		ShowServices:  true,
		ShowReviews:   false,
		ShowPortfolio: false,
		ShowContact:   false,
	})
	if err != nil {
		t.Fatalf("Upsert (update) error = %v", err)
	}
	if updated.IsEnabled {
		t.Errorf("update IsEnabled = true, want false")
	}
	if updated.Headline == nil || *updated.Headline != newHeadline {
		t.Errorf("update Headline = %v, want %q", updated.Headline, newHeadline)
	}
	if !updated.ShowPrices {
		t.Errorf("update ShowPrices = false, want true")
	}
	if updated.ShowReviews {
		t.Errorf("update ShowReviews = true, want false")
	}
	// Socials cleared by omitting on update (UPSERT replaces the JSONB).
	if updated.Socials != nil && len(updated.Socials) != 0 {
		t.Errorf("update Socials = %v, want empty", updated.Socials)
	}

	// Confirm only one row exists for this user.
	got2, err := repo.GetByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetByUserID after update: %v", err)
	}
	if got2.IsEnabled {
		t.Errorf("persisted IsEnabled = true, want false")
	}
}

func TestPublicProfileRepo_Upsert_SavesExplicitValues(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "upsert.defaults@test.dev")
	repo := NewPublicProfileRepo(pool)

	// The repo stores what it is given; the handler layer is responsible for
	// merging defaults before calling Upsert. Here we verify the round-trip
	// of explicit values, including show_* toggles and socials.
	created, err := repo.Upsert(context.Background(), &models.OrganizerPublicProfile{
		UserID:        userID,
		IsEnabled:     true,
		ShowServices:  true,
		ShowReviews:   true,
		ShowPortfolio: true,
		ShowContact:   true,
	})
	if err != nil {
		t.Fatalf("Upsert error = %v", err)
	}
	if !created.ShowServices || !created.ShowReviews || !created.ShowPortfolio || !created.ShowContact {
		t.Errorf("stored: services=%v reviews=%v portfolio=%v contact=%v, want all true",
			created.ShowServices, created.ShowReviews, created.ShowPortfolio, created.ShowContact)
	}
	if created.ShowPrices {
		t.Errorf("stored ShowPrices = true, want false (we never set it)")
	}
	_ = uuid.Nil // keep uuid import used even if signature expands later
}

func TestPublicProfileRepo_PortfolioCRUD_MaxSix(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "portfolio.crud@test.dev")
	repo := NewPublicProfileRepo(pool)
	ctx := context.Background()

	// Create 6 items with sort_order 0–5.
	for i := 0; i < MaxPublicPortfolioItems; i++ {
		item := &models.OrganizerPublicPortfolioItem{
			UserID:    userID,
			Title:     "Item",
			PhotoURL:  "https://cdn.example/p.jpg",
			SortOrder: i,
		}
		if err := repo.CreatePortfolioItem(ctx, item); err != nil {
			t.Fatalf("CreatePortfolioItem(%d) error = %v", i, err)
		}
		if item.ID == uuid.Nil {
			t.Fatalf("CreatePortfolioItem(%d) did not set ID", i)
		}
	}

	count, err := repo.CountPortfolioByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("CountPortfolioByUserID error = %v", err)
	}
	if count != 6 {
		t.Fatalf("count = %d, want 6", count)
	}

	// 7th must fail with ErrPortfolioFull.
	seventh := &models.OrganizerPublicPortfolioItem{
		UserID: userID, Title: "Too many", PhotoURL: "https://x", SortOrder: 0,
	}
	if err := repo.CreatePortfolioItem(ctx, seventh); !errors.Is(err, ErrPortfolioFull) {
		t.Fatalf("7th create err = %v, want ErrPortfolioFull", err)
	}

	// List returns ≤6 ordered.
	items, err := repo.ListPortfolioByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("ListPortfolioByUserID error = %v", err)
	}
	if len(items) != 6 {
		t.Fatalf("list len = %d, want 6", len(items))
	}
	for i, it := range items {
		if it.SortOrder != i {
			t.Errorf("items[%d].SortOrder = %d, want %d", i, it.SortOrder, i)
		}
	}

	// Update + delete.
	items[0].Title = "Updated"
	if err := repo.UpdatePortfolioItem(ctx, &items[0]); err != nil {
		t.Fatalf("UpdatePortfolioItem error = %v", err)
	}
	got, err := repo.GetPortfolioItem(ctx, userID, items[0].ID)
	if err != nil {
		t.Fatalf("GetPortfolioItem error = %v", err)
	}
	if got.Title != "Updated" {
		t.Errorf("Title = %q, want Updated", got.Title)
	}
	if err := repo.DeletePortfolioItem(ctx, userID, items[0].ID); err != nil {
		t.Fatalf("DeletePortfolioItem error = %v", err)
	}
	if _, err := repo.GetPortfolioItem(ctx, userID, items[0].ID); !errors.Is(err, ErrPortfolioItemNotFound) {
		t.Fatalf("after delete Get err = %v, want ErrPortfolioItemNotFound", err)
	}
}
