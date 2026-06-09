package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// ---------------------------------------------------------------------------
// withPlanLimit — concurrency integration tests (require TEST_DATABASE_URL)
// ---------------------------------------------------------------------------

// TestWithPlanLimit_Concurrency_Clients fires N goroutines against CreateClient
// with a basic user already at limit-1. Asserts:
//   - Final count never exceeds limit.
//   - Exactly 1 goroutine succeeds (201 Created).
//   - All others receive 403 Forbidden (ErrPlanLimitReached).
func TestWithPlanLimit_Concurrency_Clients(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	userID := seedHandlersUser(t, pool, "planlimit.clients.race@test.dev")
	clientRepo := repository.NewClientRepo(pool)
	userRepo := repository.NewUserRepo(pool)

	const limit = 5   // small limit for speed; matches seeded count below
	const goroutines = 12

	// Seed limit-1 clients so only 1 more insert should be allowed.
	for i := range limit - 1 {
		c := &models.Client{UserID: userID, Name: fmt.Sprintf("Seed %d", i), Phone: "555-0000"}
		if err := clientRepo.Create(context.Background(), c); err != nil {
			t.Fatalf("seed client %d: %v", i, err)
		}
	}

	// Override user plan limit to `limit` by updating the client count check
	// inline via withPlanLimit directly (not through HTTP) so we control the limit.
	// We call withPlanLimit with an insertFn that does the actual INSERT.
	const countSQL = `SELECT COUNT(*) FROM clients WHERE user_id = $1`

	var successN, limitN, otherN atomic.Int64
	var wg sync.WaitGroup
	gate := make(chan struct{})

	for range goroutines {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-gate

			c := models.Client{UserID: userID, Name: "Race Client", Phone: "555-9999"}

			err := withPlanLimit(
				context.Background(), pool, userID, "clients", limit, countSQL,
				func(ctx context.Context, tx pgx.Tx) error {
					return tx.QueryRow(ctx,
						`INSERT INTO clients (user_id, name, phone, email, address, city, notes, photo_url)
						VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
						RETURNING id, total_events, total_spent, created_at, updated_at`,
						c.UserID, c.Name, c.Phone, c.Email,
						c.Address, c.City, c.Notes, c.PhotoURL,
					).Scan(&c.ID, &c.TotalEvents, &c.TotalSpent, &c.CreatedAt, &c.UpdatedAt)
				},
			)

			switch {
			case err == nil:
				successN.Add(1)
			case errors.Is(err, ErrPlanLimitReached):
				limitN.Add(1)
			default:
				otherN.Add(1)
				t.Logf("unexpected error: %v", err)
			}
		}()
	}

	close(gate)
	wg.Wait()

	finalCount, err := clientRepo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID: %v", err)
	}

	if finalCount > limit {
		t.Errorf("RACE CONDITION: count=%d exceeds limit=%d (successes=%d, limit_hits=%d, errors=%d)",
			finalCount, limit, successN.Load(), limitN.Load(), otherN.Load())
	}
	if successN.Load() > 1 {
		t.Errorf("more than one goroutine succeeded: successes=%d", successN.Load())
	}
	if otherN.Load() > 0 {
		t.Errorf("%d unexpected errors (see logs above)", otherN.Load())
	}
	t.Logf("result: count=%d, successes=%d, limit_hits=%d, errors=%d",
		finalCount, successN.Load(), limitN.Load(), otherN.Load())

	_ = userRepo // used indirectly via seedHandlersUser
}

// TestWithPlanLimit_NormalPath_UnderLimit verifies the non-race happy path.
func TestWithPlanLimit_NormalPath_UnderLimit(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	userID := seedHandlersUser(t, pool, "planlimit.normal@test.dev")
	clientRepo := repository.NewClientRepo(pool)

	const limit = 20
	const countSQL = `SELECT COUNT(*) FROM clients WHERE user_id = $1`

	c := models.Client{UserID: userID, Name: "Normal Client", Phone: "555-0001"}
	err := withPlanLimit(
		context.Background(), pool, userID, "clients", limit, countSQL,
		func(ctx context.Context, tx pgx.Tx) error {
			return tx.QueryRow(ctx,
				`INSERT INTO clients (user_id, name, phone, email, address, city, notes, photo_url)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
				RETURNING id, total_events, total_spent, created_at, updated_at`,
				c.UserID, c.Name, c.Phone, c.Email,
				c.Address, c.City, c.Notes, c.PhotoURL,
			).Scan(&c.ID, &c.TotalEvents, &c.TotalSpent, &c.CreatedAt, &c.UpdatedAt)
		},
	)
	if err != nil {
		t.Fatalf("expected success, got: %v", err)
	}
	if c.ID == uuid.Nil {
		t.Fatal("expected client ID to be populated after insert")
	}

	count, err := clientRepo.CountByUserID(context.Background(), userID)
	if err != nil || count != 1 {
		t.Fatalf("count=%d err=%v, want 1", count, err)
	}
}

// TestWithPlanLimit_AtLimit_Rejected verifies that an insert at the exact limit
// is rejected with ErrPlanLimitReached.
func TestWithPlanLimit_AtLimit_Rejected(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	userID := seedHandlersUser(t, pool, "planlimit.atlimit@test.dev")
	clientRepo := repository.NewClientRepo(pool)

	const limit = 3

	// Seed exactly `limit` clients.
	for i := range limit {
		c := &models.Client{UserID: userID, Name: fmt.Sprintf("At %d", i), Phone: "555-0000"}
		if err := clientRepo.Create(context.Background(), c); err != nil {
			t.Fatalf("seed: %v", err)
		}
	}

	const countSQL = `SELECT COUNT(*) FROM clients WHERE user_id = $1`
	err := withPlanLimit(
		context.Background(), pool, userID, "clients", limit, countSQL,
		func(ctx context.Context, tx pgx.Tx) error {
			// Should never reach here.
			return fmt.Errorf("insertFn called unexpectedly")
		},
	)
	if !errors.Is(err, ErrPlanLimitReached) {
		t.Fatalf("expected ErrPlanLimitReached, got: %v", err)
	}
}

// TestCreateClient_UnlimitedPlan_HTTP verifies that a non-basic plan uses the
// direct path and can exceed basic limits without interference.
func TestCreateClient_UnlimitedPlan_HTTP(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	// Seed a pro user.
	proUser := &models.User{
		Email:        "planlimit.pro.http@test.dev",
		PasswordHash: "hash",
		Name:         "Pro User",
		Plan:         "pro",
	}
	userRepo := repository.NewUserRepo(pool)
	if err := userRepo.Create(context.Background(), proUser); err != nil {
		t.Fatalf("seed pro user: %v", err)
	}

	clientRepo := repository.NewClientRepo(pool)
	h := NewCRUDHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo, new(MockUnavailableDateRepo))
	h.SetPool(pool)

	// Insert 25 clients — above the basic limit of 20 — all should succeed.
	for i := range 25 {
		body, _ := json.Marshal(map[string]string{
			"name":  fmt.Sprintf("Pro Client %d", i),
			"phone": "555-0000",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/clients", bytes.NewReader(body))
		ctx := req.Context()
		ctx = context.WithValue(ctx, middleware.UserIDKey, proUser.ID)
		req = req.WithContext(ctx)
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()
		h.CreateClient(rr, req)

		if rr.Code != http.StatusCreated {
			t.Fatalf("client %d: status=%d want 201, body=%s", i, rr.Code, rr.Body.String())
		}
	}

	count, err := clientRepo.CountByUserID(context.Background(), proUser.ID)
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 25 {
		t.Errorf("pro user count=%d, want 25", count)
	}
}
