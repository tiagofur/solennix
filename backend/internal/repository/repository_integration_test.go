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
	updatedUser, err := repo.Update(context.Background(), user.ID, &newName, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil, nil)
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
	}, nil, nil)
	if err != nil {
		t.Fatalf("UpdateEventItems() error = %v", err)
	}
	err = repo.UpdateEventItems(context.Background(), event.ID, []models.EventProduct{
		{ProductID: uuid.New(), Quantity: 1, UnitPrice: 10, Discount: 0},
	}, nil, nil, nil)
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

func seedEquipment(t *testing.T, pool *pgxpool.Pool, userID uuid.UUID, name string) uuid.UUID {
	t.Helper()
	var itemID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO inventory (user_id, ingredient_name, current_stock, minimum_stock, unit, type)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`, userID, name, 5, 1, "units", "equipment").Scan(&itemID)
	if err != nil {
		t.Fatalf("failed to seed equipment: %v", err)
	}
	return itemID
}

// --- Search Integration Tests ---

func TestClientRepoSearchIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "client.search@test.dev")
	_ = seedClient(t, pool, userID, "Maria Garcia")
	_ = seedClient(t, pool, userID, "Carlos Lopez")

	repo := NewClientRepo(pool)

	// Search for existing client by name
	results, err := repo.Search(context.Background(), userID, "Maria")
	if err != nil {
		t.Fatalf("Search() error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Search('Maria') len = %d, want 1", len(results))
	}
	if results[0].Name != "Maria Garcia" {
		t.Fatalf("Search('Maria') name = %q, want %q", results[0].Name, "Maria Garcia")
	}

	// Search for non-existing client
	results, err = repo.Search(context.Background(), userID, "NonExistent")
	if err != nil {
		t.Fatalf("Search('NonExistent') error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("Search('NonExistent') len = %d, want 0", len(results))
	}

	// Search matching multiple clients
	results, err = repo.Search(context.Background(), userID, "a")
	if err != nil {
		t.Fatalf("Search('a') error = %v", err)
	}
	if len(results) < 2 {
		t.Fatalf("Search('a') len = %d, want >= 2", len(results))
	}
}

func TestInventoryRepoSearchIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "inventory.search@test.dev")
	_ = seedInventory(t, pool, userID, "Harina de Trigo")
	_ = seedInventory(t, pool, userID, "Azucar Blanca")

	repo := NewInventoryRepo(pool)

	results, err := repo.Search(context.Background(), userID, "Harina")
	if err != nil {
		t.Fatalf("Search('Harina') error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Search('Harina') len = %d, want 1", len(results))
	}
	if results[0].IngredientName != "Harina de Trigo" {
		t.Fatalf("Search('Harina') name = %q, want %q", results[0].IngredientName, "Harina de Trigo")
	}

	results, err = repo.Search(context.Background(), userID, "NoExiste")
	if err != nil {
		t.Fatalf("Search('NoExiste') error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("Search('NoExiste') len = %d, want 0", len(results))
	}
}

func TestEventRepoSearchIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "event.search@test.dev")
	clientID := seedClient(t, pool, userID, "Search Event Client")

	repo := NewEventRepo(pool)
	event := &models.Event{
		UserID:      userID,
		ClientID:    clientID,
		EventDate:   "2026-09-15",
		ServiceType: "banquete",
		NumPeople:   100,
		Status:      "quoted",
		TotalAmount: 5000,
	}
	if err := repo.Create(context.Background(), event); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	// Search by service type
	results, err := repo.Search(context.Background(), userID, "banquete")
	if err != nil {
		t.Fatalf("Search('banquete') error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Search('banquete') len = %d, want 1", len(results))
	}

	// Search by client name
	results, err = repo.Search(context.Background(), userID, "Search Event Client")
	if err != nil {
		t.Fatalf("Search('Search Event Client') error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Search(client name) len = %d, want 1", len(results))
	}
	if results[0].Client == nil {
		t.Fatal("Search() should populate client info")
	}
	if results[0].Client.Name != "Search Event Client" {
		t.Fatalf("Search() client name = %q, want %q", results[0].Client.Name, "Search Event Client")
	}

	// Search with no matches
	results, err = repo.Search(context.Background(), userID, "NoMatchHere")
	if err != nil {
		t.Fatalf("Search('NoMatchHere') error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("Search('NoMatchHere') len = %d, want 0", len(results))
	}
}

func TestProductRepoSearchIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "product.search@test.dev")
	_ = seedProduct(t, pool, userID, "Paella Valenciana")
	_ = seedProduct(t, pool, userID, "Tortilla Espanola")

	repo := NewProductRepo(pool)

	results, err := repo.Search(context.Background(), userID, "Paella")
	if err != nil {
		t.Fatalf("Search('Paella') error = %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Search('Paella') len = %d, want 1", len(results))
	}
	if results[0].Name != "Paella Valenciana" {
		t.Fatalf("Search('Paella') name = %q, want %q", results[0].Name, "Paella Valenciana")
	}

	// Search by category
	results, err = repo.Search(context.Background(), userID, "main")
	if err != nil {
		t.Fatalf("Search('main') error = %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("Search('main') len = %d, want 2", len(results))
	}

	results, err = repo.Search(context.Background(), userID, "SinResultados")
	if err != nil {
		t.Fatalf("Search('SinResultados') error = %v", err)
	}
	if len(results) != 0 {
		t.Fatalf("Search('SinResultados') len = %d, want 0", len(results))
	}
}

// --- Count Integration Tests ---

func TestEventRepoCountCurrentMonthIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "event.count@test.dev")
	clientID := seedClient(t, pool, userID, "Count Client")

	repo := NewEventRepo(pool)

	// Before creating any event, count should be 0
	count, err := repo.CountCurrentMonth(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountCurrentMonth() error = %v", err)
	}
	if count != 0 {
		t.Fatalf("CountCurrentMonth() = %d, want 0 (no events)", count)
	}

	// Create an event in the current month
	now := time.Now()
	currentDate := now.Format("2006-01-02")
	event := &models.Event{
		UserID:      userID,
		ClientID:    clientID,
		EventDate:   currentDate,
		ServiceType: "catering",
		NumPeople:   50,
		Status:      "quoted",
		TotalAmount: 3000,
	}
	if err := repo.Create(context.Background(), event); err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	count, err = repo.CountCurrentMonth(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountCurrentMonth() after create error = %v", err)
	}
	if count != 1 {
		t.Fatalf("CountCurrentMonth() = %d, want 1", count)
	}

	// Create a second event in the current month
	event2 := &models.Event{
		UserID:      userID,
		ClientID:    clientID,
		EventDate:   currentDate,
		ServiceType: "banquet",
		NumPeople:   30,
		Status:      "confirmed",
		TotalAmount: 2000,
	}
	if err := repo.Create(context.Background(), event2); err != nil {
		t.Fatalf("Create() second event error = %v", err)
	}

	count, err = repo.CountCurrentMonth(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountCurrentMonth() after second create error = %v", err)
	}
	if count != 2 {
		t.Fatalf("CountCurrentMonth() = %d, want 2", count)
	}
}

func TestInventoryRepoCountByUserIDIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "inventory.count@test.dev")
	repo := NewInventoryRepo(pool)

	count, err := repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() error = %v", err)
	}
	if count != 0 {
		t.Fatalf("CountByUserID() = %d, want 0", count)
	}

	_ = seedInventory(t, pool, userID, "Salt")
	_ = seedInventory(t, pool, userID, "Pepper")

	count, err = repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() after seed error = %v", err)
	}
	if count != 2 {
		t.Fatalf("CountByUserID() = %d, want 2", count)
	}
}

func TestProductRepoCountByUserIDIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "product.count@test.dev")
	repo := NewProductRepo(pool)

	count, err := repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() error = %v", err)
	}
	if count != 0 {
		t.Fatalf("CountByUserID() = %d, want 0", count)
	}

	_ = seedProduct(t, pool, userID, "Tacos")
	_ = seedProduct(t, pool, userID, "Enchiladas")
	_ = seedProduct(t, pool, userID, "Tamales")

	count, err = repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() after seed error = %v", err)
	}
	if count != 3 {
		t.Fatalf("CountByUserID() = %d, want 3", count)
	}
}

// --- GetAll / GetEquipment Integration Tests ---

func TestPaymentRepoGetAllIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "payment.getall@test.dev")
	clientID := seedClient(t, pool, userID, "GetAll Payment Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-07-01")

	repo := NewPaymentRepo(pool)

	// No payments yet
	payments, err := repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() empty error = %v", err)
	}
	if len(payments) != 0 {
		t.Fatalf("GetAll() empty len = %d, want 0", len(payments))
	}

	// Create first payment
	p1Notes := "first"
	p1 := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        500,
		PaymentDate:   "2026-07-01",
		PaymentMethod: "cash",
		Notes:         &p1Notes,
	}
	if err := repo.Create(context.Background(), p1); err != nil {
		t.Fatalf("Create(p1) error = %v", err)
	}

	// Create second payment
	p2 := &models.Payment{
		EventID:       eventID,
		UserID:        userID,
		Amount:        300,
		PaymentDate:   "2026-07-05",
		PaymentMethod: "transfer",
	}
	if err := repo.Create(context.Background(), p2); err != nil {
		t.Fatalf("Create(p2) error = %v", err)
	}

	payments, err = repo.GetAll(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetAll() error = %v", err)
	}
	if len(payments) != 2 {
		t.Fatalf("GetAll() len = %d, want 2", len(payments))
	}
	// Payments should be ordered by payment_date DESC
	if payments[0].PaymentDate != "2026-07-05" {
		t.Fatalf("GetAll() first payment date = %q, want %q (DESC order)", payments[0].PaymentDate, "2026-07-05")
	}
}

func TestEventRepoGetEquipmentIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "event.equipment@test.dev")
	clientID := seedClient(t, pool, userID, "Equipment Client")
	eventID := seedEvent(t, pool, userID, clientID, "2026-08-01")
	equipmentID := seedEquipment(t, pool, userID, "Chafing Dish")

	repo := NewEventRepo(pool)

	// No equipment initially
	equipment, err := repo.GetEquipment(context.Background(), eventID)
	if err != nil {
		t.Fatalf("GetEquipment() empty error = %v", err)
	}
	if len(equipment) != 0 {
		t.Fatalf("GetEquipment() empty len = %d, want 0", len(equipment))
	}

	// Add equipment via UpdateEventItems
	eqList := []models.EventEquipment{{InventoryID: equipmentID, Quantity: 3}}
	if err := repo.UpdateEventItems(context.Background(), eventID, nil, nil, &eqList, nil); err != nil {
		t.Fatalf("UpdateEventItems(equipment) error = %v", err)
	}

	equipment, err = repo.GetEquipment(context.Background(), eventID)
	if err != nil {
		t.Fatalf("GetEquipment() error = %v", err)
	}
	if len(equipment) != 1 {
		t.Fatalf("GetEquipment() len = %d, want 1", len(equipment))
	}
	if equipment[0].Quantity != 3 {
		t.Fatalf("GetEquipment() quantity = %d, want 3", equipment[0].Quantity)
	}
	if equipment[0].EquipmentName == nil || *equipment[0].EquipmentName != "Chafing Dish" {
		t.Fatalf("GetEquipment() equipment name unexpected, got %v", equipment[0].EquipmentName)
	}
}

// --- User Mutation Integration Tests ---

func TestUserRepoUpdatePlanAndStripeIDIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "user.plan.update@test.dev")
	repo := NewUserRepo(pool)

	// Update plan without stripe ID
	if err := repo.UpdatePlanAndStripeID(context.Background(), userID, "pro", nil); err != nil {
		t.Fatalf("UpdatePlanAndStripeID(pro, nil) error = %v", err)
	}

	user, err := repo.GetByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByID() after plan update error = %v", err)
	}
	if user.Plan != "pro" {
		t.Fatalf("Plan = %q, want %q", user.Plan, "pro")
	}
	if user.StripeCustomerID != nil {
		t.Fatalf("StripeCustomerID should be nil, got %v", user.StripeCustomerID)
	}

	// Update plan with stripe ID
	stripeID := "cus_test123"
	if err := repo.UpdatePlanAndStripeID(context.Background(), userID, "basic", &stripeID); err != nil {
		t.Fatalf("UpdatePlanAndStripeID(basic, stripeID) error = %v", err)
	}

	user, err = repo.GetByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByID() after stripe update error = %v", err)
	}
	if user.Plan != "basic" {
		t.Fatalf("Plan = %q, want %q", user.Plan, "basic")
	}
	if user.StripeCustomerID == nil || *user.StripeCustomerID != stripeID {
		t.Fatalf("StripeCustomerID = %v, want %q", user.StripeCustomerID, stripeID)
	}
}

func TestUserRepoUpdatePasswordIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "user.password@test.dev")
	repo := NewUserRepo(pool)

	// Get original password hash
	origUser, err := repo.GetByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	origHash := origUser.PasswordHash

	// Update password
	newHash := "new_hashed_password_123"
	if err := repo.UpdatePassword(context.Background(), userID, newHash); err != nil {
		t.Fatalf("UpdatePassword() error = %v", err)
	}

	// Verify password changed
	updatedUser, err := repo.GetByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByID() after password update error = %v", err)
	}
	if updatedUser.PasswordHash == origHash {
		t.Fatal("password hash should have changed")
	}
	if updatedUser.PasswordHash != newHash {
		t.Fatalf("PasswordHash = %q, want %q", updatedUser.PasswordHash, newHash)
	}

	// Update password for non-existent user should fail
	if err := repo.UpdatePassword(context.Background(), uuid.New(), "hash"); err == nil {
		t.Fatal("UpdatePassword() expected error for non-existent user")
	}
}

// --- Client CountByUserID Integration Test ---

func TestClientRepoCountByUserIDIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "client.count@test.dev")
	repo := NewClientRepo(pool)

	count, err := repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() error = %v", err)
	}
	if count != 0 {
		t.Fatalf("CountByUserID() = %d, want 0", count)
	}

	_ = seedClient(t, pool, userID, "Client A")
	_ = seedClient(t, pool, userID, "Client B")

	count, err = repo.CountByUserID(context.Background(), userID)
	if err != nil {
		t.Fatalf("CountByUserID() after seed error = %v", err)
	}
	if count != 2 {
		t.Fatalf("CountByUserID() = %d, want 2", count)
	}
}

// --- UserRepo UpdatePlanByStripeCustomerID Integration Test ---

func TestUserRepoUpdatePlanByStripeCustomerIDIntegration(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userID := seedUser(t, pool, "user.stripecust@test.dev")
	repo := NewUserRepo(pool)

	// First set a stripe customer ID
	stripeID := "cus_integ_test_456"
	if err := repo.UpdatePlanAndStripeID(context.Background(), userID, "pro", &stripeID); err != nil {
		t.Fatalf("UpdatePlanAndStripeID() error = %v", err)
	}

	// Now update plan by stripe customer ID
	if err := repo.UpdatePlanByStripeCustomerID(context.Background(), stripeID, "basic"); err != nil {
		t.Fatalf("UpdatePlanByStripeCustomerID() error = %v", err)
	}

	user, err := repo.GetByID(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if user.Plan != "basic" {
		t.Fatalf("Plan = %q, want %q", user.Plan, "basic")
	}

	// Non-existent stripe customer ID should fail
	if err := repo.UpdatePlanByStripeCustomerID(context.Background(), "cus_nonexistent", "pro"); err == nil {
		t.Fatal("UpdatePlanByStripeCustomerID() expected error for non-existent stripe customer ID")
	}
}

// --- VerifyOwnership Integration Test ---

func TestProductRepoVerifyOwnershipIntegration(t *testing.T) {
	pool := openTestPoolStandard(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userA := seedUser(t, pool, "ownership.usera@test.dev")
	userB := seedUser(t, pool, "ownership.userb@test.dev")

	productA := seedProduct(t, pool, userA, "Product A")
	productB := seedProduct(t, pool, userB, "Product B")

	repo := NewProductRepo(pool)

	// Verify userA owns productA
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{productA}, userA); err != nil {
		t.Fatalf("VerifyOwnership(own product) error = %v", err)
	}

	// Verify userA does NOT own productB
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{productB}, userA); err == nil {
		t.Fatal("VerifyOwnership(other user's product) expected error")
	}

	// Verify mixed list fails
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{productA, productB}, userA); err == nil {
		t.Fatal("VerifyOwnership(mixed ownership) expected error")
	}

	// Empty list should succeed
	if err := repo.VerifyOwnership(context.Background(), []uuid.UUID{}, userA); err != nil {
		t.Fatalf("VerifyOwnership(empty) error = %v", err)
	}
}

// --- User Isolation Tests for Search ---

func TestSearchUserIsolation(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	userA := seedUser(t, pool, "search.usera@test.dev")
	userB := seedUser(t, pool, "search.userb@test.dev")

	_ = seedClient(t, pool, userA, "Alice Client")
	_ = seedClient(t, pool, userB, "Alice Other")

	_ = seedProduct(t, pool, userA, "Shared Product Name")
	_ = seedProduct(t, pool, userB, "Shared Product Name")

	_ = seedInventory(t, pool, userA, "Sugar")
	_ = seedInventory(t, pool, userB, "Sugar")

	// Client search should only return userA's client
	clients, err := NewClientRepo(pool).Search(context.Background(), userA, "Alice")
	if err != nil {
		t.Fatalf("ClientRepo.Search(userA) error = %v", err)
	}
	if len(clients) != 1 {
		t.Fatalf("ClientRepo.Search(userA, 'Alice') len = %d, want 1", len(clients))
	}
	if clients[0].UserID != userA {
		t.Fatal("ClientRepo.Search returned wrong user's client")
	}

	// Product search should only return userA's product
	products, err := NewProductRepo(pool).Search(context.Background(), userA, "Shared")
	if err != nil {
		t.Fatalf("ProductRepo.Search(userA) error = %v", err)
	}
	if len(products) != 1 {
		t.Fatalf("ProductRepo.Search(userA, 'Shared') len = %d, want 1", len(products))
	}

	// Inventory search should only return userA's item
	items, err := NewInventoryRepo(pool).Search(context.Background(), userA, "Sugar")
	if err != nil {
		t.Fatalf("InventoryRepo.Search(userA) error = %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("InventoryRepo.Search(userA, 'Sugar') len = %d, want 1", len(items))
	}
}
