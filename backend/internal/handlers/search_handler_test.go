package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

func TestSearchHandler(t *testing.T) {
	// Test NewSearchHandler constructor
	t.Run("NewSearchHandler", func(t *testing.T) {
		h := NewSearchHandler(nil, nil, nil, nil)
		if h == nil {
			t.Fatal("NewSearchHandler returned nil")
		}
	})

	// Test empty query
	t.Run("SearchAll_EmptyQuery", func(t *testing.T) {
		h := &SearchHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/search?q=", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
		if !strings.Contains(rr.Body.String(), "Query parameter") {
			t.Fatalf("body = %q, expected query parameter error", rr.Body.String())
		}
	})

	// Test with closed pool (repo errors) - should still return 200 with empty results
	t.Run("SearchAll_WithClosedPool", func(t *testing.T) {
		pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
		if err != nil {
			t.Skipf("pgxpool.New failed: %v", err)
		}
		pool.Close()

		h := NewSearchHandler(
			repository.NewClientRepo(pool),
			repository.NewProductRepo(pool),
			repository.NewInventoryRepo(pool),
			repository.NewEventRepo(pool),
		)
		req := httptest.NewRequest(http.MethodGet, "/api/search?q=test", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		// SearchAll returns 200 even with errors (partial results)
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	})

	// Test missing query parameter entirely
	t.Run("SearchAll_NoQueryParam", func(t *testing.T) {
		h := &SearchHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}

func TestSearchHandler_SearchAll_HappyPaths(t *testing.T) {
	userID := uuid.New()

	t.Run("Success_AllReposReturnResults", func(t *testing.T) {
		mockClients := new(MockClientRepo)
		mockProducts := new(MockProductRepo)
		mockInventory := new(MockInventoryRepo)
		mockEvents := new(MockFullEventRepo)

		clients := []models.Client{{ID: uuid.New(), Name: "Client1"}, {ID: uuid.New(), Name: "Client2"}}
		products := []models.Product{{ID: uuid.New(), Name: "Product1"}}
		inventory := []models.InventoryItem{{ID: uuid.New(), IngredientName: "Item1"}}
		events := []models.Event{{ID: uuid.New(), ServiceType: "Catering"}}

		mockClients.On("Search", mock.Anything, userID, "test").Return(clients, nil)
		mockProducts.On("Search", mock.Anything, userID, "test").Return(products, nil)
		mockInventory.On("Search", mock.Anything, userID, "test").Return(inventory, nil)
		mockEvents.On("Search", mock.Anything, userID, "test").Return(events, nil)

		h := NewSearchHandler(mockClients, mockProducts, mockInventory, mockEvents)

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=test", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var result map[string]json.RawMessage
		err := json.Unmarshal(rr.Body.Bytes(), &result)
		assert.NoError(t, err)

		var clientsResult []models.Client
		json.Unmarshal(result["clients"], &clientsResult)
		assert.Len(t, clientsResult, 2)

		var productsResult []models.Product
		json.Unmarshal(result["products"], &productsResult)
		assert.Len(t, productsResult, 1)

		var inventoryResult []models.InventoryItem
		json.Unmarshal(result["inventory"], &inventoryResult)
		assert.Len(t, inventoryResult, 1)

		var eventsResult []models.Event
		json.Unmarshal(result["events"], &eventsResult)
		assert.Len(t, eventsResult, 1)

		mockClients.AssertExpectations(t)
		mockProducts.AssertExpectations(t)
		mockInventory.AssertExpectations(t)
		mockEvents.AssertExpectations(t)
	})

	t.Run("SomeReposFail_PartialResults", func(t *testing.T) {
		mockClients := new(MockClientRepo)
		mockProducts := new(MockProductRepo)
		mockInventory := new(MockInventoryRepo)
		mockEvents := new(MockFullEventRepo)

		clients := []models.Client{{ID: uuid.New(), Name: "Client1"}}
		mockClients.On("Search", mock.Anything, userID, "test").Return(clients, nil)
		mockProducts.On("Search", mock.Anything, userID, "test").Return(nil, fmt.Errorf("product search error"))
		mockInventory.On("Search", mock.Anything, userID, "test").Return(nil, fmt.Errorf("inventory search error"))
		mockEvents.On("Search", mock.Anything, userID, "test").Return(nil, fmt.Errorf("event search error"))

		h := NewSearchHandler(mockClients, mockProducts, mockInventory, mockEvents)

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=test", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		// Still returns 200 with partial results
		assert.Equal(t, http.StatusOK, rr.Code)

		var result map[string]json.RawMessage
		json.Unmarshal(rr.Body.Bytes(), &result)

		var clientsResult []models.Client
		json.Unmarshal(result["clients"], &clientsResult)
		assert.Len(t, clientsResult, 1)

		// Products, inventory, events should be empty arrays
		var productsResult []models.Product
		json.Unmarshal(result["products"], &productsResult)
		assert.Empty(t, productsResult)
	})

	t.Run("ResultsTruncatedTo6", func(t *testing.T) {
		mockClients := new(MockClientRepo)
		mockProducts := new(MockProductRepo)
		mockInventory := new(MockInventoryRepo)
		mockEvents := new(MockFullEventRepo)

		// Create 10 clients
		manyClients := make([]models.Client, 10)
		for i := range manyClients {
			manyClients[i] = models.Client{ID: uuid.New(), Name: fmt.Sprintf("Client%d", i)}
		}

		mockClients.On("Search", mock.Anything, userID, "many").Return(manyClients, nil)
		mockProducts.On("Search", mock.Anything, userID, "many").Return([]models.Product{}, nil)
		mockInventory.On("Search", mock.Anything, userID, "many").Return([]models.InventoryItem{}, nil)
		mockEvents.On("Search", mock.Anything, userID, "many").Return([]models.Event{}, nil)

		h := NewSearchHandler(mockClients, mockProducts, mockInventory, mockEvents)

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=many", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var result map[string]json.RawMessage
		json.Unmarshal(rr.Body.Bytes(), &result)

		var clientsResult []models.Client
		json.Unmarshal(result["clients"], &clientsResult)
		assert.Len(t, clientsResult, 6, "expected results truncated to 6")
	})

	t.Run("MissingQuery_Returns400", func(t *testing.T) {
		h := &SearchHandler{}

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Query parameter")
	})

	t.Run("AllCategoriesTruncatedTo6", func(t *testing.T) {
		mockClients := new(MockClientRepo)
		mockProducts := new(MockProductRepo)
		mockInventory := new(MockInventoryRepo)
		mockEvents := new(MockFullEventRepo)

		// Create >6 items for each category
		manyClients := make([]models.Client, 8)
		for i := range manyClients {
			manyClients[i] = models.Client{ID: uuid.New(), Name: fmt.Sprintf("Client%d", i)}
		}
		manyProducts := make([]models.Product, 9)
		for i := range manyProducts {
			manyProducts[i] = models.Product{ID: uuid.New(), Name: fmt.Sprintf("Product%d", i)}
		}
		manyInventory := make([]models.InventoryItem, 10)
		for i := range manyInventory {
			manyInventory[i] = models.InventoryItem{ID: uuid.New(), IngredientName: fmt.Sprintf("Item%d", i)}
		}
		manyEvents := make([]models.Event, 7)
		for i := range manyEvents {
			manyEvents[i] = models.Event{ID: uuid.New(), ServiceType: fmt.Sprintf("Event%d", i)}
		}

		mockClients.On("Search", mock.Anything, userID, "all").Return(manyClients, nil)
		mockProducts.On("Search", mock.Anything, userID, "all").Return(manyProducts, nil)
		mockInventory.On("Search", mock.Anything, userID, "all").Return(manyInventory, nil)
		mockEvents.On("Search", mock.Anything, userID, "all").Return(manyEvents, nil)

		h := NewSearchHandler(mockClients, mockProducts, mockInventory, mockEvents)

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=all", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var result map[string]json.RawMessage
		json.Unmarshal(rr.Body.Bytes(), &result)

		var clientsResult []models.Client
		json.Unmarshal(result["clients"], &clientsResult)
		assert.Len(t, clientsResult, 6, "clients should be truncated to 6")

		var productsResult []models.Product
		json.Unmarshal(result["products"], &productsResult)
		assert.Len(t, productsResult, 6, "products should be truncated to 6")

		var inventoryResult []models.InventoryItem
		json.Unmarshal(result["inventory"], &inventoryResult)
		assert.Len(t, inventoryResult, 6, "inventory should be truncated to 6")

		var eventsResult []models.Event
		json.Unmarshal(result["events"], &eventsResult)
		assert.Len(t, eventsResult, 6, "events should be truncated to 6")

		mockClients.AssertExpectations(t)
		mockProducts.AssertExpectations(t)
		mockInventory.AssertExpectations(t)
		mockEvents.AssertExpectations(t)
	})

	t.Run("AllReposFail_ReturnsEmptyArrays", func(t *testing.T) {
		mockClients := new(MockClientRepo)
		mockProducts := new(MockProductRepo)
		mockInventory := new(MockInventoryRepo)
		mockEvents := new(MockFullEventRepo)

		mockClients.On("Search", mock.Anything, userID, "fail").Return(nil, fmt.Errorf("client error"))
		mockProducts.On("Search", mock.Anything, userID, "fail").Return(nil, fmt.Errorf("product error"))
		mockInventory.On("Search", mock.Anything, userID, "fail").Return(nil, fmt.Errorf("inventory error"))
		mockEvents.On("Search", mock.Anything, userID, "fail").Return(nil, fmt.Errorf("event error"))

		h := NewSearchHandler(mockClients, mockProducts, mockInventory, mockEvents)

		req := httptest.NewRequest(http.MethodGet, "/api/search?q=fail", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)

		var result map[string]json.RawMessage
		json.Unmarshal(rr.Body.Bytes(), &result)

		var clientsResult []models.Client
		json.Unmarshal(result["clients"], &clientsResult)
		assert.Empty(t, clientsResult)

		var productsResult []models.Product
		json.Unmarshal(result["products"], &productsResult)
		assert.Empty(t, productsResult)

		var inventoryResult []models.InventoryItem
		json.Unmarshal(result["inventory"], &inventoryResult)
		assert.Empty(t, inventoryResult)

		var eventsResult []models.Event
		json.Unmarshal(result["events"], &eventsResult)
		assert.Empty(t, eventsResult)
	})
}
