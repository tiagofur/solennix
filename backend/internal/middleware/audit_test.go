package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// mockAuditLogger records audit log entries for assertions.
type mockAuditLogger struct {
	mu   sync.Mutex
	logs []*models.AuditLog
}

func (m *mockAuditLogger) Create(_ context.Context, log *models.AuditLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.logs = append(m.logs, log)
	return nil
}

func (m *mockAuditLogger) getLogs() []*models.AuditLog {
	m.mu.Lock()
	defer m.mu.Unlock()
	dst := make([]*models.AuditLog, len(m.logs))
	copy(dst, m.logs)
	return dst
}

// buildAuditRequest creates a request with user context and chi route context.
func buildAuditRequest(method, target string, userID uuid.UUID, routePattern string) *http.Request {
	req := httptest.NewRequest(method, target, nil)
	ctx := context.WithValue(req.Context(), UserIDKey, userID)

	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{routePattern}
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)

	return req.WithContext(ctx)
}

// --- Audit middleware tests ---

func TestAudit_GivenPOSTReturns201_WhenHandlerSucceeds_ThenAuditLogCreated(t *testing.T) {
	logger := &mockAuditLogger{}
	userID := uuid.New()

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	req := buildAuditRequest(http.MethodPost, "/api/v1/clients", userID, "/api/v1/clients")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	logs := logger.getLogs()
	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log, got %d", len(logs))
	}
	if logs[0].Action != "create" {
		t.Fatalf("action = %q, want %q", logs[0].Action, "create")
	}
	if logs[0].ResourceType != "client" {
		t.Fatalf("resource_type = %q, want %q", logs[0].ResourceType, "client")
	}
	if logs[0].UserID != userID {
		t.Fatalf("user_id = %v, want %v", logs[0].UserID, userID)
	}
}

func TestAudit_GivenGETRequest_WhenCalled_ThenSkipped(t *testing.T) {
	logger := &mockAuditLogger{}
	nextCalled := false

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/clients", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	if !nextCalled {
		t.Fatal("next handler should have been called")
	}
	if len(logger.getLogs()) != 0 {
		t.Fatalf("expected 0 audit logs for GET, got %d", len(logger.getLogs()))
	}
}

func TestAudit_GivenPOSTReturns400_WhenHandlerFails_ThenNotLogged(t *testing.T) {
	logger := &mockAuditLogger{}
	userID := uuid.New()

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
	}))

	req := buildAuditRequest(http.MethodPost, "/api/v1/clients", userID, "/api/v1/clients")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	if len(logger.getLogs()) != 0 {
		t.Fatalf("expected 0 audit logs for 4xx response, got %d", len(logger.getLogs()))
	}
}

func TestAudit_GivenNoUserID_WhenPOSTSucceeds_ThenNotLogged(t *testing.T) {
	logger := &mockAuditLogger{}

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	// No user in context, but add chi route context
	req := httptest.NewRequest(http.MethodPost, "/api/v1/clients", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/clients"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	if len(logger.getLogs()) != 0 {
		t.Fatalf("expected 0 audit logs when no user ID, got %d", len(logger.getLogs()))
	}
}

func TestAudit_GivenSkippedPath_WhenPOSTToAuth_ThenNotLogged(t *testing.T) {
	logger := &mockAuditLogger{}
	userID := uuid.New()

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := buildAuditRequest(http.MethodPost, "/api/v1/auth/login", userID, "/api/v1/auth/login")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	if len(logger.getLogs()) != 0 {
		t.Fatalf("expected 0 audit logs for auth path, got %d", len(logger.getLogs()))
	}
}

func TestAudit_GivenDELETERequest_WhenSucceeds_ThenDeleteActionLogged(t *testing.T) {
	logger := &mockAuditLogger{}
	userID := uuid.New()

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := buildAuditRequest(http.MethodDelete, "/api/v1/events/some-id", userID, "/api/v1/events/{id}")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	logs := logger.getLogs()
	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log, got %d", len(logs))
	}
	if logs[0].Action != "delete" {
		t.Fatalf("action = %q, want %q", logs[0].Action, "delete")
	}
	if logs[0].ResourceType != "event" {
		t.Fatalf("resource_type = %q, want %q", logs[0].ResourceType, "event")
	}
}

func TestAudit_GivenPUTRequest_WhenSucceeds_ThenUpdateActionLogged(t *testing.T) {
	logger := &mockAuditLogger{}
	userID := uuid.New()

	handler := Audit(logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := buildAuditRequest(http.MethodPut, "/api/v1/products/some-id", userID, "/api/v1/products/{id}")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	time.Sleep(50 * time.Millisecond)

	logs := logger.getLogs()
	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log, got %d", len(logs))
	}
	if logs[0].Action != "update" {
		t.Fatalf("action = %q, want %q", logs[0].Action, "update")
	}
}

// --- mapAction tests ---

func TestMapAction(t *testing.T) {
	tests := []struct {
		method string
		want   string
	}{
		{http.MethodPost, "create"},
		{http.MethodPut, "update"},
		{http.MethodDelete, "delete"},
		{http.MethodGet, "unknown"},
		{http.MethodPatch, "unknown"},
	}

	for _, tc := range tests {
		t.Run(tc.method, func(t *testing.T) {
			if got := mapAction(tc.method); got != tc.want {
				t.Fatalf("mapAction(%q) = %q, want %q", tc.method, got, tc.want)
			}
		})
	}
}

// --- extractResource tests ---

func TestExtractResource_GivenNoRouteContext_ThenEmpty(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/clients", nil)
	resourceType, resourceID := extractResource(req)
	if resourceType != "" {
		t.Fatalf("resourceType = %q, want empty", resourceType)
	}
	if resourceID != nil {
		t.Fatalf("resourceID = %v, want nil", resourceID)
	}
}

func TestExtractResource_GivenEmptyPattern_ThenEmpty(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/clients", nil)
	rctx := chi.NewRouteContext()
	// No patterns set → RoutePattern() returns ""
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "" {
		t.Fatalf("resourceType = %q, want empty", resourceType)
	}
}

func TestExtractResource_GivenClientsPath_ThenClient(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/clients", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/clients"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, resourceID := extractResource(req)
	if resourceType != "client" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "client")
	}
	if resourceID != nil {
		t.Fatalf("resourceID = %v, want nil", resourceID)
	}
}

func TestExtractResource_GivenClientsPathOnAPIAlias_ThenClient(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/clients", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/clients"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, resourceID := extractResource(req)
	if resourceType != "client" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "client")
	}
	if resourceID != nil {
		t.Fatalf("resourceID = %v, want nil", resourceID)
	}
}

func TestExtractResource_GivenClientsWithID_ThenClientWithID(t *testing.T) {
	id := uuid.New()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/clients/"+id.String(), nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/clients/{id}"}
	rctx.URLParams.Add("id", id.String())
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, resourceID := extractResource(req)
	if resourceType != "client" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "client")
	}
	if resourceID == nil {
		t.Fatal("resourceID should not be nil")
	}
	if *resourceID != id {
		t.Fatalf("resourceID = %v, want %v", *resourceID, id)
	}
}

func TestExtractResource_GivenNestedEventProducts_ThenEventProduct(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/products", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/products"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_product" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_product")
	}
}

func TestExtractResource_GivenNestedEventExtras_ThenEventExtra(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/extras", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/extras"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_extra" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_extra")
	}
}

func TestExtractResource_GivenNestedEventItems_ThenEventItems(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/items", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/items"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_items" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_items")
	}
}

func TestExtractResource_GivenNestedEventEquipment_ThenEventEquipment(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/equipment", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/equipment"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_equipment" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_equipment")
	}
}

func TestExtractResource_GivenNestedEventSupplies_ThenEventSupply(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/supplies", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/supplies"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_supply" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_supply")
	}
}

func TestExtractResource_GivenNestedEventPhotos_ThenEventPhoto(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/events/123/photos", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/events/{id}/photos"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "event_photo" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "event_photo")
	}
}

func TestExtractResource_GivenProductIngredients_ThenProductIngredient(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products/123/ingredients", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/products/{id}/ingredients"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "product_ingredient" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "product_ingredient")
	}
}

func TestExtractResource_GivenSkipPrefixes_ThenEmpty(t *testing.T) {
	skipPaths := []string{
		"/api/v1/auth/login",
		"/api/v1/search/clients",
		"/api/v1/devices/register",
		"/api/v1/uploads/image",
		"/api/v1/subscriptions/plan",
		"/api/v1/admin/users",
		"/api/v1/dashboard/stats",
	}

	for _, path := range skipPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, path, nil)
			rctx := chi.NewRouteContext()
			rctx.RoutePatterns = []string{path}
			ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
			req = req.WithContext(ctx)

			resourceType, _ := extractResource(req)
			if resourceType != "" {
				t.Fatalf("resourceType = %q, want empty for skip path %q", resourceType, path)
			}
		})
	}
}

func TestExtractResource_GivenSkipPrefixesOnAPIAlias_ThenEmpty(t *testing.T) {
	skipPaths := []string{
		"/api/auth/login",
		"/api/search/clients",
		"/api/devices/register",
		"/api/uploads/image",
		"/api/subscriptions/plan",
		"/api/admin/users",
		"/api/dashboard/stats",
	}

	for _, path := range skipPaths {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, path, nil)
			rctx := chi.NewRouteContext()
			rctx.RoutePatterns = []string{path}
			ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
			req = req.WithContext(ctx)

			resourceType, _ := extractResource(req)
			if resourceType != "" {
				t.Fatalf("resourceType = %q, want empty for skip path %q", resourceType, path)
			}
		})
	}
}

func TestExtractResource_GivenUnknownResource_ThenEmpty(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/unknown", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/unknown"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "" {
		t.Fatalf("resourceType = %q, want empty for unknown resource", resourceType)
	}
}

func TestExtractResource_GivenInvalidUUID_ThenResourceIDNil(t *testing.T) {
	req := httptest.NewRequest(http.MethodPut, "/api/v1/clients/not-a-uuid", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/v1/clients/{id}"}
	rctx.URLParams.Add("id", "not-a-uuid")
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, resourceID := extractResource(req)
	if resourceType != "client" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "client")
	}
	if resourceID != nil {
		t.Fatalf("resourceID = %v, want nil for invalid UUID", resourceID)
	}
}

func TestExtractResource_GivenResourceMappings_ThenCorrectTypes(t *testing.T) {
	tests := []struct {
		pattern  string
		wantType string
	}{
		{"/api/v1/clients", "client"},
		{"/api/v1/events", "event"},
		{"/api/v1/products", "product"},
		{"/api/v1/inventory", "inventory"},
		{"/api/v1/payments", "payment"},
		{"/api/v1/unavailable-dates", "unavailable_date"},
	}

	for _, tc := range tests {
		t.Run(tc.wantType, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tc.pattern, nil)
			rctx := chi.NewRouteContext()
			rctx.RoutePatterns = []string{tc.pattern}
			ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
			req = req.WithContext(ctx)

			resourceType, _ := extractResource(req)
			if resourceType != tc.wantType {
				t.Fatalf("resourceType = %q, want %q", resourceType, tc.wantType)
			}
		})
	}
}

func TestTrimAPIBasePrefix(t *testing.T) {
	tests := []struct {
		name    string
		pattern string
		want    string
	}{
		{name: "v1 slash", pattern: "/api/v1/clients", want: "clients"},
		{name: "alias slash", pattern: "/api/clients", want: "clients"},
		{name: "v1 root", pattern: "/api/v1", want: ""},
		{name: "alias root", pattern: "/api", want: ""},
		{name: "no prefix", pattern: "clients", want: "clients"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := trimAPIBasePrefix(tc.pattern); got != tc.want {
				t.Fatalf("trimAPIBasePrefix(%q) = %q, want %q", tc.pattern, got, tc.want)
			}
		})
	}
}

// --- statusWriter tests ---

func TestStatusWriter_WriteHeader_GivenFirstCall_ThenCapturesStatus(t *testing.T) {
	rr := httptest.NewRecorder()
	sw := &statusWriter{ResponseWriter: rr, status: http.StatusOK}

	sw.WriteHeader(http.StatusCreated)

	if sw.status != http.StatusCreated {
		t.Fatalf("status = %d, want %d", sw.status, http.StatusCreated)
	}
	if !sw.wroteHeader {
		t.Fatal("wroteHeader should be true")
	}
}

func TestStatusWriter_WriteHeader_GivenSecondCall_ThenKeepsFirstStatus(t *testing.T) {
	rr := httptest.NewRecorder()
	sw := &statusWriter{ResponseWriter: rr, status: http.StatusOK}

	sw.WriteHeader(http.StatusCreated)
	sw.WriteHeader(http.StatusBadRequest)

	if sw.status != http.StatusCreated {
		t.Fatalf("status = %d, want %d (first call should stick)", sw.status, http.StatusCreated)
	}
}

func TestStatusWriter_Write_GivenNoExplicitHeader_ThenSetsWroteHeader(t *testing.T) {
	rr := httptest.NewRecorder()
	sw := &statusWriter{ResponseWriter: rr, status: http.StatusOK}

	n, err := sw.Write([]byte("hello"))
	if err != nil {
		t.Fatalf("Write() error = %v", err)
	}
	if n != 5 {
		t.Fatalf("Write() n = %d, want 5", n)
	}
	if !sw.wroteHeader {
		t.Fatal("wroteHeader should be true after Write()")
	}
}

func TestStatusWriter_Write_GivenHeaderAlreadyWritten_ThenKeepsState(t *testing.T) {
	rr := httptest.NewRecorder()
	sw := &statusWriter{ResponseWriter: rr, status: http.StatusOK}

	sw.WriteHeader(http.StatusCreated)
	_, _ = sw.Write([]byte("body"))

	if sw.status != http.StatusCreated {
		t.Fatalf("status = %d, want %d", sw.status, http.StatusCreated)
	}
}

// --- extractResource with /api/ prefix (without v1) ---

func TestExtractResource_GivenApiPrefixWithoutV1_ThenStripsCorrectly(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/clients", nil)
	rctx := chi.NewRouteContext()
	rctx.RoutePatterns = []string{"/api/clients"}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	req = req.WithContext(ctx)

	resourceType, _ := extractResource(req)
	if resourceType != "client" {
		t.Fatalf("resourceType = %q, want %q", resourceType, "client")
	}
}
