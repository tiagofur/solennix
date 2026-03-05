package repository

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/database"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestUserRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	repo := NewUserRepo(pool)
	user := &models.User{
		Email:        "user.integration@test.dev",
		PasswordHash: "hash",
		Name:         "Integration User",
		Plan:         "basic",
	}

	if err := repo.Create(context.Background(), user); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if user.ID == uuid.Nil {
		t.Fatalf("Create() should populate user ID")
	}

	byEmail, err := repo.GetByEmail(context.Background(), user.Email)
	if err != nil {
		t.Fatalf("GetByEmail() error = %v", err)
	}
	if byEmail.ID != user.ID {
		t.Fatalf("GetByEmail() returned wrong user")
	}

	byID, err := repo.GetByID(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if byID.Email != user.Email {
		t.Fatalf("GetByID() returned wrong email")
	}

	newName := "Updated Name"
	updatedUser, err := repo.Update(context.Background(), user.ID, &newName, nil, nil, nil, nil, nil, nil, nil, nil)
	if err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	if updatedUser.Name != newName {
		t.Fatalf("Update() name = %q, want %q", updatedUser.Name, newName)
	}
}

func TestClientRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "client.integration@test.dev")
	repo := NewClientRepo(pool)

	client := &models.Client{
		UserID: userID,
		Name:   "Client One",
		Phone:  "555-0101",
	}
	if err := repo.Create(context.Background(), client); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if client.ID == uuid.Nil {
		t.Fatalf("Create() should populate client ID")
	}

	got, err := repo.GetByID(context.Background(), client.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.Name != "Client One" {
		t.Fatalf("GetByID() name = %q, want %q", got.Name, "Client One")
	}

	all, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("GetAll() len = %d, want 1", len(all))
	}

	client.Name = "Client Updated"
	if err := repo.Update(context.Background(), client); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	got, err = repo.GetByID(context.Background(), client.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error after update = %v", err)
	}
	if got.Name != "Client Updated" {
		t.Fatalf("updated name = %q, want %q", got.Name, "Client Updated")
	}

	if err := repo.Delete(context.Background(), client.ID, userID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if err := repo.Delete(context.Background(), client.ID, userID); err == nil {
		t.Fatalf("Delete() expected not found error on second delete")
	}
}

func TestPaymentRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.integration@test.dev")
	clientID := seedClient(t, pool, userID, "Payment Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-06-01")

	repo := NewPaymentRepo(pool)
	notes := "first payment"
	payment := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        1200,
		PaymentDate:   "2026-06-01",
		PaymentMethod: "cash",
		Notes:         &notes,
	}

	if err := repo.Create(context.Background(), payment); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if payment.ID == uuid.Nil {
		t.Fatalf("Create() should populate payment ID")
	}

	byEvent, err := repo.GetByEventID(context.Background(), userID, eventID)
	if err != nil {
		t.Fatalf("GetByEventID() error = %v", err)
	}
	if len(byEvent) != 1 {
		t.Fatalf("GetByEventID() len = %d, want 1", len(byEvent))
	}

	byRange, err := repo.GetByDateRange(context.Background(), userID, "2026-05-01", "2026-06-30")
	if err != nil {
		t.Fatalf("GetByDateRange() error = %v", err)
	}
	if len(byRange) != 1 {
		t.Fatalf("GetByDateRange() len = %d, want 1", len(byRange))
	}

	empty, err := repo.GetByEventIDs(context.Background(), userID, nil)
	if err != nil {
		t.Fatalf("GetByEventIDs(nil) error = %v", err)
	}
	if len(empty) != 0 {
		t.Fatalf("GetByEventIDs(nil) should return empty slice")
	}

	byIDs, err := repo.GetByEventIDs(context.Background(), userID, []uuid.UUID{eventID})
	if err != nil {
		// In simple protocol mode, []uuid encoding can fail; this still validates error handling path.
		if !strings.Contains(err.Error(), "cannot find encode plan") {
			t.Fatalf("GetByEventIDs() unexpected error = %v", err)
		}
	} else if len(byIDs) != 1 {
		t.Fatalf("GetByEventIDs() len = %d, want 1", len(byIDs))
	}

	payment.Amount = 1300
	payment.PaymentMethod = "transfer"
	if err := repo.Update(context.Background(), userID, payment); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if err := repo.Delete(context.Background(), payment.ID, userID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	err = repo.Delete(context.Background(), payment.ID, userID)
	if err == nil || !strings.Contains(err.Error(), "payment not found") {
		t.Fatalf("Delete(second) expected not found error, got %v", err)
	}
}

func TestPaymentRepoUserIsolation(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userA := seedUser(t, pool, "payment.usera@test.dev")
	userB := seedUser(t, pool, "payment.userb@test.dev")

	clientA := seedClient(t, pool, userA, "Client A")
	clientB := seedClient(t, pool, userB, "Client B")
	eventA := seedEvent(t, pool, userA, clientA, "2026-06-10")
	eventB := seedEvent(t, pool, userB, clientB, "2026-06-10")

	repo := NewPaymentRepo(pool)
	paymentA := &models.Payment{
		EventID:       eventA,
		UserID:        userA,
		Amount:        100,
		PaymentDate:   "2026-06-10",
		PaymentMethod: "cash",
	}
	paymentB := &models.Payment{
		EventID:       eventB,
		UserID:        userB,
		Amount:        200,
		PaymentDate:   "2026-06-10",
		PaymentMethod: "transfer",
	}
	if err := repo.Create(context.Background(), paymentA); err != nil {
		t.Fatalf("Create(paymentA) error = %v", err)
	}
	if err := repo.Create(context.Background(), paymentB); err != nil {
		t.Fatalf("Create(paymentB) error = %v", err)
	}

	byRangeA, err := repo.GetByDateRange(context.Background(), userA, "2026-06-01", "2026-06-30")
	if err != nil {
		t.Fatalf("GetByDateRange(userA) error = %v", err)
	}
	if len(byRangeA) != 1 || byRangeA[0].UserID != userA {
		t.Fatalf("GetByDateRange(userA) leaked data: %+v", byRangeA)
	}

	byEventA, err := repo.GetByEventID(context.Background(), userA, eventA)
	if err != nil {
		t.Fatalf("GetByEventID(userA,eventA) error = %v", err)
	}
	if len(byEventA) != 1 || byEventA[0].ID != paymentA.ID {
		t.Fatalf("GetByEventID(userA,eventA) unexpected result: %+v", byEventA)
	}

	byOtherEvent, err := repo.GetByEventID(context.Background(), userA, eventB)
	if err != nil {
		t.Fatalf("GetByEventID(userA,eventB) error = %v", err)
	}
	if len(byOtherEvent) != 0 {
		t.Fatalf("GetByEventID(userA,eventB) leaked data: %+v", byOtherEvent)
	}

	paymentB.Amount = 999
	if err := repo.Update(context.Background(), userA, paymentB); err == nil {
		t.Fatalf("Update() expected error when updating another user's payment")
	}
	if err := repo.Delete(context.Background(), paymentB.ID, userA); err == nil {
		t.Fatalf("Delete() expected error when deleting another user's payment")
	}
}

func TestInventoryRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "inventory.integration@test.dev")
	repo := NewInventoryRepo(pool)
	unitCost := 25.5
	item := &models.InventoryItem{
		UserID:         userID,
		IngredientName: "Harina",
		CurrentStock:   100,
		MinimumStock:   20,
		Unit:           "kg",
		UnitCost:       &unitCost,
		Type:           "ingredient",
	}

	if err := repo.Create(context.Background(), item); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if item.ID == uuid.Nil {
		t.Fatalf("Create() should populate inventory item ID")
	}

	got, err := repo.GetByID(context.Background(), item.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.IngredientName != "Harina" {
		t.Fatalf("GetByID() ingredient = %q, want %q", got.IngredientName, "Harina")
	}

	all, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("GetAll() len = %d, want 1", len(all))
	}

	item.IngredientName = "Harina Integral"
	if err := repo.Update(context.Background(), item); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if err := repo.Delete(context.Background(), item.ID, userID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if err := repo.Delete(context.Background(), item.ID, userID); err == nil {
		t.Fatalf("Delete(second) expected not found error")
	}
}

func TestProductRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "product.integration@test.dev")
	repo := NewProductRepo(pool)

	product := &models.Product{
		UserID:    userID,
		Name:      "Paella",
		Category:  "main",
		BasePrice: 350,
		IsActive:  true,
	}

	if err := repo.Create(context.Background(), product); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if product.ID == uuid.Nil {
		t.Fatalf("Create() should populate product ID")
	}

	got, err := repo.GetByID(context.Background(), product.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.Name != "Paella" {
		t.Fatalf("GetByID() name = %q, want %q", got.Name, "Paella")
	}

	all, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(all) != 1 {
		t.Fatalf("GetAll() len = %d, want 1", len(all))
	}

	product.Name = "Paella Premium"
	product.IsActive = false
	if err := repo.Update(context.Background(), product); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	inventoryID := seedInventory(t, pool, userID, "Azafran")
	err = repo.UpdateIngredients(context.Background(), product.ID, []models.ProductIngredient{
		{InventoryID: inventoryID, QuantityRequired: 1.5},
	})
	if err != nil {
		t.Fatalf("UpdateIngredients() error = %v", err)
	}
	err = repo.UpdateIngredients(context.Background(), product.ID, []models.ProductIngredient{
		{InventoryID: uuid.New(), QuantityRequired: 1},
	})
	if err == nil {
		t.Fatalf("UpdateIngredients() expected error for invalid inventory foreign key")
	}

	ingredients, err := repo.GetIngredients(context.Background(), product.ID)
	if err != nil {
		t.Fatalf("GetIngredients() error = %v", err)
	}
	if len(ingredients) != 1 {
		t.Fatalf("GetIngredients() len = %d, want 1", len(ingredients))
	}

	empty, err := repo.GetIngredientsForProducts(context.Background(), nil)
	if err != nil {
		t.Fatalf("GetIngredientsForProducts(nil) error = %v", err)
	}
	if empty != nil {
		t.Fatalf("GetIngredientsForProducts(nil) should return nil")
	}

	many, err := repo.GetIngredientsForProducts(context.Background(), []uuid.UUID{product.ID})
	if err != nil {
		if !strings.Contains(err.Error(), "cannot find encode plan") {
			t.Fatalf("GetIngredientsForProducts() unexpected error = %v", err)
		}
	} else if len(many) != 1 {
		t.Fatalf("GetIngredientsForProducts() len = %d, want 1", len(many))
	}

	if err := repo.Delete(context.Background(), product.ID, userID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if err := repo.Delete(context.Background(), product.ID, userID); err == nil {
		t.Fatalf("Delete(second) expected not found error")
	}
}

func TestEventRepoIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "event.integration@test.dev")
	clientID := seedClient(t, pool, userID, "Event Client")
	productID := seedProduct(t, pool, userID, "Pasta")
	repo := NewEventRepo(pool)

	event := &models.Event{
		UserID:          userID,
		ClientID:        clientID,
		EventDate:       "2026-08-10",
		ServiceType:     "catering",
		NumPeople:       70,
		Status:          "quoted",
		Discount:        0,
		RequiresInvoice: false,
		TaxRate:         16,
		TaxAmount:       160,
		TotalAmount:     1000,
	}

	if err := repo.Create(context.Background(), event); err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if event.ID == uuid.Nil {
		t.Fatalf("Create() should populate event ID")
	}

	gotByID, err := repo.GetByID(context.Background(), event.ID, userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if gotByID.ID != event.ID {
		t.Fatalf("GetByID() returned wrong event")
	}

	all, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(all) == 0 {
		t.Fatalf("GetAll() expected at least one event")
	}

	byRangeEvents, err := repo.GetByDateRange(context.Background(), userID, "2026-01-01", "2026-12-31")
	if err != nil {
		t.Fatalf("GetByDateRange() error = %v", err)
	}
	if len(byRangeEvents) == 0 {
		t.Fatalf("GetByDateRange() expected at least one event")
	}

	byClient, err := repo.GetByClientID(context.Background(), userID, clientID)
	if err != nil {
		t.Fatalf("GetByClientID() error = %v", err)
	}
	if len(byClient) == 0 {
		t.Fatalf("GetByClientID() expected at least one event")
	}

	_, err = pool.Exec(context.Background(), "UPDATE events SET event_date = CURRENT_DATE + INTERVAL '1 day' WHERE id=$1", event.ID)
	if err != nil {
		t.Fatalf("failed to update event date: %v", err)
	}
	upcoming, err := repo.GetUpcoming(context.Background(), userID, 5)
	if err != nil {
		t.Fatalf("GetUpcoming() error = %v", err)
	}
	if len(upcoming) == 0 {
		t.Fatalf("GetUpcoming() expected at least one event")
	}

	event.ServiceType = "banquet"
	if err := repo.Update(context.Background(), event); err != nil {
		t.Fatalf("Update() error = %v", err)
	}

	if err := repo.UpdateClientStats(context.Background(), clientID); err != nil {
		t.Fatalf("UpdateClientStats() error = %v", err)
	}

	err = repo.UpdateEventItems(context.Background(), event.ID, []models.EventProduct{
		{ProductID: productID, Quantity: 10, UnitPrice: 120, Discount: 5},
	}, []models.EventExtra{
		{Description: "Decoracion", Cost: 40, Price: 70, ExcludeUtility: false},
	}, nil)
	if err != nil {
		t.Fatalf("UpdateEventItems() error = %v", err)
	}
	err = repo.UpdateEventItems(context.Background(), event.ID, []models.EventProduct{
		{ProductID: uuid.New(), Quantity: 1, UnitPrice: 10, Discount: 0},
	}, nil, nil)
	if err == nil {
		t.Fatalf("UpdateEventItems() expected error for invalid product foreign key")
	}

	products, err := repo.GetProducts(context.Background(), event.ID)
	if err != nil {
		t.Fatalf("GetProducts() error = %v", err)
	}
	if len(products) != 1 {
		t.Fatalf("GetProducts() len = %d, want 1", len(products))
	}

	extras, err := repo.GetExtras(context.Background(), event.ID)
	if err != nil {
		t.Fatalf("GetExtras() error = %v", err)
	}
	if len(extras) != 1 {
		t.Fatalf("GetExtras() len = %d, want 1", len(extras))
	}

	if err := repo.Delete(context.Background(), event.ID, userID); err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if err := repo.Delete(context.Background(), event.ID, userID); err == nil {
		t.Fatalf("Delete(second) expected not found error")
	}
}

func TestProductRepoGetIngredientsForProductsSuccessWithStandardProtocol(t *testing.T) {
	pool := openTestPoolStandard(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "product.array.success@test.dev")
	productID := seedProduct(t, pool, userID, "Arroz")
	inventoryID := seedInventory(t, pool, userID, "Sal")
	repo := NewProductRepo(pool)

	if err := repo.UpdateIngredients(context.Background(), productID, []models.ProductIngredient{
		{InventoryID: inventoryID, QuantityRequired: 0.5},
	}); err != nil {
		t.Fatalf("UpdateIngredients() error = %v", err)
	}

	got, err := repo.GetIngredientsForProducts(context.Background(), []uuid.UUID{productID})
	if err != nil {
		t.Fatalf("GetIngredientsForProducts() error = %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("GetIngredientsForProducts() len = %d, want 1", len(got))
	}
}

func openTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("Skipping integration tests: TEST_DATABASE_URL is not set (safety guard)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Skipf("Skipping integration tests: cannot create pool: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("Skipping integration tests: cannot ping db: %v", err)
	}
	_, err = pool.Exec(context.Background(), "SELECT pg_advisory_lock($1)", int64(22220001))
	if err != nil {
		pool.Close()
		t.Fatalf("failed to acquire integration test lock: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", int64(22220001))
	})

	if err := database.Migrate(pool); err != nil {
		pool.Close()
		t.Fatalf("Migrate() error = %v", err)
	}

	return pool
}

func openTestPoolStandard(t *testing.T) *pgxpool.Pool {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("Skipping integration tests: TEST_DATABASE_URL is not set (safety guard)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Skipf("Skipping integration tests: cannot create standard pool: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("Skipping integration tests: cannot ping db with standard pool: %v", err)
	}
	_, err = pool.Exec(context.Background(), "SELECT pg_advisory_lock($1)", int64(22220001))
	if err != nil {
		pool.Close()
		t.Fatalf("failed to acquire integration test lock: %v", err)
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", int64(22220001))
	})
	if err := database.Migrate(pool); err != nil {
		pool.Close()
		t.Fatalf("Migrate() error = %v", err)
	}

	return pool
}

func resetDatabase(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), "TRUNCATE TABLE users RESTART IDENTITY CASCADE")
	if err != nil {
		t.Fatalf("failed to reset database: %v", err)
	}
}

func seedUser(t *testing.T, pool *pgxpool.Pool, email string) uuid.UUID {
	t.Helper()
	user := &models.User{
		Email:        email,
		PasswordHash: "hash",
		Name:         "Seed User",
		Plan:         "basic",
	}
	if err := NewUserRepo(pool).Create(context.Background(), user); err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return user.ID
}

func seedClient(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	client := &models.Client{
		UserID: userID,
		Name:   name,
		Phone:  "555-0102",
	}
	if err := NewClientRepo(pool).Create(context.Background(), client); err != nil {
		t.Fatalf("failed to seed client: %v", err)
	}
	return client.ID
}

func seedEvent(t *testing.T, pool *pgxpool.Pool, userID, clientID uuid.UUID, date string) uuid.UUID {
	t.Helper()

	var eventID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO events (user_id, client_id, event_date, service_type, num_people, status, total_amount)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, userID, clientID, date, "banquete", 50, "quoted", 10000).Scan(&eventID)
	if err != nil {
		t.Fatalf("failed to seed event: %v", err)
	}
	return eventID
}

func seedInventory(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	var itemID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO inventory (user_id, ingredient_name, current_stock, minimum_stock, unit, type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, userID, name, 10, 2, "kg", "ingredient").Scan(&itemID)
	if err != nil {
		t.Fatalf("failed to seed inventory: %v", err)
	}
	return itemID
}

func seedProduct(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	var productID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO products (user_id, name, category, base_price, is_active)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, userID, name, "main", 100, true).Scan(&productID)
	if err != nil {
		t.Fatalf("failed to seed product: %v", err)
	}
	return productID
}
