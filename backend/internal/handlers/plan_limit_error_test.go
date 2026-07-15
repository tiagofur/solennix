package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tiagofur/solennix-backend/internal/i18n"
)

func TestWritePlanLimitError_SpanishLocale(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/clients", nil)
	ctx := i18n.WithLocale(req.Context(), "es")
	req = req.WithContext(ctx)

	writePlanLimitError(rr, req, "clients", 5, 5)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusForbidden)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["error"] != "plan_limit_exceeded" {
		t.Fatalf("error = %v, want plan_limit_exceeded", body["error"])
	}
	msg, ok := body["message"].(string)
	if !ok || msg == "" {
		t.Fatalf("message missing or empty: %v", body["message"])
	}
	if msg != "Has alcanzado el limite de tu plan. Actualiza a Pro para continuar." {
		t.Fatalf("message = %q, want Spanish localized text", msg)
	}
	limit, ok := body["limit"].(map[string]interface{})
	if !ok {
		t.Fatalf("limit missing or wrong type: %v", body["limit"])
	}
	if limit["type"] != "clients" {
		t.Fatalf("limit.type = %v, want clients", limit["type"])
	}
	if limit["current"] != float64(5) {
		t.Fatalf("limit.current = %v, want 5", limit["current"])
	}
	if limit["max"] != float64(5) {
		t.Fatalf("limit.max = %v, want 5", limit["max"])
	}
}

func TestWritePlanLimitError_EnglishLocale(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/clients", nil)
	ctx := i18n.WithLocale(req.Context(), "en")
	req = req.WithContext(ctx)

	writePlanLimitError(rr, req, "events", 10, 10)

	var body map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["error"] != "plan_limit_exceeded" {
		t.Fatalf("error = %v, want plan_limit_exceeded", body["error"])
	}
	msg := body["message"].(string)
	if msg != "You've reached your plan limit. Upgrade to Pro to continue." {
		t.Fatalf("message = %q, want English localized text", msg)
	}
}

func TestWritePlanLimitError_NoLocaleFallsBackToEnglish(t *testing.T) {
	rr := httptest.NewRecorder()
	// No locale injected — should fall back to NoContextLocale ("en").
	req := httptest.NewRequest(http.MethodPost, "/api/clients", nil)

	writePlanLimitError(rr, req, "staff_seats", 3, 3)

	var body map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	msg := body["message"].(string)
	if msg != "You've reached your plan limit. Upgrade to Pro to continue." {
		t.Fatalf("message = %q, want English fallback text", msg)
	}
}
