package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// insertProductWithFlag inserts a product with explicit is_active and
// show_on_public_profile values, bypassing the repo Create (which leaves the
// public flag at its DB default of false).
func insertProductWithFlag(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string, basePrice float64, active, public bool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO products (user_id, name, category, base_price, is_active, show_on_public_profile)
		VALUES ($1, $2, 'main', $3, $4, $5)
	`, userID, name, basePrice, active, public)
	if err != nil {
		t.Fatalf("seed product %q: %v", name, err)
	}
}

func TestProductRepo_ListPublicProfileServices(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "public.products@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	// 2 public + active (should appear), 1 public but inactive (excluded), 1 active but private (excluded).
	insertProductWithFlag(t, pool, userID, "Alpha Public", 100, true, true)
	insertProductWithFlag(t, pool, userID, "Beta Public", 200, true, true)
	insertProductWithFlag(t, pool, userID, "Gamma Inactive", 300, false, true)
	insertProductWithFlag(t, pool, userID, "Delta Private", 400, true, false)

	got, err := repo.ListPublicProfileServices(ctx, userID)
	if err != nil {
		t.Fatalf("ListPublicProfileServices() error = %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2 (only active+public); got %+v", len(got), got)
	}
	// Ordered by name.
	if got[0].Name != "Alpha Public" || got[1].Name != "Beta Public" {
		t.Fatalf("order = [%s, %s], want [Alpha Public, Beta Public]", got[0].Name, got[1].Name)
	}
	// Each returned product must carry the flag scanned from DB (true here).
	for _, p := range got {
		if !p.ShowOnPublicProfile {
			t.Errorf("product %q ShowOnPublicProfile = false, want true", p.Name)
		}
	}
}

func TestProductRepo_ListPublicProfileServices_Empty(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "empty.public@test.dev")
	repo := NewProductRepo(pool)

	got, err := repo.ListPublicProfileServices(context.Background(), userID)
	if err != nil {
		t.Fatalf("ListPublicProfileServices() error = %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("len = %d, want 0", len(got))
	}
}

func TestProductRepo_GetByID_ScansShowOnPublicProfileFlag(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "flag.scan@test.dev")
	repo := NewProductRepo(pool)

	insertProductWithFlag(t, pool, userID, "Flagged", 150, true, true)
	// Fetch via GetAll (returns all for the user) and confirm the flag is scanned.
	all, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(all) != 1 || all[0].Name != "Flagged" {
		t.Fatalf("GetAll() = %+v, want one Flagged", all)
	}
	if !all[0].ShowOnPublicProfile {
		t.Errorf("GetAll() ShowOnPublicProfile = false, want true (must be scanned)")
	}
}
