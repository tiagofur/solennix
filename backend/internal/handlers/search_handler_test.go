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

func TestSearchHandler(t *testing.T) {
	// Test NewSearchHandler constructor
	t.Run("NewSearchHandler", func(t *testing.T) {
		h := NewSearchHandler(nil, nil, nil, nil)
		if h == nil {
			t.Fatal("NewSearchHandler returned nil")
		}
	})

	// Test empty query
	t.Run("SearchAll_EmptyQuery", func(t *testing.T) {
		h := &SearchHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/search?q=", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
		if !strings.Contains(rr.Body.String(), "Query parameter") {
			t.Fatalf("body = %q, expected query parameter error", rr.Body.String())
		}
	})

	// Test with closed pool (repo errors) - should still return 200 with empty results
	t.Run("SearchAll_WithClosedPool", func(t *testing.T) {
		pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
		if err != nil {
			t.Skipf("pgxpool.New failed: %v", err)
		}
		pool.Close()

		h := NewSearchHandler(
			repository.NewClientRepo(pool),
			repository.NewProductRepo(pool),
			repository.NewInventoryRepo(pool),
			repository.NewEventRepo(pool),
		)
		req := httptest.NewRequest(http.MethodGet, "/api/search?q=test", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		// SearchAll returns 200 even with errors (partial results)
		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	})

	// Test missing query parameter entirely
	t.Run("SearchAll_NoQueryParam", func(t *testing.T) {
		h := &SearchHandler{}
		req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.SearchAll(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})
}
