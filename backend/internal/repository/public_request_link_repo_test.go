package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func randomToken(t *testing.T) string {
	t.Helper()
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return hex.EncodeToString(b)
}

func TestPublicRequestLinkRepo_CreateGetListRevoke(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "prl.create@test.dev")
	repo := NewPublicRequestLinkRepo(pool)
	ctx := context.Background()

	expires := time.Now().UTC().Add(48 * time.Hour)
	maxUses := 2
	link := &models.PublicRequestLink{
		OrganizerUserID: userID,
		Token:           randomToken(t),
		Label:           strPtrRepo("Paquete"),
		Status:          models.PublicRequestLinkActive,
		SubmitMode:      models.SubmitModeAutoEvent,
		MaxUses:         &maxUses,
		ExpiresAt:       &expires,
	}
	if err := repo.Create(ctx, link); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if link.ID == uuid.Nil {
		t.Fatal("Create() should populate id")
	}

	got, err := repo.GetByToken(ctx, link.Token)
	if err != nil {
		t.Fatalf("GetByToken() error = %v", err)
	}
	if got.SubmitMode != models.SubmitModeAutoEvent || got.UseCount != 0 {
		t.Fatalf("GetByToken() = %+v", got)
	}

	// Tenant isolation: other organizer list empty.
	other := seedUser(t, pool, "prl.other@test.dev")
	list, err := repo.ListByOrganizer(ctx, other)
	if err != nil {
		t.Fatalf("ListByOrganizer other: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("tenant isolation failed: got %d links", len(list))
	}

	list, err = repo.ListByOrganizer(ctx, userID)
	if err != nil || len(list) != 1 {
		t.Fatalf("ListByOrganizer owner: len=%d err=%v", len(list), err)
	}

	// Increment use_count twice → used.
	if err := repo.IncrementUse(ctx, link.ID); err != nil {
		t.Fatalf("IncrementUse 1: %v", err)
	}
	got, _ = repo.GetByToken(ctx, link.Token)
	if got.UseCount != 1 || got.Status != models.PublicRequestLinkActive {
		t.Fatalf("after first use: count=%d status=%s", got.UseCount, got.Status)
	}
	if err := repo.IncrementUse(ctx, link.ID); err != nil {
		t.Fatalf("IncrementUse 2: %v", err)
	}
	got, _ = repo.GetByToken(ctx, link.Token)
	if got.UseCount != 2 || got.Status != models.PublicRequestLinkUsed {
		t.Fatalf("after max uses: count=%d status=%s", got.UseCount, got.Status)
	}
	// Further increment should fail.
	if err := repo.IncrementUse(ctx, link.ID); err == nil {
		t.Fatal("IncrementUse after used: want error")
	}

	// New link for revoke test.
	link2 := &models.PublicRequestLink{
		OrganizerUserID: userID,
		Token:           randomToken(t),
		SubmitMode:      models.SubmitModeStandard,
		ExpiresAt:       &expires,
	}
	if err := repo.Create(ctx, link2); err != nil {
		t.Fatalf("Create link2: %v", err)
	}
	if err := repo.Revoke(ctx, link2.ID, userID); err != nil {
		t.Fatalf("Revoke: %v", err)
	}
	got, _ = repo.GetByToken(ctx, link2.Token)
	if got.Status != models.PublicRequestLinkRevoked {
		t.Fatalf("status after revoke = %s", got.Status)
	}
}

func TestPublicRequestLinkRepo_ExpireStale(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "prl.expire@test.dev")
	repo := NewPublicRequestLinkRepo(pool)
	ctx := context.Background()

	past := time.Now().UTC().Add(-time.Hour)
	link := &models.PublicRequestLink{
		OrganizerUserID: userID,
		Token:           randomToken(t),
		Status:          models.PublicRequestLinkActive,
		SubmitMode:      models.SubmitModeStandard,
		ExpiresAt:       &past,
	}
	// Insert past expiry via raw SQL (Create would still store past expires_at).
	if err := repo.Create(ctx, link); err != nil {
		t.Fatalf("Create: %v", err)
	}
	n, err := repo.ExpireStale(ctx)
	if err != nil {
		t.Fatalf("ExpireStale: %v", err)
	}
	if n < 1 {
		t.Fatalf("ExpireStale count = %d, want >= 1", n)
	}
	got, _ := repo.GetByToken(ctx, link.Token)
	if got.Status != models.PublicRequestLinkExpired {
		t.Fatalf("status = %s, want expired", got.Status)
	}
}

func TestPublicRequestRepo_CreateWithSourceAndPhone(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "pr.source@test.dev")
	repo := NewPublicRequestRepo(pool)
	ctx := context.Background()

	phone := "+52155"
	city := "CDMX"
	price := 100.0
	req := &models.PublicRequest{
		OrganizerUserID: userID,
		ContactEmail:    "client@example.com",
		ContactPhone:    &phone,
		City:            &city,
		Currency:        "MXN",
		Status:          models.RequestStatusPending,
		Source:          models.RequestSourcePublicProfile,
		SubmitMode:      models.SubmitModeStandard,
		Services: []models.PublicRequestServiceSnapshot{{
			ProductID: uuid.New(),
			Name:      "Banquete",
			Price:     &price,
			Qty:       3,
		}},
	}
	if err := repo.Create(ctx, req); err != nil {
		t.Fatalf("Create: %v", err)
	}
	got, err := repo.GetByID(ctx, req.ID, userID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.ContactPhone == nil || *got.ContactPhone != phone {
		t.Fatalf("phone = %v", got.ContactPhone)
	}
	if got.City == nil || *got.City != city {
		t.Fatalf("city = %v", got.City)
	}
	if got.Source != models.RequestSourcePublicProfile {
		t.Fatalf("source = %s", got.Source)
	}
	if len(got.Services) != 1 || got.Services[0].Qty != 3 {
		t.Fatalf("services = %+v", got.Services)
	}
}

func strPtrRepo(s string) *string { return &s }
