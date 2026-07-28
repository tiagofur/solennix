package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
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

func TestProductRepo_CountPublicProfile(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "count.public@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	// Empty -> 0.
	n, err := repo.CountPublicProfile(ctx, userID)
	if err != nil {
		t.Fatalf("CountPublicProfile() error = %v", err)
	}
	if n != 0 {
		t.Errorf("empty count = %d, want 0", n)
	}

	// 2 public+active, 1 public+inactive (excluded), 1 active+private (excluded).
	insertProductWithFlag(t, pool, userID, "P1", 10, true, true)
	insertProductWithFlag(t, pool, userID, "P2", 20, true, true)
	insertProductWithFlag(t, pool, userID, "P3", 30, false, true)
	insertProductWithFlag(t, pool, userID, "P4", 40, true, false)

	n, err = repo.CountPublicProfile(ctx, userID)
	if err != nil {
		t.Fatalf("CountPublicProfile() error = %v", err)
	}
	if n != 2 {
		t.Errorf("count = %d, want 2 (only active+public)", n)
	}
}

func TestProductRepo_Create_PersistsShowOnPublicProfile(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "create.flag@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	p := &models.Product{
		UserID:               userID,
		Name:                 "Catering Premium",
		Category:             "main",
		BasePrice:            500,
		IsActive:             true,
		ShowOnPublicProfile:  true,
	}
	if err := repo.Create(ctx, p); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Read back via GetByID and confirm the flag persisted as true.
	got, err := repo.GetByID(ctx, p.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if !got.ShowOnPublicProfile {
		t.Errorf("Create() did not persist ShowOnPublicProfile=true; got false")
	}
}

func TestProductRepo_Update_TogglesShowOnPublicProfile(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "update.flag@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	// Seed via repo Create with flag=false (default).
	p := &models.Product{
		UserID:   userID,
		Name:     "Service",
		Category: "main",
		BasePrice: 100,
		IsActive: true,
	}
	if err := repo.Create(ctx, p); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Update to flag=true.
	p.ShowOnPublicProfile = true
	if err := repo.Update(ctx, p); err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	got, _ := repo.GetByID(ctx, p.ID, userID)
	if !got.ShowOnPublicProfile {
		t.Errorf("Update() did not set ShowOnPublicProfile=true")
	}

	// Update back to false.
	p.ShowOnPublicProfile = false
	if err := repo.Update(ctx, p); err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	got, _ = repo.GetByID(ctx, p.ID, userID)
	if got.ShowOnPublicProfile {
		t.Errorf("Update() did not set ShowOnPublicProfile=false")
	}
}

func TestProductRepo_ListActiveForPublicProfileSettings(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "settings.products@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	insertProductWithFlag(t, pool, userID, "Alpha", 100, true, true)
	insertProductWithFlag(t, pool, userID, "Beta", 200, true, false)
	insertProductWithFlag(t, pool, userID, "Inactive", 300, false, true)

	got, err := repo.ListActiveForPublicProfileSettings(ctx, userID)
	if err != nil {
		t.Fatalf("ListActiveForPublicProfileSettings() error = %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("len = %d, want 2 active; got %+v", len(got), got)
	}
	if got[0].Name != "Alpha" || !got[0].ShowOnPublicProfile {
		t.Errorf("got[0] = %+v, want Alpha public", got[0])
	}
	if got[1].Name != "Beta" || got[1].ShowOnPublicProfile {
		t.Errorf("got[1] = %+v, want Beta private", got[1])
	}
}

func TestProductRepo_SetPublicProfileServices(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "set.public@test.dev")
	repo := NewProductRepo(pool)
	ctx := context.Background()

	insertProductWithFlag(t, pool, userID, "A", 10, true, true)
	insertProductWithFlag(t, pool, userID, "B", 20, true, false)
	insertProductWithFlag(t, pool, userID, "C", 30, true, false)

	all, err := repo.ListActiveForPublicProfileSettings(ctx, userID)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	var bID, cID uuid.UUID
	for _, p := range all {
		if p.Name == "B" {
			bID = p.ID
		}
		if p.Name == "C" {
			cID = p.ID
		}
	}

	if err := repo.SetPublicProfileServices(ctx, userID, []uuid.UUID{bID, cID}); err != nil {
		t.Fatalf("SetPublicProfileServices() error = %v", err)
	}

	all, err = repo.ListActiveForPublicProfileSettings(ctx, userID)
	if err != nil {
		t.Fatalf("list after set: %v", err)
	}
	for _, p := range all {
		switch p.Name {
		case "A":
			if p.ShowOnPublicProfile {
				t.Errorf("A should be cleared")
			}
		case "B", "C":
			if !p.ShowOnPublicProfile {
				t.Errorf("%s should be selected", p.Name)
			}
		}
	}

	// Invalid ID rejected.
	if err := repo.SetPublicProfileServices(ctx, userID, []uuid.UUID{uuid.New()}); err == nil {
		t.Error("expected error for foreign product id")
	}
}
