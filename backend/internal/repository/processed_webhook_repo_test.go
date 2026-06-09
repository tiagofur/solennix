package repository

import (
	"context"
	"testing"
)

func TestProcessedWebhookRepoTryInsert(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewProcessedWebhookRepo(pool)
	ctx := context.Background()

	t.Run("new event returns true", func(t *testing.T) {
		ok, err := repo.TryInsert(ctx, "evt_stripe_001", "stripe", "checkout.session.completed")
		if err != nil {
			t.Fatalf("TryInsert() error = %v", err)
		}
		if !ok {
			t.Fatal("TryInsert() = false, want true for new event")
		}
	})

	t.Run("duplicate event returns false", func(t *testing.T) {
		ok, err := repo.TryInsert(ctx, "evt_stripe_001", "stripe", "checkout.session.completed")
		if err != nil {
			t.Fatalf("TryInsert() duplicate error = %v", err)
		}
		if ok {
			t.Fatal("TryInsert() = true, want false for duplicate event")
		}
	})

	t.Run("different event ID returns true", func(t *testing.T) {
		ok, err := repo.TryInsert(ctx, "evt_stripe_002", "stripe", "customer.subscription.deleted")
		if err != nil {
			t.Fatalf("TryInsert() different ID error = %v", err)
		}
		if !ok {
			t.Fatal("TryInsert() = false, want true for different event ID")
		}
	})

	t.Run("revenuecat key idempotency", func(t *testing.T) {
		rcKey := "revenuecat:user-uuid-abc:INITIAL_PURCHASE:pro_monthly"

		ok, err := repo.TryInsert(ctx, rcKey, "revenuecat", "INITIAL_PURCHASE")
		if err != nil {
			t.Fatalf("TryInsert() rc first error = %v", err)
		}
		if !ok {
			t.Fatal("TryInsert() rc = false, want true for new event")
		}

		ok, err = repo.TryInsert(ctx, rcKey, "revenuecat", "INITIAL_PURCHASE")
		if err != nil {
			t.Fatalf("TryInsert() rc duplicate error = %v", err)
		}
		if ok {
			t.Fatal("TryInsert() rc = true, want false for duplicate event")
		}
	})
}
