package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestValidateUUID_ValidUUID(t *testing.T) {
	r := chi.NewRouter()
	r.Route("/items/{id}", func(r chi.Router) {
		r.Use(ValidateUUID("id"))
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("ok"))
		})
	})

	req := httptest.NewRequest("GET", "/items/550e8400-e29b-41d4-a716-446655440000", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestValidateUUID_InvalidUUID(t *testing.T) {
	r := chi.NewRouter()
	r.Route("/items/{id}", func(r chi.Router) {
		r.Use(ValidateUUID("id"))
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
	})

	req := httptest.NewRequest("GET", "/items/not-a-uuid", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rr.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["error"] != "Invalid id format: must be a valid UUID" {
		t.Errorf("unexpected error message: %s", body["error"])
	}
}

func TestValidateUUID_MissingParam(t *testing.T) {
	r := chi.NewRouter()
	// Middleware configured for "id" but route doesn't have {id}
	r.With(ValidateUUID("id")).Get("/items", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	req := httptest.NewRequest("GET", "/items", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 when param not present, got %d", rr.Code)
	}
}

func TestValidateUUID_MultipleParams(t *testing.T) {
	r := chi.NewRouter()
	r.Route("/events/{id}/photos/{photoId}", func(r chi.Router) {
		r.Use(ValidateUUID("id", "photoId"))
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
	})

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{
			name:       "both valid",
			path:       "/events/550e8400-e29b-41d4-a716-446655440000/photos/660e8400-e29b-41d4-a716-446655440000",
			wantStatus: http.StatusOK,
		},
		{
			name:       "first invalid",
			path:       "/events/bad-id/photos/660e8400-e29b-41d4-a716-446655440000",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "second invalid",
			path:       "/events/550e8400-e29b-41d4-a716-446655440000/photos/bad-photo",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "both invalid",
			path:       "/events/bad-id/photos/bad-photo",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			rr := httptest.NewRecorder()
			r.ServeHTTP(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("expected %d, got %d", tt.wantStatus, rr.Code)
			}
		})
	}
}
