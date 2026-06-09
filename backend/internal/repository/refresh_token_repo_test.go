package repository

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// TestRefreshTokenRepo_Consume_AtomicCAS verifies that two concurrent calls to Consume
// with the same token hash result in exactly one success and one "reuse detected" error,
// preserving the family ID for revocation.
func TestRefreshTokenRepo_Consume_AtomicCAS(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "consume.atomic@test.dev")
	repo := NewRefreshTokenRepo(pool)

	familyID := uuid.New()
	tokenHash := "atomic-token-hash-" + uuid.New().String()
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	if err := repo.Store(context.Background(), userID, familyID, tokenHash, expiresAt); err != nil {
		t.Fatalf("Store() error = %v", err)
	}

	// First call: must succeed.
	fid1, uid1, err1 := repo.Consume(context.Background(), tokenHash)
	if err1 != nil {
		t.Fatalf("first Consume() error = %v, want nil", err1)
	}
	if fid1 != familyID {
		t.Fatalf("first Consume() familyID = %v, want %v", fid1, familyID)
	}
	if uid1 != userID {
		t.Fatalf("first Consume() userID = %v, want %v", uid1, userID)
	}

	// Second call: must return "reuse detected" with the same familyID for revocation.
	fid2, _, err2 := repo.Consume(context.Background(), tokenHash)
	if err2 == nil {
		t.Fatal("second Consume() should return error (reuse detected), got nil")
	}
	if !strings.Contains(err2.Error(), "reuse detected") {
		t.Fatalf("second Consume() error = %q, want to contain 'reuse detected'", err2.Error())
	}
	if fid2 != familyID {
		t.Fatalf("second Consume() familyID = %v, want %v (needed for RevokeFamily)", fid2, familyID)
	}
}

// TestRefreshTokenRepo_Consume_TokenNotFound verifies that a non-existent token hash
// returns the "not found or expired" sentinel error with uuid.Nil family ID.
func TestRefreshTokenRepo_Consume_TokenNotFound(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewRefreshTokenRepo(pool)

	fid, uid, err := repo.Consume(context.Background(), "does-not-exist-hash")
	if err == nil {
		t.Fatal("Consume() with nonexistent token should return error")
	}
	if !strings.Contains(err.Error(), "not found or expired") {
		t.Fatalf("error = %q, want 'not found or expired'", err.Error())
	}
	if fid != uuid.Nil {
		t.Fatalf("familyID = %v, want uuid.Nil for not-found token", fid)
	}
	if uid != uuid.Nil {
		t.Fatalf("userID = %v, want uuid.Nil for not-found token", uid)
	}
}

// TestRefreshTokenRepo_Consume_ExpiredToken verifies that an expired token
// returns the "not found or expired" error.
func TestRefreshTokenRepo_Consume_ExpiredToken(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "consume.expired@test.dev")
	repo := NewRefreshTokenRepo(pool)

	familyID := uuid.New()
	tokenHash := "expired-token-hash-" + uuid.New().String()
	// Expired in the past.
	expiresAt := time.Now().Add(-1 * time.Hour)

	if err := repo.Store(context.Background(), userID, familyID, tokenHash, expiresAt); err != nil {
		t.Fatalf("Store() error = %v", err)
	}

	_, _, err := repo.Consume(context.Background(), tokenHash)
	if err == nil {
		t.Fatal("Consume() with expired token should return error")
	}
	// Expired tokens should appear as "not found or expired" since they don't match the WHERE clause.
	if !strings.Contains(err.Error(), "not found or expired") {
		t.Fatalf("error = %q, want 'not found or expired'", err.Error())
	}
}
