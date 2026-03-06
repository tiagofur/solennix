package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// mockAdminUserRepo implements AdminUserRepo for testing.
type mockAdminUserRepo struct {
	user *models.User
	err  error
}

func (m *mockAdminUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*models.User, error) {
	return m.user, m.err
}

// okHandler is a simple handler that writes 200 OK when reached.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("OK"))
})

func TestAdminOnly_NoUserID(t *testing.T) {
	repo := &mockAdminUserRepo{}
	mw := AdminOnly(repo)
	handler := mw(okHandler)

	req := httptest.NewRequest(http.MethodGet, "/admin", nil)
	// No UserIDKey in context → uuid.Nil
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] != "Authentication required" {
		t.Fatalf("expected 'Authentication required', got %q", body["error"])
	}
}

func TestAdminOnly_UserNotFound(t *testing.T) {
	repo := &mockAdminUserRepo{
		user: nil,
		err:  fmt.Errorf("not found"),
	}
	mw := AdminOnly(repo)
	handler := mw(okHandler)

	userID := uuid.New()
	ctx := context.WithValue(context.Background(), UserIDKey, userID)
	req := httptest.NewRequest(http.MethodGet, "/admin", nil).WithContext(ctx)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] != "User not found" {
		t.Fatalf("expected 'User not found', got %q", body["error"])
	}
}

func TestAdminOnly_NotAdmin(t *testing.T) {
	repo := &mockAdminUserRepo{
		user: &models.User{
			ID:   uuid.New(),
			Role: "user",
		},
	}
	mw := AdminOnly(repo)
	handler := mw(okHandler)

	userID := uuid.New()
	ctx := context.WithValue(context.Background(), UserIDKey, userID)
	req := httptest.NewRequest(http.MethodGet, "/admin", nil).WithContext(ctx)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", rr.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode body: %v", err)
	}
	if body["error"] != "Admin access required" {
		t.Fatalf("expected 'Admin access required', got %q", body["error"])
	}
}

func TestAdminOnly_AdminAccess(t *testing.T) {
	repo := &mockAdminUserRepo{
		user: &models.User{
			ID:   uuid.New(),
			Role: "admin",
		},
	}
	mw := AdminOnly(repo)
	handler := mw(okHandler)

	userID := uuid.New()
	ctx := context.WithValue(context.Background(), UserIDKey, userID)
	req := httptest.NewRequest(http.MethodGet, "/admin", nil).WithContext(ctx)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
}
