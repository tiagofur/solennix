package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// TestPaymentRepo_SumByEventID verifies SumByEventID returns the correct sum.
func TestPaymentRepo_SumByEventID(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.sum@test.dev")
	clientID := seedClient(t, pool, userID, "Sum Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-08-01")

	repo := NewPaymentRepo(pool)

	// No payments yet → sum = 0
	sum, err := repo.SumByEventID(context.Background(), userID, eventID)
	if err != nil {
		t.Fatalf("SumByEventID() error = %v", err)
	}
	if sum != 0 {
		t.Fatalf("SumByEventID() = %.2f; want 0 (no payments)", sum)
	}

	// Insert 3 payments
	for _, amount := range []float64{500.00, 300.00, 200.00} {
		p := &models.Payment{
			EventID:       eventID,
			UserID:        userID,
			Amount:        amount,
			PaymentDate:   "2026-08-01",
			PaymentMethod: "cash",
		}
		if err := repo.Create(context.Background(), p); err != nil {
			t.Fatalf("Create() error = %v", err)
		}
	}

	sum, err = repo.SumByEventID(context.Background(), userID, eventID)
	if err != nil {
		t.Fatalf("SumByEventID() error = %v", err)
	}
	if sum != 1000.00 {
		t.Fatalf("SumByEventID() = %.2f; want 1000.00", sum)
	}
}

// TestPaymentRepo_SumByEventID_ExcludesCrossTenantPayments verifies poison
// payments inserted with a mismatched user_id are excluded from the sum.
func TestPaymentRepo_SumByEventID_ExcludesCrossTenantPayments(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	ownerID := seedUser(t, pool, "payment.sum.owner@test.dev")
	attackerID := seedUser(t, pool, "payment.sum.attacker@test.dev")
	clientID := seedClient(t, pool, ownerID, "Sum Owner Client")
	eventID := seedEvent(t, pool, ownerID, clientID, "2026-08-02")

	repo := NewPaymentRepo(pool)

	legit := &models.Payment{
		EventID:       eventID,
		UserID:        ownerID,
		Amount:        400.00,
		PaymentDate:   "2026-08-02",
		PaymentMethod: "cash",
	}
	if err := repo.Create(context.Background(), legit); err != nil {
		t.Fatalf("Create() legit payment error = %v", err)
	}

	_, err := pool.Exec(context.Background(), `
		INSERT INTO payments (event_id, user_id, amount, payment_date, payment_method)
		VALUES ($1, $2, $3, $4, $5)
	`, eventID, attackerID, 9999.00, "2026-08-02", "cash")
	if err != nil {
		t.Fatalf("insert poison payment error = %v", err)
	}

	sum, err := repo.SumByEventID(context.Background(), ownerID, eventID)
	if err != nil {
		t.Fatalf("SumByEventID() error = %v", err)
	}
	if sum != 400.00 {
		t.Fatalf("SumByEventID() = %.2f; want 400.00 (cross-tenant payment excluded)", sum)
	}
}

// TestPaymentRepo_DeleteAndReturnEventIDTx verifies the transactional delete.
func TestPaymentRepo_DeleteAndReturnEventIDTx(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.deltx@test.dev")
	clientID := seedClient(t, pool, userID, "DelTx Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-08-01")

	repo := NewPaymentRepo(pool)

	p := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        999.00,
		PaymentDate:   "2026-08-01",
		PaymentMethod: "cash",
	}
	if err := repo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Delete in tx — should return the event_id
	tx, err := pool.Begin(context.Background())
	if err != nil {
		t.Fatalf("Begin() error = %v", err)
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	gotEventID, err := repo.DeleteAndReturnEventIDTx(context.Background(), tx, p.ID, userID)
	if err != nil {
		t.Fatalf("DeleteAndReturnEventIDTx() error = %v", err)
	}
	if gotEventID != eventID {
		t.Fatalf("returned event_id = %v; want %v", gotEventID, eventID)
	}

	if err := tx.Commit(context.Background()); err != nil {
		t.Fatalf("Commit() error = %v", err)
	}

	// Payment should be gone
	_, err = repo.GetByID(context.Background(), p.ID, userID)
	if err == nil {
		t.Fatal("expected error after delete, got nil")
	}
}

// TestPaymentRepo_DeleteAndReturnEventIDTx_WrongUser verifies user_id filter.
func TestPaymentRepo_DeleteAndReturnEventIDTx_WrongUser(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.deltx2@test.dev")
	clientID := seedClient(t, pool, userID, "DelTx2 Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-08-01")

	repo := NewPaymentRepo(pool)

	p := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        500.00,
		PaymentDate:   "2026-08-01",
		PaymentMethod: "cash",
	}
	if err := repo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	tx, err := pool.Begin(context.Background())
	if err != nil {
		t.Fatalf("Begin() error = %v", err)
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	// Attempt to delete with a different userID
	_, err = repo.DeleteAndReturnEventIDTx(context.Background(), tx, p.ID, uuid.New())
	if err == nil {
		t.Fatal("expected error when deleting with wrong user_id, got nil")
	}
}

// TestPaymentRepo_UpdateTx verifies transactional update.
func TestPaymentRepo_UpdateTx(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.updatetx@test.dev")
	clientID := seedClient(t, pool, userID, "UpdTx Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-08-01")

	repo := NewPaymentRepo(pool)

	p := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        200.00,
		PaymentDate:   "2026-08-01",
		PaymentMethod: "cash",
	}
	if err := repo.Create(context.Background(), p); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	tx, err := pool.Begin(context.Background())
	if err != nil {
		t.Fatalf("Begin() error = %v", err)
	}
	defer func() { _ = tx.Rollback(context.Background()) }()

	p.Amount = 750.00
	if err := repo.UpdateTx(context.Background(), tx, userID, p); err != nil {
		t.Fatalf("UpdateTx() error = %v", err)
	}

	if err := tx.Commit(context.Background()); err != nil {
		t.Fatalf("Commit() error = %v", err)
	}

	updated, err := repo.GetByID(context.Background(), p.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if updated.Amount != 750.00 {
		t.Fatalf("Amount = %.2f; want 750.00", updated.Amount)
	}
}
