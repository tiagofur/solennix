package handlers

import (
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

const (
	maxSearchQueryLength    = 100
	maxSearchResultsPerType = 6
)

type SearchHandler struct {
	clientRepo    ClientRepository
	productRepo   ProductRepository
	inventoryRepo InventoryRepository
	eventRepo     FullEventRepository
}

func NewSearchHandler(
	clientRepo ClientRepository,
	productRepo ProductRepository,
	inventoryRepo InventoryRepository,
	eventRepo FullEventRepository,
) *SearchHandler {
	return &SearchHandler{
		clientRepo:    clientRepo,
		productRepo:   productRepo,
		inventoryRepo: inventoryRepo,
		eventRepo:     eventRepo,
	}
}

// SearchAll performs parallel search across clients, products, inventory, and events
func (h *SearchHandler) SearchAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	query := strings.TrimSpace(r.URL.Query().Get("q"))

	if query == "" {
		writeError(w, http.StatusBadRequest, "Query parameter 'q' is required")
		return
	}

	if len(query) > maxSearchQueryLength {
		writeError(w, http.StatusBadRequest, "Query parameter 'q' exceeds maximum length of 100 characters")
		return
	}

	// Perform searches in parallel using goroutines
	var wg sync.WaitGroup
	var mu sync.Mutex

	type searchResult struct {
		clients   []models.Client
		products  []models.Product
		inventory []models.InventoryItem
		events    []models.Event
		errors    []error
	}

	result := searchResult{
		clients:   []models.Client{},
		products:  []models.Product{},
		inventory: []models.InventoryItem{},
		events:    []models.Event{},
		errors:    []error{},
	}

	// Search clients
	wg.Add(1)
	go func() {
		defer wg.Done()
		clients, err := h.clientRepo.Search(ctx, userID, query)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			slog.Warn("Client search error", "error", err, "user_id", userID)
			result.errors = append(result.errors, err)
		} else {
			result.clients = clients
		}
	}()

	// Search products
	wg.Add(1)
	go func() {
		defer wg.Done()
		products, err := h.productRepo.Search(ctx, userID, query)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			slog.Warn("Product search error", "error", err, "user_id", userID)
			result.errors = append(result.errors, err)
		} else {
			result.products = products
		}
	}()

	// Search inventory
	wg.Add(1)
	go func() {
		defer wg.Done()
		inventory, err := h.inventoryRepo.Search(ctx, userID, query)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			slog.Warn("Inventory search error", "error", err, "user_id", userID)
			result.errors = append(result.errors, err)
		} else {
			result.inventory = inventory
		}
	}()

	// Search events
	wg.Add(1)
	go func() {
		defer wg.Done()
		events, err := h.eventRepo.Search(ctx, userID, query)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			slog.Warn("Event search error", "error", err, "user_id", userID)
			result.errors = append(result.errors, err)
		} else {
			result.events = events
		}
	}()

	wg.Wait()

	// Limit results per category to bound response size and DB amplification.
	if len(result.clients) > maxSearchResultsPerType {
		result.clients = result.clients[:maxSearchResultsPerType]
	}
	if len(result.products) > maxSearchResultsPerType {
		result.products = result.products[:maxSearchResultsPerType]
	}
	if len(result.inventory) > maxSearchResultsPerType {
		result.inventory = result.inventory[:maxSearchResultsPerType]
	}
	if len(result.events) > maxSearchResultsPerType {
		result.events = result.events[:maxSearchResultsPerType]
	}

	// Return results even if some searches failed
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"clients":   result.clients,
		"products":  result.products,
		"inventory": result.inventory,
		"events":    result.events,
	})
}
