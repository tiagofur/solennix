package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestWriteJSON(t *testing.T) {
	rr := httptest.NewRecorder()

	writeJSON(rr, http.StatusCreated, map[string]string{"status": "ok"})

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusCreated)
	}
	if got := rr.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("Content-Type = %q, want %q", got, "application/json")
	}
	if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
		t.Fatalf("body = %q, expected JSON payload", rr.Body.String())
	}
}

func TestWriteError(t *testing.T) {
	rr := httptest.NewRecorder()

	writeError(rr, http.StatusBadRequest, "bad request")

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
	}
	if !strings.Contains(rr.Body.String(), `"error":"bad request"`) {
		t.Fatalf("body = %q, expected error JSON payload", rr.Body.String())
	}
}

func TestWriteJSON_EncodingError(t *testing.T) {
	rr := httptest.NewRecorder()

	// Channels cannot be JSON-encoded, so json.Encoder.Encode will fail.
	writeJSON(rr, http.StatusOK, map[string]interface{}{
		"bad": make(chan int),
	})

	// The status code is still set even though encoding fails.
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if got := rr.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("Content-Type = %q, want %q", got, "application/json")
	}
}

func TestDecodeJSON(t *testing.T) {
	t.Run("GivenValidJSON_WhenDecode_ThenPopulateStruct", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"john"}`))
		var dst struct {
			Name string `json:"name"`
		}

		if err := decodeJSON(req, &dst); err != nil {
			t.Fatalf("decodeJSON() error = %v", err)
		}
		if dst.Name != "john" {
			t.Fatalf("dst.Name = %q, want %q", dst.Name, "john")
		}
	})

	t.Run("GivenInvalidJSON_WhenDecode_ThenReturnError", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":}`))
		var dst map[string]string

		if err := decodeJSON(req, &dst); err == nil {
			t.Fatalf("decodeJSON() expected error for invalid JSON")
		}
	})

	t.Run("GivenOversizedBody_WhenDecode_ThenReturnError", func(t *testing.T) {
		// Create a body that exceeds the 1MB limit.
		bigBody := strings.Repeat("a", 1<<20+1)
		req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(bigBody))
		var dst map[string]string

		if err := decodeJSON(req, &dst); err == nil {
			t.Fatalf("decodeJSON() expected error for oversized body")
		}
	})
}

func TestMaskEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  string
	}{
		{"Standard email", "tiago@solennix.com", "t***o@solennix.com"},
		{"Standard email 2", "test@example.com", "t***t@example.com"},
		{"Short mailbox (1 char)", "a@b.com", "a@b.com"},
		{"Two char mailbox", "ab@c.com", "a***b@c.com"},
		{"Unicode email", "ñandú@pampa.com", "ñ***ú@pampa.com"},
		{"Invalid email (no @)", "notanemail", "notanemail"},
		{"Empty string", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := maskEmail(tt.email); got != tt.want {
				t.Errorf("maskEmail(%q) = %q, want %q", tt.email, got, tt.want)
			}
		})
	}
}
