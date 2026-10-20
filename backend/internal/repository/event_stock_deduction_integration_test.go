package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

func seedStockSupply(t *testing.T, pool *pgxpool.Pool, userID, eventID uuid.UUID, stock, qty float64) uuid.UUID {
	t.Helper()
	var invID uuid.UUID
	if err := pool.QueryRow(context.Background(),
		`INSERT INTO inventory (user_id, ingredient_name, current_stock, minimum_stock, unit, type)
		 VALUES ($1, 'Ledger Test Supply', $2, 0, 'pcs', 'supply') RETURNING id`,
		userID, stock).Scan(&invID); err != nil {
		t.Fatalf("seed inventory: %v", err)
	}
	if _, err := pool.Exec(context.Background(),
		`INSERT INTO event_supplies (event_id, inventory_id, quantity, source) VALUES ($1, $2, $3, 'stock')`,
		eventID, invID, qty); err != nil {
		t.Fatalf("seed event supply: %v", err)
	}
	return invID
}

func stockOf(t *testing.T, pool *pgxpool.Pool, invID uuid.UUID) float64 {
	t.Helper()
	var stock float64
	if err := pool.QueryRow(context.Background(), `SELECT current_stock FROM inventory WHERE id = $1`, invID).Scan(&stock); err != nil {
		t.Fatalf("read stock: %v", err)
	}
	return stock
}

// S6 (audit): re-confirming an event must not deduct stock twice — the
// per-(event, inventory) deduction ledger makes the operation idempotent.
func TestEventRepo_DeductSupplyStock_IdempotentOnReconfirm(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	userID := seedUser(t, pool, "stock-ledger@test.dev")
	clientID := seedClient(t, pool, userID, "Stock Client")
	eventID := seedEvent(t, pool, userID, clientID, "2030-01-15")
	invID := seedStockSupply(t, pool, userID, eventID, 10, 3)

	repo := NewEventRepo(pool)
	if err := repo.DeductSupplyStock(ctx, eventID); err != nil {
		t.Fatalf("first deduct: %v", err)
	}
	if got := stockOf(t, pool, invID); got != 7 {
		t.Fatalf("stock after first confirm = %v, want 7", got)
	}

	// Organizer cancels and re-confirms the same event.
	if err := repo.DeductSupplyStock(ctx, eventID); err != nil {
		t.Fatalf("second deduct (re-confirm): %v", err)
	}
	if got := stockOf(t, pool, invID); got != 7 {
		t.Fatalf("stock after re-confirm = %v, want 7 (ledger must make the deduction idempotent)", got)
	}
}

// S6 (audit): GREATEST(0, current_stock - qty) masked shortages — stock must
// reflect reality (honest negative) instead of silently clamping to zero.
func TestEventRepo_DeductSupplyStock_ShortageIsHonest(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)
	ctx := context.Background()

	userID := seedUser(t, pool, "stock-shortage@test.dev")
	clientID := seedClient(t, pool, userID, "Shortage Client")
	eventID := seedEvent(t, pool, userID, clientID, "2030-01-16")
	invID := seedStockSupply(t, pool, userID, eventID, 1, 5)

	repo := NewEventRepo(pool)
	if err := repo.DeductSupplyStock(ctx, eventID); err != nil {
		t.Fatalf("deduct: %v", err)
	}
	if got := stockOf(t, pool, invID); got != -4 {
		t.Fatalf("stock after shortage = %v, want -4 (honest negative, no GREATEST clamp)", got)
	}
}
