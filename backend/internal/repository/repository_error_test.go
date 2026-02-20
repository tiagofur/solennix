package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/eventosapp-backend/internal/models"
)

func TestRepositoryMethodsWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://eventosapp_user:eventosapp_password@localhost:5433/eventosapp?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	ctx := context.Background()
	userID := uuid.New()
	id := uuid.New()

	if _, err := NewClientRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("ClientRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewClientRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("ClientRepo.GetByID() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("ClientRepo.Delete() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Update(ctx, &models.Client{ID: id, UserID: userID, Name: "x", Phone: "1"}); err == nil {
		t.Fatalf("ClientRepo.Update() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetProducts(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetProducts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetExtras(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetExtras() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("EventRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByDateRange(ctx, userID, "2026-01-01", "2026-12-31"); err == nil {
		t.Fatalf("EventRepo.GetByDateRange() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByClientID(ctx, userID, id); err == nil {
		t.Fatalf("EventRepo.GetByClientID() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("EventRepo.GetByID() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetUpcoming(ctx, userID, 5); err == nil {
		t.Fatalf("EventRepo.GetUpcoming() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("EventRepo.Delete() expected error with closed pool")
	}
	if err := NewEventRepo(pool).UpdateEventItems(ctx, id, nil, nil); err == nil {
		t.Fatalf("EventRepo.UpdateEventItems() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("InventoryRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("InventoryRepo.GetByID() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("InventoryRepo.Delete() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByEventID(ctx, userID, id); err == nil {
		t.Fatalf("PaymentRepo.GetByEventID() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByDateRange(ctx, userID, "2026-01-01", "2026-12-31"); err == nil {
		t.Fatalf("PaymentRepo.GetByDateRange() expected error with closed pool")
	}
	if _, err := NewPaymentRepo(pool).GetByEventIDs(ctx, userID, []uuid.UUID{id}); err == nil {
		t.Fatalf("PaymentRepo.GetByEventIDs() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Update(ctx, userID, &models.Payment{ID: id, Amount: 10, PaymentDate: "2026-01-01", PaymentMethod: "cash"}); err == nil {
		t.Fatalf("PaymentRepo.Update() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("PaymentRepo.Delete() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetIngredients(ctx, id); err == nil {
		t.Fatalf("ProductRepo.GetIngredients() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("ProductRepo.GetAll() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetByID(ctx, id, userID); err == nil {
		t.Fatalf("ProductRepo.GetByID() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Delete(ctx, id, userID); err == nil {
		t.Fatalf("ProductRepo.Delete() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).GetIngredientsForProducts(ctx, []uuid.UUID{id}); err == nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts() expected error with closed pool")
	}
	if err := NewProductRepo(pool).UpdateIngredients(ctx, id, []models.ProductIngredient{{InventoryID: id, QuantityRequired: 1}}); err == nil {
		t.Fatalf("ProductRepo.UpdateIngredients() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByEmail(ctx, "x@test.dev"); err == nil {
		t.Fatalf("UserRepo.GetByEmail() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).GetByID(ctx, id); err == nil {
		t.Fatalf("UserRepo.GetByID() expected error with closed pool")
	}
	if _, err := NewUserRepo(pool).Update(context.Background(), uuid.New(), nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatalf("UserRepo.Update() expected error with closed pool")
	}
}
