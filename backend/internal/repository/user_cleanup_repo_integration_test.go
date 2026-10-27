package repository

import (
	"context"
	"strings"
	"testing"
	"time"
)

// S3 (audit): the retention purge must tombstone+anonymize the users row and
// preserve financial records. The previous implementation was
// `DELETE FROM users`, whose ON DELETE CASCADE foreign keys irrecoverably
// destroyed payments, payment submissions, events and subscriptions for both
// the 210-day inactivity purge and the 90-day self-deletion grace period.
func TestUserCleanupRepo_RetentionPurgePreservesFinancialRecords(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	userID := seedUser(t, pool, "retention.purge@test.dev")
	clientID := seedClient(t, pool, userID, "Retention Client")
	eventID := seedEvent(t, pool, userID, clientID, "2030-01-15")

	if _, err := pool.Exec(ctx, `INSERT INTO payments (user_id, event_id, amount, payment_method, payment_date) VALUES ($1, $2, 250.00, 'transfer', '2030-01-05')`, userID, eventID); err != nil {
		t.Fatalf("failed to seed payment: %v", err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO payment_submissions (user_id, event_id, client_id, amount, status) VALUES ($1, $2, $3, 100.00, 'pending')`, userID, eventID, clientID); err != nil {
		t.Fatalf("failed to seed payment submission: %v", err)
	}

	// Blocked user whose retention period already elapsed.
	if _, err := pool.Exec(ctx, `UPDATE users SET account_status = 'blocked', deletion_eligible_at = NOW() - INTERVAL '1 day' WHERE id = $1`, userID); err != nil {
		t.Fatalf("failed to flag retention candidate: %v", err)
	}

	repo := NewUserCleanupRepo(pool)

	candidates, err := repo.FindHardDeleteCandidates(ctx, time.Now().UTC())
	if err != nil {
		t.Fatalf("FindHardDeleteCandidates() error = %v", err)
	}
	found := false
	for _, c := range candidates {
		if c.ID == userID {
			found = true
		}
	}
	if !found {
		t.Fatalf("seeded user must appear in retention candidates")
	}

	if err := repo.AnonymizeUserForRetention(ctx, userID); err != nil {
		t.Fatalf("AnonymizeUserForRetention() error = %v", err)
	}

	// The users row must survive as an anonymized tombstone.
	var status, email, passwordHash string
	err = pool.QueryRow(ctx,
		`SELECT COALESCE(account_status, 'active'), email, COALESCE(password_hash, '') FROM users WHERE id = $1`,
		userID,
	).Scan(&status, &email, &passwordHash)
	if err != nil {
		t.Fatalf("users row must survive the retention purge as a tombstone; scan error: %v", err)
	}
	if status != "deleted" {
		t.Fatalf("account_status = %q, want tombstone status %q", status, "deleted")
	}
	if email == "retention.purge@test.dev" || !strings.Contains(email, "@anonymized.invalid") {
		t.Fatalf("email must be anonymized, got %q", email)
	}
	if passwordHash != "" {
		t.Fatalf("password_hash must be scrubbed, got %q", passwordHash)
	}

	// Financial records must survive (tax/booking history).
	var paymentCount, eventCount int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE user_id = $1`, userID).Scan(&paymentCount); err != nil {
		t.Fatalf("payments count: %v", err)
	}
	if paymentCount != 1 {
		t.Fatalf("payments for user = %d, want 1 (financial records must survive the purge)", paymentCount)
	}
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM events WHERE user_id = $1`, userID).Scan(&eventCount); err != nil {
		t.Fatalf("events count: %v", err)
	}
	if eventCount != 1 {
		t.Fatalf("events for user = %d, want 1 (booking history must survive the purge)", eventCount)
	}
	var submissionCount int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM payment_submissions WHERE user_id = $1`, userID).Scan(&submissionCount); err != nil {
		t.Fatalf("payment_submissions count: %v", err)
	}
	if submissionCount != 1 {
		t.Fatalf("payment_submissions for user = %d, want 1 (submission history must survive the purge)", submissionCount)
	}

	// The purge is idempotent: re-running on a tombstoned row must not error.
	if err := repo.AnonymizeUserForRetention(ctx, userID); err != nil {
		t.Fatalf("AnonymizeUserForRetention() must be idempotent; second run error: %v", err)
	}
}
