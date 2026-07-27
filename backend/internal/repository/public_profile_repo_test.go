package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
)

// isNotFound reports whether err is (or wraps) pgx.ErrNoRows.
func isNotFound(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

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
