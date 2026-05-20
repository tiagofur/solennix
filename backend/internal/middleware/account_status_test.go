package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type fakeUserRepo struct {
	user *models.User
	err  error
}

func (f *fakeUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*models.User, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.user, nil
}

func TestAccountStatusActiveMiddleware(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	t.Run("allows active account", func(t *testing.T) {
		repo := &fakeUserRepo{user: &models.User{ID: uuid.New(), AccountStatus: repository.AccountStatusActive}}
		handler := AccountStatusActive(repo)(next)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req = req.WithContext(context.WithValue(req.Context(), UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNoContent)
		}
	})

	t.Run("blocks blocked account", func(t *testing.T) {
		repo := &fakeUserRepo{user: &models.User{ID: uuid.New(), AccountStatus: repository.AccountStatusBlocked}}
		handler := AccountStatusActive(repo)(next)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req = req.WithContext(context.WithValue(req.Context(), UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusForbidden)
		}
		if !strings.Contains(rr.Body.String(), "Account is blocked") {
			t.Fatalf("body = %q, expected blocked message", rr.Body.String())
		}
	})

	t.Run("blocks deleted account", func(t *testing.T) {
		repo := &fakeUserRepo{user: &models.User{ID: uuid.New(), AccountStatus: repository.AccountStatusDeleted}}
		handler := AccountStatusActive(repo)(next)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req = req.WithContext(context.WithValue(req.Context(), UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusForbidden)
		}
	})

	t.Run("unauthorized when user lookup fails", func(t *testing.T) {
		repo := &fakeUserRepo{err: errors.New("not found")}
		handler := AccountStatusActive(repo)(next)

		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req = req.WithContext(context.WithValue(req.Context(), UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
		}
	})
}
