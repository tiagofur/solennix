package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/database"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

func TestAuthHandlerIntegration(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	// Create test config for email service
	testCfg := &config.Config{
		ResendAPIKey:    "",
		ResendFromEmail: "Test <test@test.com>",
		FrontendURL:     "http://localhost:5173",
	}
	emailService := services.NewEmailService(testCfg)
	h := NewAuthHandler(userRepo, authService, emailService)

	status, body := performHandlerJSONRequest(t, http.MethodPost, "/api/auth/register", map[string]interface{}{
		"email":    "handlers.auth@test.dev",
		"password": "123456",
		"name":     "Auth User",
	}, h.Register)
	if status != http.StatusCreated {
		t.Fatalf("register status=%d body=%s", status, string(body))
	}

	status, _ = performHandlerJSONRequest(t, http.MethodPost, "/api/auth/register", map[string]interface{}{
		"email":    "handlers.auth@test.dev",
		"password": "123456",
		"name":     "Auth User",
	}, h.Register)
	if status != http.StatusConflict {
		t.Fatalf("register duplicate status=%d", status)
	}

	status, body = performHandlerJSONRequest(t, http.MethodPost, "/api/auth/login", map[string]interface{}{
		"email":    "handlers.auth@test.dev",
		"password": "123456",
	}, h.Login)
	if status != http.StatusOK {
		t.Fatalf("login status=%d body=%s", status, string(body))
	}
	refreshToken := extractNestedString(t, body, "tokens", "refresh_token")

	status, _ = performHandlerJSONRequest(t, http.MethodPost, "/api/auth/login", map[string]interface{}{
		"email":    "handlers.auth@test.dev",
		"password": "wrong",
	}, h.Login)
	if status != http.StatusUnauthorized {
		t.Fatalf("login wrong password status=%d", status)
	}

	var user models.User
	err := pool.QueryRow(context.Background(), "SELECT id, email FROM users WHERE email=$1", "handlers.auth@test.dev").Scan(&user.ID, &user.Email)
	if err != nil {
		t.Fatalf("failed to fetch created user: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, user.ID))
	rr := httptest.NewRecorder()
	h.Me(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("me status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	rr = httptest.NewRecorder()
	h.Me(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("me missing user status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = httptest.NewRequest(http.MethodPut, "/api/users/me", bytes.NewReader([]byte(`{"name":"Nuevo Nombre"}`)))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, user.ID))
	rr = httptest.NewRecorder()
	h.UpdateProfile(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update profile status=%d body=%s", rr.Code, rr.Body.String())
	}

	status, _ = performHandlerJSONRequest(t, http.MethodPost, "/api/auth/refresh", map[string]interface{}{
		"refresh_token": refreshToken,
	}, h.RefreshToken)
	if status != http.StatusOK {
		t.Fatalf("refresh status=%d", status)
	}

	status, _ = performHandlerJSONRequest(t, http.MethodPost, "/api/auth/forgot-password", map[string]interface{}{
		"email": "handlers.auth@test.dev",
	}, h.ForgotPassword)
	if status != http.StatusOK {
		t.Fatalf("forgot password status=%d", status)
	}
}

func TestCRUDHandlerIntegration(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	userID := seedHandlersUser(t, pool, "handlers.crud@test.dev")
	h := NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		repository.NewUserRepo(pool),
	)

	ctxWithUser := func(r *http.Request) *http.Request {
		return r.WithContext(context.WithValue(r.Context(), middleware.UserIDKey, userID))
	}

	// Clients
	clientBody := []byte(`{"name":"Cliente A","phone":"555-0010"}`)
	req := ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/clients", bytes.NewReader(clientBody)))
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create client status=%d body=%s", rr.Code, rr.Body.String())
	}
	clientID := extractIDFromJSON(t, rr.Body.Bytes())

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/clients", nil))
	rr = httptest.NewRecorder()
	h.ListClients(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("list clients status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/clients/"+clientID, nil)), "id", clientID)
	rr = httptest.NewRecorder()
	h.GetClient(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("get client status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/clients/"+clientID, bytes.NewReader([]byte(`{"name":"Cliente B","phone":"555-0011"}`)))), "id", clientID)
	rr = httptest.NewRecorder()
	h.UpdateClient(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update client status=%d body=%s", rr.Code, rr.Body.String())
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/clients/"+clientID, bytes.NewReader([]byte(`{"name":}`)))), "id", clientID)
	rr = httptest.NewRecorder()
	h.UpdateClient(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("update client bad body status=%d", rr.Code)
	}

	// Inventory
	req = ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/inventory", bytes.NewReader([]byte(`{"ingredient_name":"Tomate","current_stock":10,"minimum_stock":2,"unit":"kg","type":"ingredient"}`))))
	rr = httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create inventory status=%d body=%s", rr.Code, rr.Body.String())
	}
	inventoryID := extractIDFromJSON(t, rr.Body.Bytes())

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/inventory", nil))
	rr = httptest.NewRecorder()
	h.ListInventory(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("list inventory status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/inventory/"+inventoryID, nil)), "id", inventoryID)
	rr = httptest.NewRecorder()
	h.GetInventoryItem(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("get inventory status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/inventory/"+inventoryID, bytes.NewReader([]byte(`{"ingredient_name":"Tomate Cherry","current_stock":11,"minimum_stock":3,"unit":"kg","type":"ingredient"}`)))), "id", inventoryID)
	rr = httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update inventory status=%d body=%s", rr.Code, rr.Body.String())
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/inventory/"+inventoryID, bytes.NewReader([]byte(`{"ingredient_name":}`)))), "id", inventoryID)
	rr = httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("update inventory bad body status=%d", rr.Code)
	}

	// Products + ingredients
	req = ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/products", bytes.NewReader([]byte(`{"name":"Pasta","category":"main","base_price":120,"is_active":true}`))))
	rr = httptest.NewRecorder()
	h.CreateProduct(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create product status=%d body=%s", rr.Code, rr.Body.String())
	}
	productID := extractIDFromJSON(t, rr.Body.Bytes())

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/products/"+productID+"/ingredients", bytes.NewReader([]byte(`{"ingredients":[{"inventory_id":"`+inventoryID+`","quantity_required":2}]}`)))), "id", productID)
	rr = httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update product ingredients status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/products/"+productID, nil)), "id", productID)
	rr = httptest.NewRecorder()
	h.GetProduct(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("get product status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/products/"+productID, bytes.NewReader([]byte(`{"name":"Pasta Deluxe","category":"main","base_price":140,"is_active":false}`)))), "id", productID)
	rr = httptest.NewRecorder()
	h.UpdateProduct(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update product status=%d body=%s", rr.Code, rr.Body.String())
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/products/"+productID, bytes.NewReader([]byte(`{"name":}`)))), "id", productID)
	rr = httptest.NewRecorder()
	h.UpdateProduct(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("update product bad body status=%d", rr.Code)
	}

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/products", nil))
	rr = httptest.NewRecorder()
	h.ListProducts(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("list products status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/products/"+productID+"/ingredients", nil)), "id", productID)
	rr = httptest.NewRecorder()
	h.GetProductIngredients(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("get product ingredients status=%d body=%s", rr.Code, rr.Body.String())
	}

	// Events + event items
	req = ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/events", bytes.NewReader([]byte(`{"client_id":"`+clientID+`","event_date":"2026-12-01","service_type":"catering","num_people":25,"status":"quoted","discount":0,"requires_invoice":false,"tax_rate":16,"tax_amount":16,"total_amount":100}`))))
	rr = httptest.NewRecorder()
	h.CreateEvent(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create event status=%d body=%s", rr.Code, rr.Body.String())
	}
	eventID := extractIDFromJSON(t, rr.Body.Bytes())

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/events/"+eventID+"/items", bytes.NewReader([]byte(`{"products":[{"product_id":"`+productID+`","quantity":1,"unit_price":100,"discount":0}],"extras":[{"description":"Sillas","cost":10,"price":15,"exclude_utility":false}]}`)))), "id", eventID)
	rr = httptest.NewRecorder()
	h.UpdateEventItems(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update event items status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events/"+eventID+"/products", nil)), "id", eventID)
	rr = httptest.NewRecorder()
	h.GetEventProducts(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events/"+eventID+"/extras", nil)), "id", eventID)
	rr = httptest.NewRecorder()
	h.GetEventExtras(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events", nil))
	rr = httptest.NewRecorder()
	h.ListEvents(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events?client_id="+clientID, nil))
	rr = httptest.NewRecorder()
	h.ListEvents(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events?start=2026-01-01&end=2026-12-31", nil))
	rr = httptest.NewRecorder()
	h.ListEvents(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events/upcoming?limit=3", nil))
	rr = httptest.NewRecorder()
	h.GetUpcomingEvents(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/events/"+eventID, nil)), "id", eventID)
	rr = httptest.NewRecorder()
	h.GetEvent(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusNotFound)

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/events/"+eventID, bytes.NewReader([]byte(`{"client_id":"`+clientID+`","event_date":"2026-12-02","service_type":"catering","num_people":40,"status":"confirmed","discount":5,"requires_invoice":false,"tax_rate":16,"tax_amount":32,"total_amount":200}`)))), "id", eventID)
	rr = httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusNotFound, http.StatusInternalServerError)
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/events/"+eventID, bytes.NewReader([]byte(`{"client_id":}`)))), "id", eventID)
	rr = httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("update event bad body status=%d", rr.Code)
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/events/"+eventID, bytes.NewReader([]byte(`{"client_id":"`+clientID+`","event_date":"2026-12-05","service_type":"catering","num_people":40,"status":"invalid_status","discount":0,"requires_invoice":false,"tax_rate":16,"tax_amount":16,"total_amount":200}`)))), "id", eventID)
	rr = httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("update event invalid status expected 500 got %d", rr.Code)
	}

	secondClientReq := ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/clients", bytes.NewReader([]byte(`{"name":"Cliente C","phone":"555-0012"}`))))
	rr = httptest.NewRecorder()
	h.CreateClient(rr, secondClientReq)
	if rr.Code == http.StatusCreated {
		secondClientID := extractIDFromJSON(t, rr.Body.Bytes())
		req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/events/"+eventID, bytes.NewReader([]byte(`{"client_id":"`+secondClientID+`","event_date":"2026-12-03","service_type":"catering","num_people":35,"status":"confirmed","discount":0,"requires_invoice":false,"tax_rate":16,"tax_amount":16,"total_amount":120}`)))), "id", eventID)
		rr = httptest.NewRecorder()
		h.UpdateEvent(rr, req)
		assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusNotFound, http.StatusInternalServerError)
	}

	// Payments (create may fail due date scan mismatch, so seed for update/delete success)
	var paymentID uuid.UUID
	err := pool.QueryRow(context.Background(), `
		INSERT INTO payments (event_id, user_id, amount, payment_date, payment_method)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, eventID, userID, 50, "2026-12-02", "cash").Scan(&paymentID)
	if err != nil {
		t.Fatalf("failed to seed payment: %v", err)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodPut, "/api/payments/"+paymentID.String(), bytes.NewReader([]byte(`{"amount":60,"payment_date":"2026-12-03","payment_method":"transfer"}`)))), "id", paymentID.String())
	rr = httptest.NewRecorder()
	h.UpdatePayment(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("update payment status=%d body=%s", rr.Code, rr.Body.String())
	}

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/payments?event_id="+eventID, nil))
	rr = httptest.NewRecorder()
	h.ListPayments(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/payments?start=2026-01-01&end=2026-12-31", nil))
	rr = httptest.NewRecorder()
	h.ListPayments(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/payments?event_ids="+eventID, nil))
	rr = httptest.NewRecorder()
	h.ListPayments(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusOK, http.StatusInternalServerError)

	req = ctxWithUser(httptest.NewRequest(http.MethodPost, "/api/payments", bytes.NewReader([]byte(`{"event_id":"`+eventID+`","amount":80,"payment_date":"2026-12-04","payment_method":"cash"}`))))
	rr = httptest.NewRecorder()
	h.CreatePayment(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusCreated, http.StatusInternalServerError)

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/payments/"+paymentID.String(), nil)), "id", paymentID.String())
	rr = httptest.NewRecorder()
	h.DeletePayment(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete payment status=%d body=%s", rr.Code, rr.Body.String())
	}

	missingID := uuid.New().String()
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/clients/"+missingID, nil)), "id", missingID)
	rr = httptest.NewRecorder()
	h.GetClient(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("missing client status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/products/"+missingID, nil)), "id", missingID)
	rr = httptest.NewRecorder()
	h.GetProduct(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("missing product status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodGet, "/api/inventory/"+missingID, nil)), "id", missingID)
	rr = httptest.NewRecorder()
	h.GetInventoryItem(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("missing inventory status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/payments/"+missingID, nil)), "id", missingID)
	rr = httptest.NewRecorder()
	h.DeletePayment(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("missing payment delete status=%d", rr.Code)
	}

	// Cleanup deletes
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/products/"+productID, nil)), "id", productID)
	rr = httptest.NewRecorder()
	h.DeleteProduct(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete product status=%d", rr.Code)
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/products/"+productID, nil)), "id", productID)
	rr = httptest.NewRecorder()
	h.DeleteProduct(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("delete missing product status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/inventory/"+inventoryID, nil)), "id", inventoryID)
	rr = httptest.NewRecorder()
	h.DeleteInventoryItem(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete inventory status=%d", rr.Code)
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/inventory/"+inventoryID, nil)), "id", inventoryID)
	rr = httptest.NewRecorder()
	h.DeleteInventoryItem(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("delete missing inventory status=%d", rr.Code)
	}

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/events/"+eventID, nil)), "id", eventID)
	rr = httptest.NewRecorder()
	h.DeleteEvent(rr, req)
	assertStatusAllowed(t, rr.Code, http.StatusNoContent, http.StatusNotFound)

	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/clients/"+clientID, nil)), "id", clientID)
	rr = httptest.NewRecorder()
	h.DeleteClient(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("delete client status=%d", rr.Code)
	}
	req = withURLParamHandler(ctxWithUser(httptest.NewRequest(http.MethodDelete, "/api/clients/"+clientID, nil)), "id", clientID)
	rr = httptest.NewRecorder()
	h.DeleteClient(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("delete missing client status=%d", rr.Code)
	}
}

func performHandlerJSONRequest(t *testing.T, method, path string, payload interface{}, handlerFn func(http.ResponseWriter, *http.Request)) (int, []byte) {
	t.Helper()

	body, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	handlerFn(rr, req)
	return rr.Code, rr.Body.Bytes()
}

func extractNestedString(t *testing.T, body []byte, level1, level2 string) string {
	t.Helper()
	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	l1, ok := parsed[level1].(map[string]interface{})
	if !ok {
		t.Fatalf("%s missing in response: %s", level1, string(body))
	}
	value, ok := l1[level2].(string)
	if !ok || value == "" {
		t.Fatalf("%s.%s missing in response: %s", level1, level2, string(body))
	}
	return value
}

func extractIDFromJSON(t *testing.T, body []byte) string {
	t.Helper()
	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	id, ok := parsed["id"].(string)
	if !ok || id == "" {
		t.Fatalf("id missing in response: %s", string(body))
	}
	return id
}

func withURLParamHandler(req *http.Request, key, value string) *http.Request {
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add(key, value)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx)
	return req.WithContext(ctx)
}

func assertStatusAllowed(t *testing.T, got int, allowed ...int) {
	t.Helper()
	for _, code := range allowed {
		if got == code {
			return
		}
	}
	t.Fatalf("status=%d not in %v", got, allowed)
}

func openHandlersTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("Skipping integration tests: TEST_DATABASE_URL is not set (safety guard)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Skipf("Skipping integration test: cannot create pool: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("Skipping integration test: cannot ping db: %v", err)
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

func resetHandlersTestDB(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), "TRUNCATE TABLE users RESTART IDENTITY CASCADE"); err != nil {
		t.Fatalf("failed to reset database: %v", err)
	}
}

func seedHandlersUser(t *testing.T, pool *pgxpool.Pool, email string) uuid.UUID {
	t.Helper()
	user := &models.User{
		Email:        email,
		PasswordHash: "hash",
		Name:         "Handlers User",
		Plan:         "basic",
	}
	if err := repository.NewUserRepo(pool).Create(context.Background(), user); err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}
	return user.ID
}
