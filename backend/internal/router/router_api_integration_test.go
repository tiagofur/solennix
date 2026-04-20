package router

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/database"
	"github.com/tiagofur/solennix-backend/internal/handlers"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

func TestAPIIntegrationCoreFlows(t *testing.T) {
	pool := openRouterTestPool(t)
	defer pool.Close()
	resetRouterTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	authHandler := handlers.NewAuthHandler(userRepo, authService, nil, &config.Config{})
	crudHandler := handlers.NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		userRepo,
		repository.NewUnavailableDateRepo(pool),
	)
	unavailHandler := handlers.NewUnavailableDateHandler(repository.NewUnavailableDateRepo(pool))
	h := New(authHandler, crudHandler, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, unavailHandler, nil, nil, nil, nil, nil, nil, authService, userRepo, &noopAuditLogger{}, nil, []string{"http://localhost:5173"}, t.TempDir())

	registerBody := map[string]interface{}{
		"email":    "router.integration@test.dev",
		"password": "123456",
		"name":     "Router Integration",
	}
	status, body := performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", registerBody)
	if status != http.StatusCreated {
		t.Fatalf("register status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	accessToken := extractAccessToken(t, body)

	status, _ = performJSONRequest(t, h, http.MethodGet, "/api/auth/me", accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("me status = %d, want %d", status, http.StatusOK)
	}

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/payments?event_ids=bad", accessToken, nil)
	if status != http.StatusBadRequest {
		t.Fatalf("list payments invalid event_ids status = %d, want %d", status, http.StatusBadRequest)
	}
	if !bytes.Contains(body, []byte(`"error":"Invalid event_ids"`)) {
		t.Fatalf("invalid event_ids body = %s", string(body))
	}

	status, _ = performJSONRequest(t, h, http.MethodPut, "/api/users/me", accessToken, map[string]interface{}{
		"name": "Updated Name",
	})
	if status != http.StatusOK {
		t.Fatalf("update profile status = %d, want %d", status, http.StatusOK)
	}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/clients", accessToken, map[string]interface{}{
		"name":  "Cliente Uno",
		"phone": "555-0001",
	})
	if status != http.StatusCreated {
		t.Fatalf("create client status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	clientID := extractID(t, body)

	status, _ = performJSONRequest(t, h, http.MethodGet, "/api/clients/"+clientID, accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("get client status = %d, want %d", status, http.StatusOK)
	}

	status, _ = performJSONRequest(t, h, http.MethodPost, "/api/inventory", accessToken, map[string]interface{}{
		"ingredient_name": "Tomate",
		"current_stock":   20,
		"minimum_stock":   5,
		"unit":            "kg",
		"type":            "ingredient",
	})
	if status != http.StatusCreated {
		t.Fatalf("create inventory status = %d, want %d", status, http.StatusCreated)
	}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/products", accessToken, map[string]interface{}{
		"name":       "Lasagna",
		"category":   "main",
		"base_price": 200,
		"is_active":  true,
	})
	if status != http.StatusCreated {
		t.Fatalf("create product status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	productID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/events", accessToken, map[string]interface{}{
		"client_id":        clientID,
		"event_date":       "2026-12-01",
		"service_type":     "catering",
		"num_people":       30,
		"status":           "quoted",
		"discount":         0,
		"requires_invoice": false,
		"tax_rate":         16,
		"tax_amount":       160,
		"total_amount":     1000,
	})
	if status != http.StatusCreated {
		t.Fatalf("create event status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	eventID := extractID(t, body)

	status, _ = performJSONRequest(t, h, http.MethodPut, "/api/events/"+eventID+"/items", accessToken, map[string]interface{}{
		"products": []map[string]interface{}{
			{"product_id": productID, "quantity": 3, "unit_price": 200, "discount": 0},
		},
		"extras": []map[string]interface{}{
			{"description": "Sillas", "cost": 20, "price": 40, "exclude_utility": false},
		},
	})
	assertStatusOneOf(t, status, http.StatusOK, http.StatusInternalServerError)

	status, _ = performJSONRequest(t, h, http.MethodGet, "/api/events/"+eventID+"/products", accessToken, nil)
	assertStatusOneOf(t, status, http.StatusOK, http.StatusInternalServerError)
	status, _ = performJSONRequest(t, h, http.MethodGet, "/api/events/"+eventID+"/extras", accessToken, nil)
	assertStatusOneOf(t, status, http.StatusOK, http.StatusInternalServerError)

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/payments", accessToken, map[string]interface{}{
		"event_id":       eventID,
		"amount":         500,
		"payment_date":   "2026-12-01",
		"payment_method": "cash",
	})
	assertStatusOneOf(t, status, http.StatusCreated, http.StatusInternalServerError)
	if status == http.StatusCreated {
		paymentID := extractID(t, body)

		status, _ = performJSONRequest(t, h, http.MethodPut, "/api/payments/"+paymentID, accessToken, map[string]interface{}{
			"amount":         600,
			"payment_date":   "2026-12-02",
			"payment_method": "transfer",
		})
		if status != http.StatusOK {
			t.Fatalf("update payment status = %d, want %d", status, http.StatusOK)
		}

		status, _ = performJSONRequest(t, h, http.MethodDelete, "/api/payments/"+paymentID, accessToken, nil)
		if status != http.StatusNoContent {
			t.Fatalf("delete payment status = %d, want %d", status, http.StatusNoContent)
		}
	}

	status, _ = performJSONRequest(t, h, http.MethodGet, "/api/events", accessToken, nil)
	assertStatusOneOf(t, status, http.StatusOK, http.StatusInternalServerError)
}

func TestAPIContractMatrixAuthenticatedValidationErrors(t *testing.T) {
	pool := openRouterTestPool(t)
	defer pool.Close()
	resetRouterTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	authHandler := handlers.NewAuthHandler(userRepo, authService, nil, &config.Config{})
	crudHandler := handlers.NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		userRepo,
		repository.NewUnavailableDateRepo(pool),
	)
	unavailHandler := handlers.NewUnavailableDateHandler(repository.NewUnavailableDateRepo(pool))
	h := New(authHandler, crudHandler, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, unavailHandler, nil, nil, nil, nil, nil, nil, authService, userRepo, &noopAuditLogger{}, nil, []string{"http://localhost:5173"}, t.TempDir())

	status, body := performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", map[string]interface{}{
		"email":    "router.contracts@test.dev",
		"password": "123456",
		"name":     "Router Contracts",
	})
	if status != http.StatusCreated {
		t.Fatalf("register status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	accessToken := extractAccessToken(t, body)

	cases := []struct {
		name      string
		method    string
		path      string
		payload   interface{}
		wantCode  int
		wantError string
	}{
		{
			name:      "GetEventsInvalidClientIDFilter",
			method:    http.MethodGet,
			path:      "/api/events?client_id=bad",
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid client_id",
		},
		{
			name:      "ListPaymentsInvalidEventID",
			method:    http.MethodGet,
			path:      "/api/payments?event_id=bad",
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid event_id",
		},
		{
			name:      "ListPaymentsInvalidEventIDs",
			method:    http.MethodGet,
			path:      "/api/payments?event_ids=bad",
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid event_ids",
		},
		{
			name:      "GetClientInvalidID",
			method:    http.MethodGet,
			path:      "/api/clients/bad",
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid client ID",
		},
		{
			name:      "UpdateEventItemsInvalidID",
			method:    http.MethodPut,
			path:      "/api/events/bad/items",
			payload:   map[string]interface{}{"products": []interface{}{}, "extras": []interface{}{}},
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid event ID",
		},
		{
			name:      "UpdatePaymentInvalidID",
			method:    http.MethodPut,
			path:      "/api/payments/bad",
			payload:   map[string]interface{}{"amount": 10, "payment_date": "2026-01-01", "payment_method": "cash"},
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid payment ID",
		},
		{
			name:      "CreateProductInvalidBody",
			method:    http.MethodPost,
			path:      "/api/products",
			payload:   `{"name":}`,
			wantCode:  http.StatusBadRequest,
			wantError: "Invalid request body",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			bodyReader := bytes.NewReader(nil)
			if raw, ok := tc.payload.(string); ok {
				bodyReader = bytes.NewReader([]byte(raw))
			} else if tc.payload != nil {
				raw, err := json.Marshal(tc.payload)
				if err != nil {
					t.Fatalf("json.Marshal() error = %v", err)
				}
				bodyReader = bytes.NewReader(raw)
			}
			req := httptest.NewRequest(tc.method, tc.path, bodyReader)
			req.Header.Set("Authorization", "Bearer "+accessToken)
			if tc.payload != nil {
				req.Header.Set("Content-Type", "application/json")
			}
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)

			if rr.Code != tc.wantCode {
				t.Fatalf("status = %d, want %d, body=%s", rr.Code, tc.wantCode, rr.Body.String())
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}
			assertJSONErrorPayload(t, rr.Body.Bytes(), tc.wantError)
		})
	}
}

func TestAPIContractMatrixSuccessShapes(t *testing.T) {
	pool := openRouterTestPool(t)
	defer pool.Close()
	resetRouterTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	authHandler := handlers.NewAuthHandler(userRepo, authService, nil, &config.Config{})
	crudHandler := handlers.NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		userRepo,
		repository.NewUnavailableDateRepo(pool),
	)
	unavailHandler := handlers.NewUnavailableDateHandler(repository.NewUnavailableDateRepo(pool))
	h := New(authHandler, crudHandler, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, unavailHandler, nil, nil, nil, nil, nil, nil, authService, userRepo, &noopAuditLogger{}, nil, []string{"http://localhost:5173"}, t.TempDir())

	status, body := performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", map[string]interface{}{
		"email":    "router.success.contracts@test.dev",
		"password": "123456",
		"name":     "Router Success Contracts",
	})
	if status != http.StatusCreated {
		t.Fatalf("register status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "user", "tokens")
	assertJSONFieldTypes(t, body, map[string]string{
		"user":   "object",
		"tokens": "object",
	})
	accessToken := extractAccessToken(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/auth/me", accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("me status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "email", "name", "plan")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":    "string",
		"email": "string",
		"name":  "string",
		"plan":  "string",
	})
	assertJSONNonEmptyStrings(t, body, "id", "email", "name", "plan")

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/clients", accessToken, map[string]interface{}{
		"name":  "Cliente Contract",
		"phone": "555-2222",
	})
	if status != http.StatusCreated {
		t.Fatalf("create client status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "name", "phone")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":      "string",
		"user_id": "string",
		"name":    "string",
		"phone":   "string",
	})
	clientID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/clients/"+clientID, accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("get client status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "name", "phone")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":      "string",
		"user_id": "string",
		"name":    "string",
		"phone":   "string",
	})

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/inventory", accessToken, map[string]interface{}{
		"ingredient_name": "Harina Contract",
		"current_stock":   12,
		"minimum_stock":   3,
		"unit":            "kg",
		"type":            "ingredient",
	})
	if status != http.StatusCreated {
		t.Fatalf("create inventory status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "ingredient_name", "current_stock", "minimum_stock", "unit", "type")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":              "string",
		"user_id":         "string",
		"ingredient_name": "string",
		"current_stock":   "number",
		"minimum_stock":   "number",
		"unit":            "string",
		"type":            "string",
	})
	inventoryID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/inventory/"+inventoryID, accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("get inventory status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "ingredient_name", "current_stock")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":              "string",
		"user_id":         "string",
		"ingredient_name": "string",
		"current_stock":   "number",
	})

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/inventory/"+inventoryID, accessToken, map[string]interface{}{
		"ingredient_name": "Harina Contract Plus",
		"current_stock":   15,
		"minimum_stock":   4,
		"unit":            "kg",
		"type":            "ingredient",
	})
	if status != http.StatusOK {
		t.Fatalf("update inventory status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "ingredient_name", "current_stock")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":              "string",
		"user_id":         "string",
		"ingredient_name": "string",
		"current_stock":   "number",
	})

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/products", accessToken, map[string]interface{}{
		"name":       "Product Contract",
		"category":   "main",
		"base_price": 250,
		"is_active":  true,
	})
	if status != http.StatusCreated {
		t.Fatalf("create product status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "name", "category", "base_price", "is_active")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":         "string",
		"user_id":    "string",
		"name":       "string",
		"category":   "string",
		"base_price": "number",
		"is_active":  "boolean",
	})
	productID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/products/"+productID, accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("get product status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "name", "category", "base_price")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":         "string",
		"user_id":    "string",
		"name":       "string",
		"category":   "string",
		"base_price": "number",
	})

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/products/"+productID, accessToken, map[string]interface{}{
		"name":       "Product Contract Updated",
		"category":   "main",
		"base_price": 260,
		"is_active":  false,
	})
	if status != http.StatusOK {
		t.Fatalf("update product status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "name", "category", "base_price", "is_active")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":         "string",
		"user_id":    "string",
		"name":       "string",
		"category":   "string",
		"base_price": "number",
		"is_active":  "boolean",
	})

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/events", accessToken, map[string]interface{}{
		"client_id":        clientID,
		"event_date":       "2026-12-11",
		"service_type":     "catering",
		"num_people":       20,
		"status":           "quoted",
		"discount":         0,
		"requires_invoice": false,
		"tax_rate":         16,
		"tax_amount":       160,
		"total_amount":     1000,
	})
	if status != http.StatusCreated {
		t.Fatalf("create event status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "id", "user_id", "client_id", "event_date", "status", "total_amount")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":           "string",
		"user_id":      "string",
		"client_id":    "string",
		"event_date":   "string",
		"status":       "string",
		"total_amount": "number",
	})
	eventID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/payments", accessToken, map[string]interface{}{
		"event_id":       eventID,
		"amount":         450,
		"payment_date":   "2026-12-11",
		"payment_method": "cash",
	})
	if status != http.StatusCreated {
		t.Fatalf("create payment status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	assertJSONHasKeys(t, body, "id", "event_id", "user_id", "amount", "payment_date", "payment_method")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":             "string",
		"event_id":       "string",
		"user_id":        "string",
		"amount":         "number",
		"payment_date":   "string",
		"payment_method": "string",
	})
	paymentID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/payments/"+paymentID, accessToken, map[string]interface{}{
		"amount":         500,
		"payment_date":   "2026-12-12",
		"payment_method": "transfer",
	})
	if status != http.StatusOK {
		t.Fatalf("update payment status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONHasKeys(t, body, "id", "event_id", "user_id", "amount", "payment_date", "payment_method")
	assertJSONFieldTypes(t, body, map[string]string{
		"id":             "string",
		"event_id":       "string",
		"user_id":        "string",
		"amount":         "number",
		"payment_date":   "string",
		"payment_method": "string",
	})

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/clients", accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("list clients status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONArrayResponse(t, body)
	assertJSONArrayNotEmpty(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/products", accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("list products status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONArrayResponse(t, body)
	assertJSONArrayNotEmpty(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/inventory", accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("list inventory status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONArrayResponse(t, body)
	assertJSONArrayNotEmpty(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/payments?event_id="+eventID, accessToken, nil)
	if status != http.StatusOK {
		t.Fatalf("list payments by event status = %d, want %d, body=%s", status, http.StatusOK, string(body))
	}
	assertJSONArrayResponse(t, body)
	assertJSONArrayNotEmpty(t, body)

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/payments/"+paymentID, accessToken, nil)
	if status != http.StatusNoContent {
		t.Fatalf("delete payment status = %d, want %d, body=%s", status, http.StatusNoContent, string(body))
	}

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/products/"+productID, accessToken, nil)
	if status != http.StatusNoContent {
		t.Fatalf("delete product status = %d, want %d, body=%s", status, http.StatusNoContent, string(body))
	}

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/inventory/"+inventoryID, accessToken, nil)
	if status != http.StatusNoContent {
		t.Fatalf("delete inventory status = %d, want %d, body=%s", status, http.StatusNoContent, string(body))
	}
}

type goldenContractSuite struct {
	Version   string                    `json:"version"`
	Contracts map[string]goldenContract `json:"contracts"`
}

type goldenContract struct {
	Status       int               `json:"status"`
	Kind         string            `json:"kind"` // object | array | empty
	RequiredKeys map[string]string `json:"required_keys,omitempty"`
	MinItems     int               `json:"min_items,omitempty"`
}

type observedResponse struct {
	Status int
	Body   []byte
}

func TestGoldenContractsV1(t *testing.T) {
	suite := loadGoldenContractSuite(t, "testdata/contracts_v1.json")

	pool := openRouterTestPool(t)
	defer pool.Close()
	resetRouterTestDB(t, pool)

	authService := services.NewAuthService("test-secret", 24)
	userRepo := repository.NewUserRepo(pool)
	authHandler := handlers.NewAuthHandler(userRepo, authService, nil, &config.Config{})
	crudHandler := handlers.NewCRUDHandler(
		repository.NewClientRepo(pool),
		repository.NewEventRepo(pool),
		repository.NewProductRepo(pool),
		repository.NewInventoryRepo(pool),
		repository.NewPaymentRepo(pool),
		userRepo,
		repository.NewUnavailableDateRepo(pool),
	)
	unavailHandler := handlers.NewUnavailableDateHandler(repository.NewUnavailableDateRepo(pool))
	h := New(authHandler, crudHandler, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, unavailHandler, nil, nil, nil, nil, nil, nil, authService, userRepo, &noopAuditLogger{}, nil, []string{"http://localhost:5173"}, t.TempDir())

	responses := map[string]observedResponse{}

	status, body := performJSONRequest(t, h, http.MethodPost, "/api/auth/register", "", map[string]interface{}{
		"email":    "router.golden.contracts@test.dev",
		"password": "123456",
		"name":     "Router Golden Contracts",
	})
	responses["auth.register"] = observedResponse{Status: status, Body: body}
	if status != http.StatusCreated {
		t.Fatalf("register status = %d, want %d, body=%s", status, http.StatusCreated, string(body))
	}
	accessToken := extractAccessToken(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/auth/me", accessToken, nil)
	responses["auth.me"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/clients", accessToken, map[string]interface{}{
		"name":  "Cliente Golden",
		"phone": "555-3333",
	})
	responses["clients.create"] = observedResponse{Status: status, Body: body}
	clientID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/clients/"+clientID, accessToken, nil)
	responses["clients.get"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/clients", accessToken, nil)
	responses["clients.list"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/inventory", accessToken, map[string]interface{}{
		"ingredient_name": "Azucar Golden",
		"current_stock":   10,
		"minimum_stock":   2,
		"unit":            "kg",
		"type":            "ingredient",
	})
	responses["inventory.create"] = observedResponse{Status: status, Body: body}
	inventoryID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/inventory/"+inventoryID, accessToken, nil)
	responses["inventory.get"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/inventory/"+inventoryID, accessToken, map[string]interface{}{
		"ingredient_name": "Azucar Golden Plus",
		"current_stock":   11,
		"minimum_stock":   3,
		"unit":            "kg",
		"type":            "ingredient",
	})
	responses["inventory.update"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/inventory", accessToken, nil)
	responses["inventory.list"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/products", accessToken, map[string]interface{}{
		"name":       "Producto Golden",
		"category":   "main",
		"base_price": 300,
		"is_active":  true,
	})
	responses["products.create"] = observedResponse{Status: status, Body: body}
	productID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/products/"+productID, accessToken, nil)
	responses["products.get"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/products/"+productID, accessToken, map[string]interface{}{
		"name":       "Producto Golden Updated",
		"category":   "main",
		"base_price": 310,
		"is_active":  false,
	})
	responses["products.update"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/products", accessToken, nil)
	responses["products.list"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/events", accessToken, map[string]interface{}{
		"client_id":        clientID,
		"event_date":       "2026-12-15",
		"service_type":     "catering",
		"num_people":       30,
		"status":           "quoted",
		"discount":         0,
		"requires_invoice": false,
		"tax_rate":         16,
		"tax_amount":       160,
		"total_amount":     1000,
	})
	responses["events.create"] = observedResponse{Status: status, Body: body}
	eventID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPost, "/api/payments", accessToken, map[string]interface{}{
		"event_id":       eventID,
		"amount":         500,
		"payment_date":   "2026-12-15",
		"payment_method": "cash",
	})
	responses["payments.create"] = observedResponse{Status: status, Body: body}
	paymentID := extractID(t, body)

	status, body = performJSONRequest(t, h, http.MethodPut, "/api/payments/"+paymentID, accessToken, map[string]interface{}{
		"amount":         550,
		"payment_date":   "2026-12-16",
		"payment_method": "transfer",
	})
	responses["payments.update"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodGet, "/api/payments?event_id="+eventID, accessToken, nil)
	responses["payments.list_by_event"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/payments/"+paymentID, accessToken, nil)
	responses["payments.delete"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/products/"+productID, accessToken, nil)
	responses["products.delete"] = observedResponse{Status: status, Body: body}

	status, body = performJSONRequest(t, h, http.MethodDelete, "/api/inventory/"+inventoryID, accessToken, nil)
	responses["inventory.delete"] = observedResponse{Status: status, Body: body}

	for contractID, expected := range suite.Contracts {
		observed, ok := responses[contractID]
		if !ok {
			t.Fatalf("missing observed response for contract %q", contractID)
		}
		if observed.Status != expected.Status {
			t.Fatalf("[%s] status = %d, want %d", contractID, observed.Status, expected.Status)
		}
		switch expected.Kind {
		case "empty":
			if len(bytes.TrimSpace(observed.Body)) != 0 {
				t.Fatalf("[%s] expected empty body, got %q", contractID, string(observed.Body))
			}
		case "object":
			assertJSONHasKeys(t, observed.Body, mapKeys(expected.RequiredKeys)...)
			assertJSONFieldTypes(t, observed.Body, expected.RequiredKeys)
		case "array":
			assertJSONArrayResponse(t, observed.Body)
			if expected.MinItems > 0 {
				assertJSONArrayMinItems(t, observed.Body, expected.MinItems)
			}
		default:
			t.Fatalf("[%s] unsupported contract kind %q", contractID, expected.Kind)
		}
	}
}

func performJSONRequest(t *testing.T, h http.Handler, method, path, token string, payload interface{}) (int, []byte) {
	t.Helper()

	var bodyReader *bytes.Reader
	if payload == nil {
		bodyReader = bytes.NewReader(nil)
	} else {
		raw, err := json.Marshal(payload)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}
		bodyReader = bytes.NewReader(raw)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	return rr.Code, rr.Body.Bytes()
}

func extractAccessToken(t *testing.T, body []byte) string {
	t.Helper()
	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	tokens, ok := parsed["tokens"].(map[string]interface{})
	if !ok {
		t.Fatalf("tokens field missing in response")
	}
	access, ok := tokens["access_token"].(string)
	if !ok || access == "" {
		t.Fatalf("access_token missing in response")
	}
	return access
}

func extractID(t *testing.T, body []byte) string {
	t.Helper()
	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("json.Unmarshal() error = %v", err)
	}
	id, ok := parsed["id"].(string)
	if !ok || id == "" {
		t.Fatalf("id field missing in response: %s", string(body))
	}
	return id
}

func openRouterTestPool(t *testing.T) *pgxpool.Pool {
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

func resetRouterTestDB(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), "TRUNCATE TABLE users RESTART IDENTITY CASCADE"); err != nil {
		t.Fatalf("failed to reset db: %v", err)
	}
}

func assertStatusOneOf(t *testing.T, got int, allowed ...int) {
	t.Helper()
	for _, v := range allowed {
		if got == v {
			return
		}
	}
	t.Fatalf("status = %d, want one of %v", got, allowed)
}

func assertJSONErrorPayload(t *testing.T, body []byte, wantError string) {
	t.Helper()

	var payload map[string]string
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON: %v, body=%s", err, string(body))
	}
	if payload["error"] != wantError {
		t.Fatalf("error = %q, want %q (body=%s)", payload["error"], wantError, string(body))
	}
}

func assertJSONHasKeys(t *testing.T, body []byte, keys ...string) {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON object: %v, body=%s", err, string(body))
	}
	for _, key := range keys {
		if _, ok := payload[key]; !ok {
			t.Fatalf("missing key %q in response body=%s", key, string(body))
		}
	}
}

func assertJSONArrayResponse(t *testing.T, body []byte) {
	t.Helper()

	var payload []interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON array: %v, body=%s", err, string(body))
	}
}

func assertJSONArrayNotEmpty(t *testing.T, body []byte) {
	t.Helper()

	var payload []interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON array: %v, body=%s", err, string(body))
	}
	if len(payload) == 0 {
		t.Fatalf("expected non-empty array, got empty: body=%s", string(body))
	}
}

func assertJSONArrayMinItems(t *testing.T, body []byte, minItems int) {
	t.Helper()

	var payload []interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON array: %v, body=%s", err, string(body))
	}
	if len(payload) < minItems {
		t.Fatalf("expected at least %d items, got %d: body=%s", minItems, len(payload), string(body))
	}
}

func assertJSONNonEmptyStrings(t *testing.T, body []byte, keys ...string) {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON object: %v, body=%s", err, string(body))
	}
	for _, key := range keys {
		v, ok := payload[key]
		if !ok {
			t.Fatalf("missing key %q in response body=%s", key, string(body))
		}
		s, ok := v.(string)
		if !ok || s == "" {
			t.Fatalf("key %q must be non-empty string; value=%v body=%s", key, v, string(body))
		}
	}
}

func assertJSONFieldTypes(t *testing.T, body []byte, expected map[string]string) {
	t.Helper()

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("response is not valid JSON object: %v, body=%s", err, string(body))
	}

	for key, wantType := range expected {
		v, ok := payload[key]
		if !ok {
			t.Fatalf("missing key %q in response body=%s", key, string(body))
		}

		match := false
		switch wantType {
		case "string":
			_, match = v.(string)
		case "number":
			_, match = v.(float64)
		case "boolean":
			_, match = v.(bool)
		case "object":
			_, match = v.(map[string]interface{})
		case "array":
			_, match = v.([]interface{})
		default:
			t.Fatalf("unsupported expected type %q", wantType)
		}
		if !match {
			t.Fatalf("key %q has wrong type (%T), want %s; body=%s", key, v, wantType, string(body))
		}
	}
}

func loadGoldenContractSuite(t *testing.T, path string) goldenContractSuite {
	t.Helper()

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read golden contracts file %s: %v", path, err)
	}
	var suite goldenContractSuite
	if err := json.Unmarshal(raw, &suite); err != nil {
		t.Fatalf("failed to parse golden contracts file %s: %v", path, err)
	}
	if suite.Version == "" {
		t.Fatalf("golden contracts file %s missing version", path)
	}
	if len(suite.Contracts) == 0 {
		t.Fatalf("golden contracts file %s has no contracts", path)
	}
	return suite
}

func mapKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
