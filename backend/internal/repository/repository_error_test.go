package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestRepositoryMethodsWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
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
	if err := NewEventRepo(pool).UpdateEventItems(ctx, id, nil, nil, nil); err == nil {
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
	if _, err := NewUserRepo(pool).Update(context.Background(), uuid.New(), nil, nil, nil, nil, nil, nil, nil, nil, nil); err == nil {
		t.Fatalf("UserRepo.Update() expected error with closed pool")
	}

	// --- ClientRepo: CountByUserID, Create, Search ---
	if _, err := NewClientRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("ClientRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewClientRepo(pool).Create(ctx, &models.Client{UserID: userID, Name: "x", Phone: "1"}); err == nil {
		t.Fatalf("ClientRepo.Create() expected error with closed pool")
	}
	if _, err := NewClientRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("ClientRepo.Search() expected error with closed pool")
	}

	// --- EventRepo: CountCurrentMonth, Create, Update, UpdateClientStats, GetEquipment,
	//     CheckEquipmentConflicts, GetEquipmentSuggestionsFromProducts, Search ---
	if _, err := NewEventRepo(pool).CountCurrentMonth(ctx, userID); err == nil {
		t.Fatalf("EventRepo.CountCurrentMonth() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Create(ctx, &models.Event{UserID: userID, ClientID: id, EventDate: "2026-01-01", ServiceType: "catering", Status: "quoted"}); err == nil {
		t.Fatalf("EventRepo.Create() expected error with closed pool")
	}
	if err := NewEventRepo(pool).Update(ctx, &models.Event{ID: id, UserID: userID, ClientID: id, EventDate: "2026-01-01", ServiceType: "catering", Status: "quoted"}); err == nil {
		t.Fatalf("EventRepo.Update() expected error with closed pool")
	}
	if err := NewEventRepo(pool).UpdateClientStats(ctx, id); err == nil {
		t.Fatalf("EventRepo.UpdateClientStats() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetEquipment(ctx, id); err == nil {
		t.Fatalf("EventRepo.GetEquipment() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).CheckEquipmentConflicts(ctx, userID, "2026-01-01", nil, nil, []uuid.UUID{id}, nil); err == nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).GetEquipmentSuggestionsFromProducts(ctx, userID, []uuid.UUID{id}); err == nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts() expected error with closed pool")
	}
	if _, err := NewEventRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("EventRepo.Search() expected error with closed pool")
	}

	// --- InventoryRepo: CountByUserID, Create, Update, Search ---
	if _, err := NewInventoryRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("InventoryRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Create(ctx, &models.InventoryItem{UserID: userID, IngredientName: "x", Unit: "kg", Type: "ingredient"}); err == nil {
		t.Fatalf("InventoryRepo.Create() expected error with closed pool")
	}
	if err := NewInventoryRepo(pool).Update(ctx, &models.InventoryItem{ID: id, UserID: userID, IngredientName: "x", Unit: "kg", Type: "ingredient"}); err == nil {
		t.Fatalf("InventoryRepo.Update() expected error with closed pool")
	}
	if _, err := NewInventoryRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("InventoryRepo.Search() expected error with closed pool")
	}

	// --- PaymentRepo: GetAll, Create ---
	if _, err := NewPaymentRepo(pool).GetAll(ctx, userID); err == nil {
		t.Fatalf("PaymentRepo.GetAll() expected error with closed pool")
	}
	if err := NewPaymentRepo(pool).Create(ctx, &models.Payment{EventID: id, UserID: userID, Amount: 10, PaymentDate: "2026-01-01", PaymentMethod: "cash"}); err == nil {
		t.Fatalf("PaymentRepo.Create() expected error with closed pool")
	}

	// --- ProductRepo: CountByUserID, Create, Update, VerifyOwnership, Search ---
	if _, err := NewProductRepo(pool).CountByUserID(ctx, userID); err == nil {
		t.Fatalf("ProductRepo.CountByUserID() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Create(ctx, &models.Product{UserID: userID, Name: "x", Category: "cat", BasePrice: 10}); err == nil {
		t.Fatalf("ProductRepo.Create() expected error with closed pool")
	}
	if err := NewProductRepo(pool).Update(ctx, &models.Product{ID: id, UserID: userID, Name: "x", Category: "cat", BasePrice: 10}); err == nil {
		t.Fatalf("ProductRepo.Update() expected error with closed pool")
	}
	if err := NewProductRepo(pool).VerifyOwnership(ctx, []uuid.UUID{id}, userID); err == nil {
		t.Fatalf("ProductRepo.VerifyOwnership() expected error with closed pool")
	}
	if _, err := NewProductRepo(pool).Search(ctx, userID, "test"); err == nil {
		t.Fatalf("ProductRepo.Search() expected error with closed pool")
	}

	// --- UserRepo: Create, UpdatePlanAndStripeID, UpdatePlanByStripeCustomerID, UpdatePassword ---
	if err := NewUserRepo(pool).Create(ctx, &models.User{Email: "x@test.dev", PasswordHash: "hash", Name: "x", Plan: "basic"}); err == nil {
		t.Fatalf("UserRepo.Create() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePlanAndStripeID(ctx, id, "pro", nil); err == nil {
		t.Fatalf("UserRepo.UpdatePlanAndStripeID() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePlanByStripeCustomerID(ctx, "cus_test", "basic"); err == nil {
		t.Fatalf("UserRepo.UpdatePlanByStripeCustomerID() expected error with closed pool")
	}
	if err := NewUserRepo(pool).UpdatePassword(ctx, id, "newhash"); err == nil {
		t.Fatalf("UserRepo.UpdatePassword() expected error with closed pool")
	}
}

func TestRepositoryEdgeCases(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	// PaymentRepo.GetByEventIDs with empty list returns early without hitting the pool
	payments, err := NewPaymentRepo(nil).GetByEventIDs(ctx, userID, []uuid.UUID{})
	if err != nil {
		t.Fatalf("PaymentRepo.GetByEventIDs(empty) expected no error, got: %v", err)
	}
	if len(payments) != 0 {
		t.Fatalf("PaymentRepo.GetByEventIDs(empty) expected empty slice, got %d items", len(payments))
	}

	// ProductRepo.GetIngredientsForProducts with empty list returns early without hitting the pool
	ingredients, err := NewProductRepo(nil).GetIngredientsForProducts(ctx, []uuid.UUID{})
	if err != nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts(empty) expected no error, got: %v", err)
	}
	if ingredients != nil {
		t.Fatalf("ProductRepo.GetIngredientsForProducts(empty) expected nil, got %d items", len(ingredients))
	}

	// ProductRepo.VerifyOwnership with empty list returns early without hitting the pool
	if err := NewProductRepo(nil).VerifyOwnership(ctx, []uuid.UUID{}, userID); err != nil {
		t.Fatalf("ProductRepo.VerifyOwnership(empty) expected no error, got: %v", err)
	}

	// EventRepo.CheckEquipmentConflicts with empty inventoryIDs returns early without hitting the pool
	conflicts, err := NewEventRepo(nil).CheckEquipmentConflicts(ctx, userID, "2026-01-01", nil, nil, []uuid.UUID{}, nil)
	if err != nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts(empty) expected no error, got: %v", err)
	}
	if conflicts != nil {
		t.Fatalf("EventRepo.CheckEquipmentConflicts(empty) expected nil, got %d items", len(conflicts))
	}

	// EventRepo.GetEquipmentSuggestionsFromProducts with empty productIDs returns early without hitting the pool
	suggestions, err := NewEventRepo(nil).GetEquipmentSuggestionsFromProducts(ctx, userID, []uuid.UUID{})
	if err != nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts(empty) expected no error, got: %v", err)
	}
	if suggestions != nil {
		t.Fatalf("EventRepo.GetEquipmentSuggestionsFromProducts(empty) expected nil, got %d items", len(suggestions))
	}
}
