package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/tiagofur/solennix-backend/internal/i18n"
)

func TestWriteEventCompletionBlockedError_Structure(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/events/1", nil)
	ctx := i18n.WithLocale(req.Context(), "es")
	req = req.WithContext(ctx)

	writeEventCompletionBlockedError(rr, req, 1500.50, "MXN")

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["error"] != "event.completion_blocked" {
		t.Fatalf("error = %v, want event.completion_blocked", body["error"])
	}
	if body["remaining"] != 1500.50 {
		t.Fatalf("remaining = %v, want 1500.50", body["remaining"])
	}
	if body["currency"] != "MXN" {
		t.Fatalf("currency = %v, want MXN", body["currency"])
	}
	msg, ok := body["message"].(string)
	if !ok || msg == "" {
		t.Fatalf("message missing or empty: %v", body["message"])
	}
	if msg != "No se puede completar: quedan $1500.50 por cobrar" {
		t.Fatalf("message = %q, want Spanish localized text", msg)
	}
}

func TestWriteEventCompletionBlockedError_EnglishLocale(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/events/1", nil)
	ctx := i18n.WithLocale(req.Context(), "en")
	req = req.WithContext(ctx)

	writeEventCompletionBlockedError(rr, req, 99.00, "")

	var body map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	msg := body["message"].(string)
	if msg != "Cannot complete: $99.00 remaining" {
		t.Fatalf("message = %q, want English localized text", msg)
	}
	if body["currency"] != "MXN" {
		t.Fatalf("currency = %v, want default MXN", body["currency"])
	}
}