package handlers

import (
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/eventosapp-backend/internal/middleware"
	"github.com/tiagofur/eventosapp-backend/internal/models"
	"github.com/tiagofur/eventosapp-backend/internal/repository"
)

type CRUDHandler struct {
	clientRepo    *repository.ClientRepo
	eventRepo     *repository.EventRepo
	productRepo   *repository.ProductRepo
	inventoryRepo *repository.InventoryRepo
	paymentRepo   *repository.PaymentRepo
	userRepo      *repository.UserRepo
}

func NewCRUDHandler(
	clientRepo *repository.ClientRepo,
	eventRepo *repository.EventRepo,
	productRepo *repository.ProductRepo,
	inventoryRepo *repository.InventoryRepo,
	paymentRepo *repository.PaymentRepo,
	userRepo *repository.UserRepo,
) *CRUDHandler {
	return &CRUDHandler{
		clientRepo:    clientRepo,
		eventRepo:     eventRepo,
		productRepo:   productRepo,
		inventoryRepo: inventoryRepo,
		paymentRepo:   paymentRepo,
		userRepo:      userRepo,
	}
}

// ===================
// CLIENTS
// ===================

func (h *CRUDHandler) ListClients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	clients, err := h.clientRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch clients")
		return
	}
	writeJSON(w, http.StatusOK, clients)
}

func (h *CRUDHandler) GetClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	client, err := h.clientRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Client not found")
		return
	}
	writeJSON(w, http.StatusOK, client)
}

func (h *CRUDHandler) CreateClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var client models.Client
	if err := decodeJSON(r, &client); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		count, err := h.clientRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify client limits")
			return
		}
		if count >= 50 {
			writeError(w, http.StatusForbidden, "Client limits for basic plan reached. Please upgrade to Pro.")
			return
		}
	}

	client.UserID = userID
	if err := h.clientRepo.Create(r.Context(), &client); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create client")
		return
	}
	writeJSON(w, http.StatusCreated, client)
}

func (h *CRUDHandler) UpdateClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	var client models.Client
	if err := decodeJSON(r, &client); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	client.ID = id
	client.UserID = userID
	if err := h.clientRepo.Update(r.Context(), &client); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update client")
		return
	}
	writeJSON(w, http.StatusOK, client)
}

func (h *CRUDHandler) DeleteClient(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid client ID")
		return
	}
	if err := h.clientRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Client not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===================
// EVENTS
// ===================

func (h *CRUDHandler) ListEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	clientID := r.URL.Query().Get("client_id")

	if clientID != "" {
		cid, err := uuid.Parse(clientID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid client_id")
			return
		}
		events, err := h.eventRepo.GetByClientID(r.Context(), userID, cid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}
		writeJSON(w, http.StatusOK, events)
		return
	}

	if start != "" && end != "" {
		startDate, err := normalizeDateParam(start)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid start date")
			return
		}
		endDate, err := normalizeDateParam(end)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid end date")
			return
		}
		events, err := h.eventRepo.GetByDateRange(r.Context(), userID, startDate, endDate)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch events")
			return
		}
		writeJSON(w, http.StatusOK, events)
		return
	}

	events, err := h.eventRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *CRUDHandler) GetUpcomingEvents(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	limit := 5
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	events, err := h.eventRepo.GetUpcoming(r.Context(), userID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch upcoming events")
		return
	}
	writeJSON(w, http.StatusOK, events)
}

func (h *CRUDHandler) GetEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	event, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	writeJSON(w, http.StatusOK, event)
}

func (h *CRUDHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var event models.Event
	if err := decodeJSON(r, &event); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// 1. Check user plan and limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		count, err := h.eventRepo.CountCurrentMonth(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify event limits")
			return
		}
		if count >= 3 {
			// Limit reached for basic plan
			writeError(w, http.StatusForbidden, "Event limits for basic plan reached. Please upgrade to Pro.")
			return
		}
	}

	event.UserID = userID
	if err := h.eventRepo.Create(r.Context(), &event); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create event")
		return
	}
	// Update client stats
	if err := h.eventRepo.UpdateClientStats(r.Context(), event.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", event.ClientID, "error", err)
	}
	writeJSON(w, http.StatusCreated, event)
}

func (h *CRUDHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}

	// Get existing to know old client_id
	existing, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	oldClientID := existing.ClientID

	// Decode into existing event to handle partial updates
	if err := decodeJSON(r, existing); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Ensure ID and UserID are not changed
	existing.ID = id
	existing.UserID = userID

	if err := h.eventRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update event")
		return
	}

	// Update client stats (old and new client if changed)
	if err := h.eventRepo.UpdateClientStats(r.Context(), existing.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", existing.ClientID, "error", err)
	}
	if oldClientID != existing.ClientID {
		if err := h.eventRepo.UpdateClientStats(r.Context(), oldClientID); err != nil {
			slog.Warn("Failed to update client stats", "client_id", oldClientID, "error", err)
		}
	}

	writeJSON(w, http.StatusOK, existing)
}

func (h *CRUDHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Get event to know client_id for stats update
	event, err := h.eventRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	if err := h.eventRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	if err := h.eventRepo.UpdateClientStats(r.Context(), event.ClientID); err != nil {
		slog.Warn("Failed to update client stats", "client_id", event.ClientID, "error", err)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CRUDHandler) GetEventProducts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	products, err := h.eventRepo.GetProducts(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *CRUDHandler) GetEventExtras(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}
	extras, err := h.eventRepo.GetExtras(r.Context(), eventID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch event extras")
		return
	}
	writeJSON(w, http.StatusOK, extras)
}

func (h *CRUDHandler) UpdateEventItems(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid event ID")
		return
	}
	// Verify event belongs to user
	if _, err := h.eventRepo.GetByID(r.Context(), eventID, userID); err != nil {
		writeError(w, http.StatusNotFound, "Event not found")
		return
	}

	var req struct {
		Products []models.EventProduct `json:"products"`
		Extras   []models.EventExtra   `json:"extras"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := h.eventRepo.UpdateEventItems(r.Context(), eventID, req.Products, req.Extras); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update event items")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ===================
// PRODUCTS
// ===================

func (h *CRUDHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	products, err := h.productRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch products")
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (h *CRUDHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	product, err := h.productRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (h *CRUDHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var product models.Product
	if err := decodeJSON(r, &product); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		productCount, err := h.productRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify product limits")
			return
		}
		inventoryCount, err := h.inventoryRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify inventory limits")
			return
		}
		if productCount+inventoryCount >= 20 {
			writeError(w, http.StatusForbidden, "Catalog limits for basic plan reached. Please upgrade to Pro.")
			return
		}
	}

	product.UserID = userID
	if err := h.productRepo.Create(r.Context(), &product); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create product")
		return
	}
	writeJSON(w, http.StatusCreated, product)
}

func (h *CRUDHandler) UpdateProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	var product models.Product
	if err := decodeJSON(r, &product); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	product.ID = id
	product.UserID = userID
	if err := h.productRepo.Update(r.Context(), &product); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update product")
		return
	}
	writeJSON(w, http.StatusOK, product)
}

func (h *CRUDHandler) DeleteProduct(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	if err := h.productRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *CRUDHandler) GetProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	// Verify product belongs to user
	if _, err := h.productRepo.GetByID(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	ingredients, err := h.productRepo.GetIngredients(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch ingredients")
		return
	}
	writeJSON(w, http.StatusOK, ingredients)
}

func (h *CRUDHandler) UpdateProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid product ID")
		return
	}
	// Verify product belongs to user
	if _, err := h.productRepo.GetByID(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	var req struct {
		Ingredients []models.ProductIngredient `json:"ingredients"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if err := h.productRepo.UpdateIngredients(r.Context(), id, req.Ingredients); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update ingredients")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *CRUDHandler) GetBatchProductIngredients(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var req struct {
		ProductIDs []string `json:"product_ids"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(req.ProductIDs) == 0 {
		writeJSON(w, http.StatusOK, []models.ProductIngredient{})
		return
	}

	// Parse and verify ownership of all product IDs
	var productUUIDs []uuid.UUID
	for _, idStr := range req.ProductIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid product ID: "+idStr)
			return
		}
		if _, err := h.productRepo.GetByID(r.Context(), id, userID); err != nil {
			writeError(w, http.StatusNotFound, "Product not found: "+idStr)
			return
		}
		productUUIDs = append(productUUIDs, id)
	}

	ingredients, err := h.productRepo.GetIngredientsForProducts(r.Context(), productUUIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch ingredients")
		return
	}
	writeJSON(w, http.StatusOK, ingredients)
}

// ===================
// INVENTORY
// ===================

func (h *CRUDHandler) ListInventory(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	items, err := h.inventoryRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch inventory")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *CRUDHandler) GetInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	item, err := h.inventoryRepo.GetByID(r.Context(), id, userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Inventory item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CRUDHandler) CreateInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var item models.InventoryItem
	if err := decodeJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Check limits
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch user limits")
		return
	}

	if user.Plan == "basic" {
		productCount, err := h.productRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify product limits")
			return
		}
		inventoryCount, err := h.inventoryRepo.CountByUserID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to verify inventory limits")
			return
		}
		if productCount+inventoryCount >= 20 {
			writeError(w, http.StatusForbidden, "Catalog limits for basic plan reached. Please upgrade to Pro.")
			return
		}
	}

	item.UserID = userID
	if err := h.inventoryRepo.Create(r.Context(), &item); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create inventory item")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

func (h *CRUDHandler) UpdateInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	var item models.InventoryItem
	if err := decodeJSON(r, &item); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	item.ID = id
	item.UserID = userID
	if err := h.inventoryRepo.Update(r.Context(), &item); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update inventory item")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *CRUDHandler) DeleteInventoryItem(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid inventory ID")
		return
	}
	if err := h.inventoryRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Inventory item not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ===================
// PAYMENTS
// ===================

func (h *CRUDHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	eventID := r.URL.Query().Get("event_id")
	start := r.URL.Query().Get("start")
	end := r.URL.Query().Get("end")
	eventIDs := r.URL.Query().Get("event_ids")

	if eventID != "" {
		eid, err := uuid.Parse(eventID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid event_id")
			return
		}
		payments, err := h.paymentRepo.GetByEventID(r.Context(), userID, eid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	if start != "" && end != "" {
		payments, err := h.paymentRepo.GetByDateRange(r.Context(), userID, start, end)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	if eventIDs != "" {
		// Parse comma-separated UUIDs
		var ids []uuid.UUID
		for _, s := range splitCSV(eventIDs) {
			id, err := uuid.Parse(s)
			if err != nil {
				writeError(w, http.StatusBadRequest, "Invalid event_ids")
				return
			}
			ids = append(ids, id)
		}
		if len(ids) == 0 {
			writeError(w, http.StatusBadRequest, "Invalid event_ids")
			return
		}
		payments, err := h.paymentRepo.GetByEventIDs(r.Context(), userID, ids)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
			return
		}
		writeJSON(w, http.StatusOK, payments)
		return
	}

	payments, err := h.paymentRepo.GetAll(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch payments")
		return
	}
	writeJSON(w, http.StatusOK, payments)
}

func (h *CRUDHandler) CreatePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	var payment models.Payment
	if err := decodeJSON(r, &payment); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	payment.UserID = userID
	if err := h.paymentRepo.Create(r.Context(), &payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create payment")
		return
	}
	writeJSON(w, http.StatusCreated, payment)
}

func (h *CRUDHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}
	var payment models.Payment
	if err := decodeJSON(r, &payment); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	payment.ID = id
	if err := h.paymentRepo.Update(r.Context(), userID, &payment); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update payment")
		return
	}
	writeJSON(w, http.StatusOK, payment)
}

func (h *CRUDHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}
	if err := h.paymentRepo.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusNotFound, "Payment not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Helper
func splitCSV(s string) []string {
	var result []string
	for _, part := range split(s, ",") {
		trimmed := trim(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func split(s, sep string) []string {
	return strings.Split(s, sep)
}

func trim(s string) string {
	return strings.TrimSpace(s)
}

func normalizeDateParam(value string) (string, error) {
	if value == "" {
		return "", nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t.Format("2006-01-02"), nil
	}
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return t.Format("2006-01-02"), nil
	}
	return "", fmt.Errorf("invalid date format")
}
