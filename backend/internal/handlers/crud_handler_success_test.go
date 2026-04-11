package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// ---------------------------------------------------------------------------
// CreateClient — plan-based limits
// ---------------------------------------------------------------------------

func TestCreateClient_ProUser_Success(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	clientRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Client")).Return(nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
	clientRepo.AssertNotCalled(t, "CountByUserID", mock.Anything, mock.Anything)
}

func TestCreateClient_BasicUser_UnderLimit_Success(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	clientRepo.On("CountByUserID", mock.Anything, userID).Return(10, nil)
	clientRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Client")).Return(nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateClient_BasicUser_AtLimit_Forbidden(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	clientRepo.On("CountByUserID", mock.Anything, userID).Return(50, nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Fatalf("body = %q, expected to contain 'plan_limit_exceeded'", rr.Body.String())
	}
}

func TestCreateClient_GetUserError_Returns500(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(nil, errTest)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestCreateClient_CountByUserIDError_Returns500(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	clientRepo.On("CountByUserID", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateEvent — plan-based limits + validation + client stats update
// ---------------------------------------------------------------------------

func TestCreateEvent_ProUser_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	eventRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
	eventRepo.AssertNotCalled(t, "CountCurrentMonth", mock.Anything, mock.Anything)
}

func TestCreateEvent_BasicUser_UnderLimit_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	eventRepo.On("CountCurrentMonth", mock.Anything, userID).Return(2, nil)
	eventRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateEvent_BasicUser_AtLimit_Forbidden(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	eventRepo.On("CountCurrentMonth", mock.Anything, userID).Return(3, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Fatalf("body = %q, expected to contain 'plan_limit_exceeded'", rr.Body.String())
	}
}

func TestCreateEvent_CountCurrentMonthError_Returns500(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	eventRepo.On("CountCurrentMonth", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestCreateEvent_CreateRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	eventRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Event")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestCreateEvent_InvalidEventDate_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h, _, eventRepo, _, _, _, userRepo, _ := setupCRUDTest(t)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)

	body := `{"client_id":"` + clientID.String() + `","event_date":"15-06-2026","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "Invalid event_date format") {
		t.Fatalf("body = %q, expected invalid event_date message", rr.Body.String())
	}
	eventRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestCreateEvent_UnavailableDateOverlap_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h, _, eventRepo, _, _, _, userRepo, unavailRepo := setupCRUDTest(t)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	unavailRepo.ExpectedCalls = nil
	unavailRepo.On("GetByDateRange", mock.Anything, userID, "2026-06-15", "2026-06-15").Return([]models.UnavailableDate{{
		ID:        uuid.New(),
		UserID:    userID,
		StartDate: "2026-06-15",
		EndDate:   "2026-06-15",
	}}, nil)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "Date range overlaps with unavailable dates") {
		t.Fatalf("body = %q, expected overlap message", rr.Body.String())
	}
	eventRepo.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

// ---------------------------------------------------------------------------
// UpdateEvent — full update flow including client change
// ---------------------------------------------------------------------------

func TestUpdateEvent_Success_SameClient(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()

	eventRepo := new(MockFullEventRepo)
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)
	eventRepo.On("DeductSupplyStock", mock.Anything, eventID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	// UpdateClientStats should only be called once (same client)
	eventRepo.AssertNumberOfCalls(t, "UpdateClientStats", 1)
}

func TestUpdateEvent_Success_ClientChanged(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	oldClientID := uuid.New()
	newClientID := uuid.New()

	eventRepo := new(MockFullEventRepo)
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: oldClientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, newClientID).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, oldClientID).Return(nil)
	eventRepo.On("DeductSupplyStock", mock.Anything, eventID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + newClientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	// UpdateClientStats should be called twice (old and new client)
	eventRepo.AssertNumberOfCalls(t, "UpdateClientStats", 2)
}

func TestUpdateEvent_GetByIDError_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + uuid.New().String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}
}

func TestUpdateEvent_InvalidBody_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), `{bad json`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
}

func TestUpdateEvent_ValidationError_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// num_people = 0 triggers validation error
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":0,"status":"quoted","tax_rate":16,"tax_amount":0,"total_amount":0}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
}

func TestUpdateEvent_UpdateRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// DeleteEvent — full flow including client stats
// ---------------------------------------------------------------------------

func TestDeleteEvent_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: clientID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Delete", mock.Anything, eventID, userID).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String(), "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEvent(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNoContent, rr.Body.String())
	}
}

func TestDeleteEvent_GetByIDError_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String(), "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEvent(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}
}

func TestDeleteEvent_DeleteRepoError_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: clientID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Delete", mock.Anything, eventID, userID).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String(), "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEvent(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateProduct — plan-based catalog limits
// ---------------------------------------------------------------------------

func TestCreateProduct_ProUser_Success(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateProduct_BasicUser_UnderLimit_Success(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateProduct_BasicUser_AtCatalogLimit_Forbidden(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(15, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Fatalf("body = %q, expected to contain 'plan_limit_exceeded'", rr.Body.String())
	}
}

func TestCreateProduct_ProductCountError_Returns500(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestCreateProduct_InventoryCountError_Returns500(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateInventoryItem — plan-based catalog limits
// ---------------------------------------------------------------------------

func TestCreateInventoryItem_ProUser_Success(t *testing.T) {
	userID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	inventoryRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.InventoryItem")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateInventoryItem_BasicUser_UnderLimit_Success(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	inventoryRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.InventoryItem")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestCreateInventoryItem_BasicUser_AtCatalogLimit_Forbidden(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(10, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(10, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusForbidden, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateEventItems — success with products, extras, and equipment
// ---------------------------------------------------------------------------

func TestUpdateEventItems_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	productID := uuid.New()
	inventoryID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("UpdateEventItems", mock.Anything, eventID,
		mock.AnythingOfType("[]models.EventProduct"),
		mock.AnythingOfType("[]models.EventExtra"),
		mock.AnythingOfType("*[]models.EventEquipment"),
		mock.Anything, // supplies
	).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{
		"products":[{"product_id":"` + productID.String() + `","quantity":5,"unit_price":100,"discount":0}],
		"extras":[{"description":"Decoration","cost":50,"price":100}],
		"equipment":[{"inventory_id":"` + inventoryID.String() + `","quantity":2}]
	}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("body = %q, expected to contain status ok", rr.Body.String())
	}
}

func TestUpdateEventItems_EmptyLists_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("UpdateEventItems", mock.Anything, eventID,
		mock.AnythingOfType("[]models.EventProduct"),
		mock.AnythingOfType("[]models.EventExtra"),
		mock.Anything, // equipment can be nil
		mock.Anything, // supplies can be nil
	).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[],"extras":[]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestUpdateEventItems_InvalidProduct_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// quantity = 0 triggers validation error
	body := `{"products":[{"product_id":"` + uuid.New().String() + `","quantity":0,"unit_price":100}],"extras":[]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "products[0]") {
		t.Fatalf("body = %q, expected to contain 'products[0]'", rr.Body.String())
	}
}

func TestUpdateEventItems_InvalidExtra_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// empty description triggers validation error
	body := `{"products":[],"extras":[{"description":"","cost":10,"price":20}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "extras[0]") {
		t.Fatalf("body = %q, expected to contain 'extras[0]'", rr.Body.String())
	}
}

func TestUpdateEventItems_InvalidEquipment_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// quantity = 0 triggers equipment validation error
	body := `{"products":[],"extras":[],"equipment":[{"inventory_id":"` + uuid.New().String() + `","quantity":0}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "equipment[0]") {
		t.Fatalf("body = %q, expected to contain 'equipment[0]'", rr.Body.String())
	}
}

func TestUpdateEventItems_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: uuid.New()}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("UpdateEventItems", mock.Anything, eventID,
		mock.AnythingOfType("[]models.EventProduct"),
		mock.AnythingOfType("[]models.EventExtra"),
		mock.Anything, // equipment
		mock.Anything, // supplies
	).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[],"extras":[]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestUpdateEventItems_EventNotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[],"extras":[]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetEventProducts / GetEventExtras / GetEventEquipment — success paths
// ---------------------------------------------------------------------------

func TestGetEventProducts_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetProducts", mock.Anything, eventID).Return([]models.EventProduct{
		{ID: uuid.New(), EventID: eventID, Quantity: 5, UnitPrice: 100},
	}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/products", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventProducts(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetEventProducts_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetProducts", mock.Anything, eventID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/products", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventProducts(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestGetEventExtras_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetExtras", mock.Anything, eventID).Return([]models.EventExtra{
		{ID: uuid.New(), EventID: eventID, Description: "Decoration", Cost: 50, Price: 100},
	}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/extras", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventExtras(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetEventExtras_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetExtras", mock.Anything, eventID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/extras", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventExtras(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestGetEventEquipment_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetEquipment", mock.Anything, eventID).Return([]models.EventEquipment{
		{ID: uuid.New(), EventID: eventID, Quantity: 3},
	}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/equipment", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventEquipment(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetEventEquipment_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetEquipment", mock.Anything, eventID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/equipment", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventEquipment(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateProductIngredients — success path
// ---------------------------------------------------------------------------

func TestUpdateProductIngredients_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	inventoryID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)
	productRepo.On("UpdateIngredients", mock.Anything, productID, mock.AnythingOfType("[]models.ProductIngredient")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"ingredients":[{"inventory_id":"` + inventoryID.String() + `","quantity_required":2.5}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String()+"/ingredients", body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestUpdateProductIngredients_InvalidIngredient_Returns400(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// quantity_required = 0 triggers validation error
	body := `{"ingredients":[{"inventory_id":"` + uuid.New().String() + `","quantity_required":0}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String()+"/ingredients", body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "ingredients[0]") {
		t.Fatalf("body = %q, expected to contain 'ingredients[0]'", rr.Body.String())
	}
}

func TestUpdateProductIngredients_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)
	productRepo.On("UpdateIngredients", mock.Anything, productID, mock.AnythingOfType("[]models.ProductIngredient")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"ingredients":[{"inventory_id":"` + uuid.New().String() + `","quantity_required":2.5}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String()+"/ingredients", body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestUpdateProductIngredients_ProductNotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"ingredients":[]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String()+"/ingredients", body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
	}
}

func TestUpdateProductIngredients_InvalidBody_Returns400(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String()+"/ingredients", `{bad`, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProductIngredients(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetProductIngredients — success path
// ---------------------------------------------------------------------------

func TestGetProductIngredients_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)
	productRepo.On("GetIngredients", mock.Anything, productID).Return([]models.ProductIngredient{
		{ID: uuid.New(), ProductID: productID, QuantityRequired: 2.5},
	}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/products/"+productID.String()+"/ingredients", "", productID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetProductIngredients(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetProductIngredients_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)
	productRepo.On("GetIngredients", mock.Anything, productID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/products/"+productID.String()+"/ingredients", "", productID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetProductIngredients(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetUpcomingEvents — limit parameter handling
// ---------------------------------------------------------------------------

func TestGetUpcomingEvents_DefaultLimit(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetUpcoming", mock.Anything, userID, 5).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events/upcoming", "", userID)
	rr := httptest.NewRecorder()
	h.GetUpcomingEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	eventRepo.AssertCalled(t, "GetUpcoming", mock.Anything, userID, 5)
}

func TestGetUpcomingEvents_CustomLimit(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetUpcoming", mock.Anything, userID, 10).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events/upcoming?limit=10", "", userID)
	rr := httptest.NewRecorder()
	h.GetUpcomingEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	eventRepo.AssertCalled(t, "GetUpcoming", mock.Anything, userID, 10)
}

func TestGetUpcomingEvents_InvalidLimit_UsesDefault(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetUpcoming", mock.Anything, userID, 5).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events/upcoming?limit=abc", "", userID)
	rr := httptest.NewRecorder()
	h.GetUpcomingEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	eventRepo.AssertCalled(t, "GetUpcoming", mock.Anything, userID, 5)
}

func TestGetUpcomingEvents_ZeroLimit_UsesDefault(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	// Zero is not > 0, so default 5 is used
	eventRepo.On("GetUpcoming", mock.Anything, userID, 5).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events/upcoming?limit=0", "", userID)
	rr := httptest.NewRecorder()
	h.GetUpcomingEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
	eventRepo.AssertCalled(t, "GetUpcoming", mock.Anything, userID, 5)
}

// ---------------------------------------------------------------------------
// ListPayments — filter paths
// ---------------------------------------------------------------------------

func TestListPayments_ByEventID_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return([]models.Payment{
		{ID: uuid.New(), EventID: eventID, Amount: 500},
	}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/payments?event_id="+eventID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.ListPayments(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListPayments_ByDateRange_Success(t *testing.T) {
	userID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("GetByDateRange", mock.Anything, userID, "2026-01-01", "2026-12-31").Return([]models.Payment{}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/payments?start=2026-01-01&end=2026-12-31", "", userID)
	rr := httptest.NewRecorder()
	h.ListPayments(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListPayments_ByEventIDs_Success(t *testing.T) {
	userID := uuid.New()
	eventID1 := uuid.New()
	eventID2 := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("GetByEventIDs", mock.Anything, userID, mock.AnythingOfType("[]uuid.UUID")).Return([]models.Payment{
		{ID: uuid.New(), EventID: eventID1, Amount: 500},
	}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/payments?event_ids="+eventID1.String()+","+eventID2.String(), "", userID)
	rr := httptest.NewRecorder()
	h.ListPayments(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListPayments_NoFilters_Success(t *testing.T) {
	userID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("GetAll", mock.Anything, userID).Return([]models.Payment{}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/payments", "", userID)
	rr := httptest.NewRecorder()
	h.ListPayments(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListPayments_GetAllError_Returns500(t *testing.T) {
	userID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("GetAll", mock.Anything, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/payments", "", userID)
	rr := httptest.NewRecorder()
	h.ListPayments(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// ListEvents — date range normalization and client_id filter
// ---------------------------------------------------------------------------

func TestListEvents_DateRange_RFC3339_Success(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByDateRange", mock.Anything, userID, "2026-01-01", "2026-12-31").Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events?start=2026-01-01T00:00:00Z&end=2026-12-31T23:59:59Z", "", userID)
	rr := httptest.NewRecorder()
	h.ListEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListEvents_DateRange_PlainDate_Success(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByDateRange", mock.Anything, userID, "2026-03-01", "2026-03-31").Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events?start=2026-03-01&end=2026-03-31", "", userID)
	rr := httptest.NewRecorder()
	h.ListEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListEvents_ByClientID_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByClientID", mock.Anything, userID, clientID).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events?client_id="+clientID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.ListEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestListEvents_NoFilters_Success(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetAll", mock.Anything, userID).Return([]models.Event{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/events", "", userID)
	rr := httptest.NewRecorder()
	h.ListEvents(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// List and CRUD success paths — Clients, Products, Inventory
// ---------------------------------------------------------------------------

func TestListClients_Success(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)

	clientRepo.On("GetAll", mock.Anything, userID).Return([]models.Client{
		{ID: uuid.New(), UserID: userID, Name: "Client A"},
	}, nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/clients", "", userID)
	rr := httptest.NewRecorder()
	h.ListClients(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetClient_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	clientRepo := new(MockClientRepo)

	clientRepo.On("GetByID", mock.Anything, clientID, userID).Return(&models.Client{ID: clientID, UserID: userID, Name: "Client A"}, nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/clients/"+clientID.String(), "", clientID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetClient(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestUpdateClient_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	clientRepo := new(MockClientRepo)

	clientRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Client")).Return(nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"name":"Updated Client","phone":"555-9999"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/clients/"+clientID.String(), body, clientID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateClient(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestDeleteClient_Success(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	clientRepo := new(MockClientRepo)

	clientRepo.On("Delete", mock.Anything, clientID, userID).Return(nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/clients/"+clientID.String(), "", clientID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteClient(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNoContent, rr.Body.String())
	}
}

func TestListProducts_Success(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetAll", mock.Anything, userID).Return([]models.Product{}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/products", "", userID)
	rr := httptest.NewRecorder()
	h.ListProducts(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetProduct_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("GetByID", mock.Anything, productID, userID).Return(&models.Product{ID: productID, UserID: userID, Name: "Tacos", Category: "main"}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/products/"+productID.String(), "", productID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetProduct(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestUpdateProduct_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"name":"Updated Tacos","category":"main_course","base_price":200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestDeleteProduct_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("Delete", mock.Anything, productID, userID).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/products/"+productID.String(), "", productID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteProduct(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNoContent, rr.Body.String())
	}
}

func TestListInventory_Success(t *testing.T) {
	userID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)

	inventoryRepo.On("GetAll", mock.Anything, userID).Return([]models.InventoryItem{}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithUserID(http.MethodGet, "/api/inventory", "", userID)
	rr := httptest.NewRecorder()
	h.ListInventory(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetInventoryItem_Success(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)

	inventoryRepo.On("GetByID", mock.Anything, itemID, userID).Return(&models.InventoryItem{ID: itemID, UserID: userID, IngredientName: "Flour", Unit: "kg", Type: "ingredient"}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/inventory/"+itemID.String(), "", itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetInventoryItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestUpdateInventoryItem_Success(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)

	inventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.InventoryItem")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"ingredient_name":"Flour","current_stock":200,"minimum_stock":20,"unit":"kg","type":"ingredient"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestDeleteInventoryItem_Success(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)

	inventoryRepo.On("Delete", mock.Anything, itemID, userID).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/inventory/"+itemID.String(), "", itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteInventoryItem(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNoContent, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// Payment CRUD success paths
// ---------------------------------------------------------------------------

func TestCreatePayment_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Payment")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	body := `{"event_id":"` + eventID.String() + `","amount":500,"payment_date":"2026-06-15","payment_method":"cash"}`
	req := makeReqWithUserID(http.MethodPost, "/api/payments", body, userID)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}
}

func TestUpdatePayment_Success(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	eventID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("Update", mock.Anything, userID, mock.AnythingOfType("*models.Payment")).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	body := `{"event_id":"` + eventID.String() + `","amount":750,"payment_date":"2026-06-15","payment_method":"transfer"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestDeletePayment_Success(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("Delete", mock.Anything, paymentID, userID).Return(nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/payments/"+paymentID.String(), "", paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeletePayment(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNoContent, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetEvent — success path
// ---------------------------------------------------------------------------

func TestGetEvent_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(&models.Event{
		ID: eventID, UserID: userID, EventDate: "2026-06-15",
		ServiceType: "catering", NumPeople: 50, Status: "quoted",
	}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String(), "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEvent(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// normalizeDateParam — edge cases
// ---------------------------------------------------------------------------

func TestNormalizeDateParam_EmptyString(t *testing.T) {
	got, err := normalizeDateParam("")
	if err != nil {
		t.Fatalf("normalizeDateParam('') returned error: %v", err)
	}
	if got != "" {
		t.Fatalf("normalizeDateParam('') = %q, want empty string", got)
	}
}

func TestNormalizeDateParam_RFC3339WithTimezone(t *testing.T) {
	got, err := normalizeDateParam("2026-06-15T14:30:00-06:00")
	if err != nil {
		t.Fatalf("normalizeDateParam() returned error: %v", err)
	}
	if got != "2026-06-15" {
		t.Fatalf("normalizeDateParam() = %q, want '2026-06-15'", got)
	}
}

func TestNormalizeDateParam_PlainDate(t *testing.T) {
	got, err := normalizeDateParam("2026-12-25")
	if err != nil {
		t.Fatalf("normalizeDateParam() returned error: %v", err)
	}
	if got != "2026-12-25" {
		t.Fatalf("normalizeDateParam() = %q, want '2026-12-25'", got)
	}
}

func TestNormalizeDateParam_InvalidFormat(t *testing.T) {
	_, err := normalizeDateParam("15/06/2026")
	if err == nil {
		t.Fatal("normalizeDateParam() expected error for '15/06/2026'")
	}
}

func TestNormalizeDateParam_GarbageInput(t *testing.T) {
	_, err := normalizeDateParam("not-a-date")
	if err == nil {
		t.Fatal("normalizeDateParam() expected error for 'not-a-date'")
	}
}

// ---------------------------------------------------------------------------
// Response body structure checks
// ---------------------------------------------------------------------------

func TestCreateClient_ResponseBodyHasUserID(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	clientRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Client")).Return(nil)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}

	var resp models.Client
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.UserID != userID {
		t.Fatalf("response user_id = %s, want %s", resp.UserID, userID)
	}
	if resp.Name != "Test Client" {
		t.Fatalf("response name = %q, want 'Test Client'", resp.Name)
	}
}

func TestCreateEvent_ResponseBodyHasEventFields(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	eventRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusCreated, rr.Body.String())
	}

	var resp models.Event
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.UserID != userID {
		t.Fatalf("response user_id = %s, want %s", resp.UserID, userID)
	}
	if resp.ClientID != clientID {
		t.Fatalf("response client_id = %s, want %s", resp.ClientID, clientID)
	}
	if resp.NumPeople != 50 {
		t.Fatalf("response num_people = %d, want 50", resp.NumPeople)
	}
}

// ---------------------------------------------------------------------------
// CheckEquipmentConflicts — success path
// ---------------------------------------------------------------------------

func TestCheckEquipmentConflicts_Success(t *testing.T) {
	userID := uuid.New()
	invID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("CheckEquipmentConflicts", mock.Anything, userID, "2026-06-15",
		mock.Anything, mock.Anything,
		mock.AnythingOfType("[]uuid.UUID"),
		mock.Anything,
	).Return([]models.EquipmentConflict{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"event_date":"2026-06-15","inventory_ids":["` + invID.String() + `"]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-conflicts", body, userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflicts(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetEquipmentSuggestions — success path
// ---------------------------------------------------------------------------

func TestGetEquipmentSuggestions_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID,
		mock.AnythingOfType("[]repository.ProductQuantity"),
	).Return([]models.EquipmentSuggestion{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[{"product_id":"` + productID.String() + `","quantity":5}]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestions(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// GetBatchProductIngredients — success path
// ---------------------------------------------------------------------------

func TestGetBatchProductIngredients_Success(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("VerifyOwnership", mock.Anything, mock.AnythingOfType("[]uuid.UUID"), userID).Return(nil)
	productRepo.On("GetIngredientsForProducts", mock.Anything, mock.AnythingOfType("[]uuid.UUID")).Return([]models.ProductIngredient{
		{ID: uuid.New(), ProductID: productID, QuantityRequired: 2.5},
	}, nil)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"product_ids":["` + productID.String() + `"]}`
	req := makeReqWithUserID(http.MethodPost, "/api/products/batch-ingredients", body, userID)
	rr := httptest.NewRecorder()
	h.GetBatchProductIngredients(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusOK, rr.Body.String())
	}
}

func TestGetBatchProductIngredients_GetIngredientsError_Returns500(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("VerifyOwnership", mock.Anything, mock.AnythingOfType("[]uuid.UUID"), userID).Return(nil)
	productRepo.On("GetIngredientsForProducts", mock.Anything, mock.AnythingOfType("[]uuid.UUID")).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"product_ids":["` + productID.String() + `"]}`
	req := makeReqWithUserID(http.MethodPost, "/api/products/batch-ingredients", body, userID)
	rr := httptest.NewRecorder()
	h.GetBatchProductIngredients(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateClient_CreateRepoError — verifies repo create error
// ---------------------------------------------------------------------------

func TestCreateClient_CreateRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	clientRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Client")).Return(errTest)

	h := newTestHandler(clientRepo, new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Test Client","phone":"555-1234"}`
	req := makeReqWithUserID(http.MethodPost, "/api/clients", body, userID)
	rr := httptest.NewRecorder()
	h.CreateClient(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateInventoryItem — validation and intermediate error paths
// ---------------------------------------------------------------------------

func TestCreateInventoryItem_ValidationError_MissingName_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// ingredient_name is empty — triggers validation error
	body := `{"ingredient_name":"","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "ingredient_name") {
		t.Fatalf("body = %q, expected to contain 'ingredient_name'", rr.Body.String())
	}
}

func TestCreateInventoryItem_ValidationError_NegativeStock_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// current_stock = -1 triggers validation error
	body := `{"ingredient_name":"Flour","current_stock":-1,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "current_stock") {
		t.Fatalf("body = %q, expected to contain 'current_stock'", rr.Body.String())
	}
}

func TestCreateInventoryItem_ValidationError_InvalidType_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// type = "invalid" triggers validation error
	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"invalid"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "type") {
		t.Fatalf("body = %q, expected to contain 'type'", rr.Body.String())
	}
}

func TestCreateInventoryItem_GetUserError_Returns500(t *testing.T) {
	userID := uuid.New()
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

func TestCreateInventoryItem_ProductCountError_Returns500(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "product limits") {
		t.Fatalf("body = %q, expected to contain 'product limits'", rr.Body.String())
	}
}

func TestCreateInventoryItem_InventoryCountError_Returns500(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	productRepo.On("CountByUserID", mock.Anything, userID).Return(5, nil)
	inventoryRepo.On("CountByUserID", mock.Anything, userID).Return(0, errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "inventory limits") {
		t.Fatalf("body = %q, expected to contain 'inventory limits'", rr.Body.String())
	}
}

func TestCreateInventoryItem_CreateRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	inventoryRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.InventoryItem")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), userRepo)

	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithUserID(http.MethodPost, "/api/inventory", body, userID)
	rr := httptest.NewRecorder()
	h.CreateInventoryItem(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusInternalServerError, rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateProduct — validation error path
// ---------------------------------------------------------------------------

func TestUpdateProduct_ValidationError_MissingName_Returns400(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// name is empty — triggers validation error
	body := `{"name":"","category":"main_course","base_price":150}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "name") {
		t.Fatalf("body = %q, expected to contain 'name'", rr.Body.String())
	}
}

func TestUpdateProduct_ValidationError_NegativePrice_Returns400(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// base_price = -10 triggers validation error
	body := `{"name":"Tacos","category":"main_course","base_price":-10}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "base_price") {
		t.Fatalf("body = %q, expected to contain 'base_price'", rr.Body.String())
	}
}

func TestUpdateProduct_ValidationError_MissingCategory_Returns400(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// category is empty — triggers validation error
	body := `{"name":"Tacos","category":"","base_price":150}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "category") {
		t.Fatalf("body = %q, expected to contain 'category'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateInventoryItem — validation error path
// ---------------------------------------------------------------------------

func TestUpdateInventoryItem_ValidationError_MissingName_Returns400(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// ingredient_name is empty — triggers validation error
	body := `{"ingredient_name":"","current_stock":100,"minimum_stock":10,"unit":"kg","type":"ingredient"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "ingredient_name") {
		t.Fatalf("body = %q, expected to contain 'ingredient_name'", rr.Body.String())
	}
}

func TestUpdateInventoryItem_ValidationError_MissingUnit_Returns400(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// unit is empty — triggers validation error
	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"","type":"ingredient"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "unit") {
		t.Fatalf("body = %q, expected to contain 'unit'", rr.Body.String())
	}
}

func TestUpdateInventoryItem_ValidationError_InvalidType_Returns400(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// type = "unknown" triggers validation error
	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":10,"unit":"kg","type":"unknown"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "type") {
		t.Fatalf("body = %q, expected to contain 'type'", rr.Body.String())
	}
}

func TestUpdateInventoryItem_ValidationError_NegativeMinStock_Returns400(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// minimum_stock = -5 triggers validation error
	body := `{"ingredient_name":"Flour","current_stock":100,"minimum_stock":-5,"unit":"kg","type":"ingredient"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "minimum_stock") {
		t.Fatalf("body = %q, expected to contain 'minimum_stock'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdatePayment — validation error path
// ---------------------------------------------------------------------------

func TestUpdatePayment_ValidationError_ZeroAmount_Returns400(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	eventID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// amount = 0 triggers validation error (must be > 0)
	body := `{"event_id":"` + eventID.String() + `","amount":0,"payment_date":"2026-06-15","payment_method":"cash"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "amount") {
		t.Fatalf("body = %q, expected to contain 'amount'", rr.Body.String())
	}
}

func TestUpdatePayment_ValidationError_NegativeAmount_Returns400(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	eventID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// amount = -100 triggers validation error
	body := `{"event_id":"` + eventID.String() + `","amount":-100,"payment_date":"2026-06-15","payment_method":"cash"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "amount") {
		t.Fatalf("body = %q, expected to contain 'amount'", rr.Body.String())
	}
}

func TestUpdatePayment_ValidationError_MissingPaymentMethod_Returns400(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	eventID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// payment_method is empty — triggers validation error
	body := `{"event_id":"` + eventID.String() + `","amount":500,"payment_date":"2026-06-15","payment_method":""}`
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "payment_method") {
		t.Fatalf("body = %q, expected to contain 'payment_method'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateProduct — validation error path
// ---------------------------------------------------------------------------

func TestCreateProduct_ValidationError_MissingName_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// name is empty — triggers validation error
	body := `{"name":"","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "name") {
		t.Fatalf("body = %q, expected to contain 'name'", rr.Body.String())
	}
}

func TestCreateProduct_ValidationError_MissingCategory_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// category is empty — triggers validation error
	body := `{"name":"Tacos","category":"","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "category") {
		t.Fatalf("body = %q, expected to contain 'category'", rr.Body.String())
	}
}

func TestCreateProduct_ValidationError_NegativePrice_Returns400(t *testing.T) {
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// base_price = -5 triggers validation error
	body := `{"name":"Tacos","category":"main_course","base_price":-5}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "base_price") {
		t.Fatalf("body = %q, expected to contain 'base_price'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreateEvent — validation error path
// ---------------------------------------------------------------------------

func TestCreateEvent_ValidationError_ZeroPeople_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// num_people = 0 triggers validation error (must be >= 1)
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":0,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "num_people") {
		t.Fatalf("body = %q, expected to contain 'num_people'", rr.Body.String())
	}
}

func TestCreateEvent_ValidationError_InvalidStatus_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// status = "invalid" triggers validation error
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"invalid","tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "status") {
		t.Fatalf("body = %q, expected to contain 'status'", rr.Body.String())
	}
}

func TestCreateEvent_ValidationError_NegativeDiscount_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// discount = -5 triggers validation error
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","discount":-5,"tax_rate":16,"tax_amount":100,"total_amount":1000}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "discount") {
		t.Fatalf("body = %q, expected to contain 'discount'", rr.Body.String())
	}
}

func TestCreateEvent_ValidationError_NegativeTotalAmount_Returns400(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// total_amount = -100 triggers validation error
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"catering","num_people":50,"status":"quoted","tax_rate":16,"tax_amount":100,"total_amount":-100}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "total_amount") {
		t.Fatalf("body = %q, expected to contain 'total_amount'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateEvent — additional validation error paths
// ---------------------------------------------------------------------------

func TestUpdateEvent_ValidationError_DiscountOver100_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// discount = 150 triggers validation error (must be 0-100)
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","discount":150,"tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "discount") {
		t.Fatalf("body = %q, expected to contain 'discount'", rr.Body.String())
	}
}

func TestUpdateEvent_ValidationError_InvalidStatus_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// status = "unknown" triggers validation error
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"unknown","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "status") {
		t.Fatalf("body = %q, expected to contain 'status'", rr.Body.String())
	}
}

func TestUpdateEvent_ValidationError_TaxRateOver100_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// tax_rate = 200 triggers validation error (must be 0-100)
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":200,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "tax_rate") {
		t.Fatalf("body = %q, expected to contain 'tax_rate'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// CreatePayment — validation error path
// ---------------------------------------------------------------------------

func TestCreatePayment_ValidationError_ZeroAmount_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// amount = 0 triggers validation error (must be > 0)
	body := `{"event_id":"` + eventID.String() + `","amount":0,"payment_date":"2026-06-15","payment_method":"cash"}`
	req := makeReqWithUserID(http.MethodPost, "/api/payments", body, userID)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "amount") {
		t.Fatalf("body = %q, expected to contain 'amount'", rr.Body.String())
	}
}

func TestCreatePayment_ValidationError_MissingPaymentMethod_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// payment_method is empty — triggers validation error
	body := `{"event_id":"` + eventID.String() + `","amount":500,"payment_date":"2026-06-15","payment_method":""}`
	req := makeReqWithUserID(http.MethodPost, "/api/payments", body, userID)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusBadRequest, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "payment_method") {
		t.Fatalf("body = %q, expected to contain 'payment_method'", rr.Body.String())
	}
}

// ---------------------------------------------------------------------------
// UpdateEvent — client change with UpdateClientStats error (lines 311-318)
// ---------------------------------------------------------------------------

func TestUpdateEvent_ClientChange_UpdateClientStatsError_StillReturns200(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	oldClientID := uuid.New()
	newClientID := uuid.New()

	eventRepo := new(MockFullEventRepo)
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: oldClientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	// New client stats update succeeds, old client stats update fails
	eventRepo.On("UpdateClientStats", mock.Anything, newClientID).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, oldClientID).Return(errTest)
	eventRepo.On("DeductSupplyStock", mock.Anything, eventID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + newClientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code, "response should be 200 even when UpdateClientStats fails")
	eventRepo.AssertNumberOfCalls(t, "UpdateClientStats", 2)
}

func TestUpdateEvent_ClientChange_NewClientStatsError_StillReturns200(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	oldClientID := uuid.New()
	newClientID := uuid.New()

	eventRepo := new(MockFullEventRepo)
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: oldClientID,
		EventDate: "2026-06-15", ServiceType: "catering", NumPeople: 50,
		Status: "quoted", TaxRate: 16, TaxAmount: 100, TotalAmount: 1000,
	}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Event")).Return(nil)
	// New client stats update fails — response should still be OK
	eventRepo.On("UpdateClientStats", mock.Anything, newClientID).Return(errTest)
	eventRepo.On("UpdateClientStats", mock.Anything, oldClientID).Return(nil)
	eventRepo.On("DeductSupplyStock", mock.Anything, eventID).Return(nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"client_id":"` + newClientID.String() + `","event_date":"2026-06-20","service_type":"catering","num_people":60,"status":"confirmed","tax_rate":16,"tax_amount":120,"total_amount":1200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code, "response should be 200 even when UpdateClientStats fails for new client")
	eventRepo.AssertNumberOfCalls(t, "UpdateClientStats", 2)
}

// ---------------------------------------------------------------------------
// DeleteEvent — UpdateClientStats error (lines 340-342)
// ---------------------------------------------------------------------------

func TestDeleteEvent_UpdateClientStatsError_StillReturns204(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	existing := &models.Event{ID: eventID, UserID: userID, ClientID: clientID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Delete", mock.Anything, eventID, userID).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String(), "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEvent(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code, "response should be 204 even when UpdateClientStats fails")
	eventRepo.AssertCalled(t, "UpdateClientStats", mock.Anything, clientID)
}

// ---------------------------------------------------------------------------
// CheckEquipmentConflicts — ExcludeEventID valid UUID (lines 490-497)
// ---------------------------------------------------------------------------

func TestCheckEquipmentConflicts_WithValidExcludeEventID_ReturnsEmptyArray(t *testing.T) {
	userID := uuid.New()
	invID := uuid.New()
	excludeID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("CheckEquipmentConflicts", mock.Anything, userID, "2026-06-15",
		mock.Anything, mock.Anything,
		mock.AnythingOfType("[]uuid.UUID"),
		mock.AnythingOfType("*uuid.UUID"),
	).Return(nil, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"event_date":"2026-06-15","inventory_ids":["` + invID.String() + `"],"exclude_event_id":"` + excludeID.String() + `"}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-conflicts", body, userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflicts(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "[]")
}

// ---------------------------------------------------------------------------
// CheckEquipmentConflicts — invalid exclude_event_id (line 493)
// ---------------------------------------------------------------------------

func TestCheckEquipmentConflicts_InvalidExcludeEventID_Returns400(t *testing.T) {
	userID := uuid.New()
	invID := uuid.New()

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"event_date":"2026-06-15","inventory_ids":["` + invID.String() + `"],"exclude_event_id":"not-a-uuid"}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-conflicts", body, userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflicts(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid exclude_event_id")
}

// ---------------------------------------------------------------------------
// CheckEquipmentConflicts — repo error (lines 501-503)
// ---------------------------------------------------------------------------

func TestCheckEquipmentConflicts_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	invID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("CheckEquipmentConflicts", mock.Anything, userID, "2026-06-15",
		mock.Anything, mock.Anything,
		mock.AnythingOfType("[]uuid.UUID"),
		mock.Anything,
	).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"event_date":"2026-06-15","inventory_ids":["` + invID.String() + `"]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-conflicts", body, userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflicts(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to check equipment conflicts")
}

// ---------------------------------------------------------------------------
// GetEquipmentSuggestions — quantity <= 0 adjusted to 1 (lines 536-538)
// ---------------------------------------------------------------------------

func TestGetEquipmentSuggestions_ZeroQuantity_AdjustedToOne(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	// Capture the actual productQtys passed to verify qty is adjusted
	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID,
		mock.MatchedBy(func(pqs []repository.ProductQuantity) bool {
			return len(pqs) == 1 && pqs[0].Quantity == 1
		}),
	).Return([]models.EquipmentSuggestion{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// Send quantity=0, it should be adjusted to 1
	body := `{"products":[{"product_id":"` + productID.String() + `","quantity":0}]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestions(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	eventRepo.AssertExpectations(t)
}

func TestGetEquipmentSuggestions_NegativeQuantity_AdjustedToOne(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID,
		mock.MatchedBy(func(pqs []repository.ProductQuantity) bool {
			return len(pqs) == 1 && pqs[0].Quantity == 1
		}),
	).Return([]models.EquipmentSuggestion{}, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	// Send quantity=-5, it should be adjusted to 1
	body := `{"products":[{"product_id":"` + productID.String() + `","quantity":-5}]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestions(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	eventRepo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// GetEquipmentSuggestions — repo error (lines 543-545)
// ---------------------------------------------------------------------------

func TestGetEquipmentSuggestions_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID,
		mock.AnythingOfType("[]repository.ProductQuantity"),
	).Return(nil, errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[{"product_id":"` + productID.String() + `","quantity":5}]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestions(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to fetch equipment suggestions")
}

// ---------------------------------------------------------------------------
// UpdateProduct — repo Update error (lines 649-651)
// ---------------------------------------------------------------------------

func TestUpdateProduct_RepoUpdateError_Returns500(t *testing.T) {
	userID := uuid.New()
	productID := uuid.New()
	productRepo := new(MockProductRepo)

	productRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.Product")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"name":"Updated Tacos","category":"main_course","base_price":200}`
	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), body, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to update product")
}

// ---------------------------------------------------------------------------
// UpdateInventoryItem — repo Update error (lines 864-866)
// ---------------------------------------------------------------------------

func TestUpdateInventoryItem_RepoUpdateError_Returns500(t *testing.T) {
	userID := uuid.New()
	itemID := uuid.New()
	inventoryRepo := new(MockInventoryRepo)

	inventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.InventoryItem")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), inventoryRepo, new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"ingredient_name":"Flour","current_stock":200,"minimum_stock":20,"unit":"kg","type":"ingredient"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), body, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to update inventory item")
}

// ---------------------------------------------------------------------------
// UpdatePayment — repo Update error (lines 995-997)
// ---------------------------------------------------------------------------

func TestUpdatePayment_RepoUpdateError_Returns500(t *testing.T) {
	userID := uuid.New()
	paymentID := uuid.New()
	eventID := uuid.New()
	paymentRepo := new(MockFullPaymentRepo)

	paymentRepo.On("Update", mock.Anything, userID, mock.AnythingOfType("*models.Payment")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), paymentRepo, new(MockFullUserRepo))

	body := `{"event_id":"` + eventID.String() + `","amount":750,"payment_date":"2026-06-15","payment_method":"transfer"}`
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to update payment")
}

// ---------------------------------------------------------------------------
// CreateProduct — repo Create error (lines 621-623)
// ---------------------------------------------------------------------------

func TestCreateProduct_RepoCreateError_Returns500(t *testing.T) {
	userID := uuid.New()
	productRepo := new(MockProductRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	productRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Product")).Return(errTest)

	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), productRepo, new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"name":"Tacos","category":"main_course","base_price":150}`
	req := makeReqWithUserID(http.MethodPost, "/api/products", body, userID)
	rr := httptest.NewRecorder()
	h.CreateProduct(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create product")
}

// ---------------------------------------------------------------------------
// Decode JSON error paths (malformed body)
// ---------------------------------------------------------------------------

func TestUpdateProduct_InvalidJSON_Returns400(t *testing.T) {
	productID := uuid.New()
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/products/"+productID.String(), `{bad`, productID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateProduct(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestUpdateInventoryItem_InvalidJSON_Returns400(t *testing.T) {
	itemID := uuid.New()
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/inventory/"+itemID.String(), `{bad`, itemID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateInventoryItem(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestUpdatePayment_InvalidJSON_Returns400(t *testing.T) {
	paymentID := uuid.New()
	userID := uuid.New()
	h := newTestHandler(new(MockClientRepo), new(MockFullEventRepo), new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), `{bad`, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestUpdateEventItems_EquipmentValidationError_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	event := &models.Event{ID: eventID, UserID: userID, Status: "quoted"}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	body := `{"products":[],"extras":[],"equipment":[{"inventory_item_id":"` + uuid.New().String() + `","quantity":0}]}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "equipment[0]")
}

func TestUpdateEventItems_InvalidJSON_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	event := &models.Event{ID: eventID, UserID: userID, Status: "quoted"}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String()+"/items", `{bad`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEventItems(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestGetEquipmentSuggestions_NilSuggestions_ReturnsEmptyArray(t *testing.T) {
	userID := uuid.New()
	eventRepo := new(MockFullEventRepo)

	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return(nil, nil) // nil suggestions

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), new(MockFullUserRepo))

	productID := uuid.New()
	body := `{"products":[{"product_id":"` + productID.String() + `","quantity":5}]}`
	req := makeReqWithUserID(http.MethodPost, "/api/events/equipment-suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestions(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "[]\n", rr.Body.String())
}

func TestCreateEvent_UpdateClientStatsError_StillReturns201(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventRepo := new(MockFullEventRepo)
	userRepo := new(MockFullUserRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	eventRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.Event")).Run(func(args mock.Arguments) {
		e := args.Get(1).(*models.Event)
		e.ID = uuid.New()
	}).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(errTest)

	h := newTestHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), new(MockFullPaymentRepo), userRepo)

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-15","service_type":"Catering","status":"quoted","num_people":50,"total_amount":5000,"discount":0,"tax_rate":16}`
	req := makeReqWithUserID(http.MethodPost, "/api/events", body, userID)
	rr := httptest.NewRecorder()
	h.CreateEvent(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
}
