package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Regression: events.event_date is a DATE column; scanning it into a Go string
// fails under pgx binary protocol (OID 1082). The query must cast to ::text.
func TestListPendingEmailCandidates(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "review-candidates@test.dev")
	clientID := seedClientWithEmail(t, pool, userID, "Cliente Reseña", "cliente.review@test.dev")

	pastID := seedEvent(t, pool, userID, clientID, time.Now().AddDate(0, 0, -3).Format("2006-01-02"))
	futureID := seedEvent(t, pool, userID, clientID, time.Now().AddDate(0, 0, 5).Format("2006-01-02"))

	repo := NewEventReviewRepo(pool)
	candidates, err := repo.ListPendingEmailCandidates(context.Background(), 100)
	if err != nil {
		t.Fatalf("ListPendingEmailCandidates() error = %v", err)
	}

	var found *ReviewEmailCandidate
	for i := range candidates {
		if candidates[i].EventID == pastID {
			found = &candidates[i]
		}
		if candidates[i].EventID == futureID {
			t.Fatalf("future event %s should not be a candidate", futureID)
		}
	}
	if found == nil {
		t.Fatalf("past event %s missing from candidates", pastID)
	}
	if _, err := time.Parse("2006-01-02", found.EventDate); err != nil {
		t.Fatalf("EventDate = %q is not a YYYY-MM-DD date string: %v", found.EventDate, err)
	}
	if found.ClientEmail != "cliente.review@test.dev" {
		t.Fatalf("ClientEmail = %q, want cliente.review@test.dev", found.ClientEmail)
	}
	if found.OrganizerPlan != "basic" {
		t.Fatalf("OrganizerPlan = %q, want basic", found.OrganizerPlan)
	}
}

func seedClientWithEmail(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name, email string) uuid.UUID {
	t.Helper()
	id := uuid.New()
	if _, err := pool.Exec(context.Background(),
		`INSERT INTO clients (id, user_id, name, phone, email) VALUES ($1, $2, $3, '555-0102', $4)`,
		id, userID, name, email); err != nil {
		t.Fatalf("failed to seed client: %v", err)
	}
	return id
}
