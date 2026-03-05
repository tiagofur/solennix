package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

func TestCRUDHandlerErrorBranchesWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	h := NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		repository.NewUserRepo(pool),
	)
	userID := uuid.New()
	id := uuid.New().String()
	withUser := func(req *http.Request) *http.Request {
		return req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	}

	tests := []struct {
		name       string
		req        *http.Request
		call       func(*CRUDHandler, http.ResponseWriter, *http.Request)
		wantStatus int
	}{
		{"ListClientsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/clients", nil)), (*CRUDHandler).ListClients, http.StatusInternalServerError},
		{"CreateClientRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/clients", strings.NewReader(`{"name":"A","phone":"1"}`))), (*CRUDHandler).CreateClient, http.StatusInternalServerError},
		{"UpdateClientRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/clients/"+id, strings.NewReader(`{"name":"A","phone":"1"}`))), "id", id), (*CRUDHandler).UpdateClient, http.StatusInternalServerError},
		{"DeleteClientRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodDelete, "/api/clients/"+id, nil)), "id", id), (*CRUDHandler).DeleteClient, http.StatusNotFound},
		{"ListEventsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/events", nil)), (*CRUDHandler).ListEvents, http.StatusInternalServerError},
		{"GetUpcomingEventsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/events/upcoming", nil)), (*CRUDHandler).GetUpcomingEvents, http.StatusInternalServerError},
		{"GetEventRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/events/"+id, nil)), "id", id), (*CRUDHandler).GetEvent, http.StatusNotFound},
		{"UpdateEventRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/events/"+id, strings.NewReader(`{"client_id":"`+id+`","event_date":"2026-01-01","service_type":"x","num_people":10,"status":"quoted","tax_rate":16,"tax_amount":1,"total_amount":10}`))), "id", id), (*CRUDHandler).UpdateEvent, http.StatusNotFound},
		{"DeleteEventRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodDelete, "/api/events/"+id, nil)), "id", id), (*CRUDHandler).DeleteEvent, http.StatusNotFound},
		{"CreateEventRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/events", strings.NewReader(`{"client_id":"`+id+`","event_date":"2026-01-01","service_type":"x","num_people":10,"status":"quoted","tax_rate":16,"tax_amount":1,"total_amount":10}`))), (*CRUDHandler).CreateEvent, http.StatusInternalServerError},
		{"GetEventProductsRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/events/"+id+"/products", nil)), "id", id), (*CRUDHandler).GetEventProducts, http.StatusNotFound},
		{"GetEventExtrasRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/events/"+id+"/extras", nil)), "id", id), (*CRUDHandler).GetEventExtras, http.StatusNotFound},
		{"UpdateEventItemsRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/events/"+id+"/items", strings.NewReader(`{"products":[],"extras":[]}`))), "id", id), (*CRUDHandler).UpdateEventItems, http.StatusNotFound},
		{"ListProductsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/products", nil)), (*CRUDHandler).ListProducts, http.StatusInternalServerError},
		{"CreateProductRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/products", strings.NewReader(`{"name":"P","category":"c","base_price":1}`))), (*CRUDHandler).CreateProduct, http.StatusInternalServerError},
		{"UpdateProductRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/products/"+id, strings.NewReader(`{"name":"P","category":"c","base_price":1}`))), "id", id), (*CRUDHandler).UpdateProduct, http.StatusInternalServerError},
		{"DeleteProductRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodDelete, "/api/products/"+id, nil)), "id", id), (*CRUDHandler).DeleteProduct, http.StatusNotFound},
		{"GetProductIngredientsRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/products/"+id+"/ingredients", nil)), "id", id), (*CRUDHandler).GetProductIngredients, http.StatusNotFound},
		{"UpdateProductIngredientsRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/products/"+id+"/ingredients", strings.NewReader(`{"ingredients":[]}`))), "id", id), (*CRUDHandler).UpdateProductIngredients, http.StatusNotFound},
		{"ListInventoryRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/inventory", nil)), (*CRUDHandler).ListInventory, http.StatusInternalServerError},
		{"CreateInventoryRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/inventory", strings.NewReader(`{"ingredient_name":"i","current_stock":1,"minimum_stock":1,"unit":"kg","type":"ingredient"}`))), (*CRUDHandler).CreateInventoryItem, http.StatusInternalServerError},
		{"UpdateInventoryRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/inventory/"+id, strings.NewReader(`{"ingredient_name":"i","current_stock":1,"minimum_stock":1,"unit":"kg","type":"ingredient"}`))), "id", id), (*CRUDHandler).UpdateInventoryItem, http.StatusInternalServerError},
		{"DeleteInventoryRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodDelete, "/api/inventory/"+id, nil)), "id", id), (*CRUDHandler).DeleteInventoryItem, http.StatusNotFound},
		{"ListPaymentsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/payments?event_id="+id, nil)), (*CRUDHandler).ListPayments, http.StatusInternalServerError},
		{"CreatePaymentRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/payments", strings.NewReader(`{"event_id":"`+id+`","amount":10,"payment_date":"2026-01-01","payment_method":"cash"}`))), (*CRUDHandler).CreatePayment, http.StatusInternalServerError},
		{"UpdatePaymentRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodPut, "/api/payments/"+id, strings.NewReader(`{"amount":10,"payment_date":"2026-01-01","payment_method":"cash"}`))), "id", id), (*CRUDHandler).UpdatePayment, http.StatusInternalServerError},
		{"GetEventEquipmentRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/events/"+id+"/equipment", nil)), "id", id), (*CRUDHandler).GetEventEquipment, http.StatusNotFound},
		{"DeletePaymentRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodDelete, "/api/payments/"+id, nil)), "id", id), (*CRUDHandler).DeletePayment, http.StatusNotFound},
		// --- NEW: closed-pool error tests for additional repo paths ---
		{"CheckEquipmentConflictsRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/events/equipment/conflicts", strings.NewReader(`{"event_date":"2026-01-01","inventory_ids":["`+id+`"]}`))), (*CRUDHandler).CheckEquipmentConflicts, http.StatusInternalServerError},
		{"GetEquipmentSuggestionsRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/events/equipment/suggestions", strings.NewReader(`{"product_ids":["`+id+`"]}`))), (*CRUDHandler).GetEquipmentSuggestions, http.StatusInternalServerError},
		{"GetBatchProductIngredientsRepoError", withUser(httptest.NewRequest(http.MethodPost, "/api/products/ingredients/batch", strings.NewReader(`{"product_ids":["`+id+`"]}`))), (*CRUDHandler).GetBatchProductIngredients, http.StatusNotFound},
		{"GetClientRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/clients/"+id, nil)), "id", id), (*CRUDHandler).GetClient, http.StatusNotFound},
		{"GetProductRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/products/"+id, nil)), "id", id), (*CRUDHandler).GetProduct, http.StatusNotFound},
		{"GetInventoryItemRepoError", withURLParam(withUser(httptest.NewRequest(http.MethodGet, "/api/inventory/"+id, nil)), "id", id), (*CRUDHandler).GetInventoryItem, http.StatusNotFound},
		{"ListPaymentsNoFilterRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/payments", nil)), (*CRUDHandler).ListPayments, http.StatusInternalServerError},
		{"ListPaymentsDateRangeRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/payments?start=2026-01-01&end=2026-12-31", nil)), (*CRUDHandler).ListPayments, http.StatusInternalServerError},
		{"ListPaymentsEventIDsRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/payments?event_ids="+id, nil)), (*CRUDHandler).ListPayments, http.StatusInternalServerError},
		{"ListEventsDateRangeRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/events?start=2026-01-01&end=2026-12-31", nil)), (*CRUDHandler).ListEvents, http.StatusInternalServerError},
		{"ListEventsClientIDRepoError", withUser(httptest.NewRequest(http.MethodGet, "/api/events?client_id="+id, nil)), (*CRUDHandler).ListEvents, http.StatusInternalServerError},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rr := httptest.NewRecorder()
			tc.call(h, rr, tc.req)
			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d body=%s", rr.Code, tc.wantStatus, rr.Body.String())
			}
		})
	}
}
