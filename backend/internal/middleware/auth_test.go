package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// errBlacklist is a TokenBlacklist that always returns an error from IsRevoked.
type errBlacklist struct{}

func (e *errBlacklist) IsRevoked(_ context.Context, _ string) (bool, error) {
	return false, errors.New("db connection refused")
}

func (e *errBlacklist) Revoke(_ context.Context, _ string, _ time.Time) error {
	return nil
}

func TestAuthMiddleware(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "auth@test.dev"
	tokens, err := authService.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	tests := []struct {
		name           string
		authHeader     string
		wantStatusCode int
		wantBody       string
	}{
		{
			name:           "GivenNoHeader_WhenRequest_ThenUnauthorized",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Authentication required",
		},
		{
			name:           "GivenInvalidFormat_WhenRequest_ThenUnauthorized",
			authHeader:     "Token abc",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Authentication required",
		},
		{
			name:           "GivenInvalidToken_WhenRequest_ThenUnauthorized",
			authHeader:     "Bearer invalid-token",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Invalid or expired token",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusNoContent)
			})

			handler := Auth(authService)(next)
			req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tc.wantStatusCode {
				t.Fatalf("status = %d, want %d", rr.Code, tc.wantStatusCode)
			}
			if !strings.Contains(rr.Body.String(), tc.wantBody) {
				t.Fatalf("body = %q, expected to contain %q", rr.Body.String(), tc.wantBody)
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}
			var payload map[string]string
			if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
				t.Fatalf("response must be valid JSON error payload: %v", err)
			}
			if payload["error"] == "" {
				t.Fatalf("response must contain non-empty error field: %s", rr.Body.String())
			}
			if nextCalled {
				t.Fatalf("next handler should not be called on unauthorized request")
			}
		})
	}

	t.Run("GivenValidToken_WhenRequest_ThenContextContainsUserData", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if gotID := GetUserID(r.Context()); gotID != userID {
				t.Fatalf("GetUserID() = %v, want %v", gotID, userID)
			}
			if gotEmail := GetUserEmail(r.Context()); gotEmail != email {
				t.Fatalf("GetUserEmail() = %q, want %q", gotEmail, email)
			}
			w.WriteHeader(http.StatusNoContent)
		})

		handler := Auth(authService)(next)
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNoContent)
		}
	})

	t.Run("GivenValidCookie_WhenRequest_ThenContextContainsUserData", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if gotID := GetUserID(r.Context()); gotID != userID {
				t.Fatalf("GetUserID() = %v, want %v", gotID, userID)
			}
			w.WriteHeader(http.StatusNoContent)
		})

		handler := Auth(authService)(next)
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokens.AccessToken})
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNoContent)
		}
	})
}

func TestSetTokenBlacklist_GivenCustomBlacklist_WhenSet_ThenGetReturnsIt(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original) // restore after test

	custom := &inMemoryBlacklist{}
	SetTokenBlacklist(custom)

	got := GetTokenBlacklist()
	if got != custom {
		t.Fatal("GetTokenBlacklist() did not return the custom blacklist set via SetTokenBlacklist()")
	}
}

func TestInMemoryBlacklist_Revoke_GivenToken_WhenRevoked_ThenIsRevokedReturnsTrue(t *testing.T) {
	bl := &inMemoryBlacklist{}
	ctx := context.Background()
	tokenHash := "abc123hash"

	revoked, rErr := bl.IsRevoked(ctx, tokenHash)
	if rErr != nil {
		t.Fatalf("IsRevoked() unexpected error = %v", rErr)
	}
	if revoked {
		t.Fatal("token should not be revoked before calling Revoke()")
	}

	err := bl.Revoke(ctx, tokenHash, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("Revoke() error = %v", err)
	}

	revoked2, rErr2 := bl.IsRevoked(ctx, tokenHash)
	if rErr2 != nil {
		t.Fatalf("IsRevoked() unexpected error after Revoke = %v", rErr2)
	}
	if !revoked2 {
		t.Fatal("token should be revoked after calling Revoke()")
	}
}

func TestInMemoryBlacklist_IsRevoked_GivenUnknownToken_ThenReturnsFalse(t *testing.T) {
	bl := &inMemoryBlacklist{}
	revoked, err := bl.IsRevoked(context.Background(), "never-revoked")
	if err != nil {
		t.Fatalf("IsRevoked() unexpected error = %v", err)
	}
	if revoked {
		t.Fatal("unknown token should not be revoked")
	}
}

func TestAuthMiddleware_GivenRevokedToken_WhenRequest_ThenUnauthorized(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-revoke", 1)
	userID := uuid.New()
	email := "revoked@test.dev"
	tokens, err := authService.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// Revoke the token
	bl := &inMemoryBlacklist{}
	tokenHash := sha256Hex(tokens.AccessToken)
	_ = bl.Revoke(context.Background(), tokenHash, time.Now().Add(time.Hour))
	SetTokenBlacklist(bl)

	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler should not be called for revoked token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
	}
	if !strings.Contains(rr.Body.String(), "Token has been revoked") {
		t.Fatalf("body = %q, expected to contain 'Token has been revoked'", rr.Body.String())
	}
}

func TestContextGettersWithMissingValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	if got := GetUserID(req.Context()); got != uuid.Nil {
		t.Fatalf("GetUserID() = %v, want uuid.Nil", got)
	}
	if got := GetUserEmail(req.Context()); got != "" {
		t.Fatalf("GetUserEmail() = %q, want empty string", got)
	}
}

// A3: blacklist returns error → middleware must respond 503, not forward.
func TestAuthMiddleware_GivenBlacklistError_WhenRequest_Then503(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-err", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "err@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	SetTokenBlacklist(&errBlacklist{})

	nextCalled := false
	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d (503)", rr.Code, http.StatusServiceUnavailable)
	}
	if nextCalled {
		t.Fatal("next handler must not be called when blacklist returns error")
	}
	var payload map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response must be valid JSON: %v", err)
	}
	if payload["error"] == "" {
		t.Fatal("response must contain non-empty error field")
	}
}

// A3: blacklist returns (true, nil) → 401 as before.
func TestAuthMiddleware_GivenRevokedToken_WhenBlacklistReturnsTrue_Then401(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-revoked2", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "revoked2@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	bl := &inMemoryBlacklist{}
	_ = bl.Revoke(context.Background(), sha256Hex(tokens.AccessToken), time.Now().Add(time.Hour))
	SetTokenBlacklist(bl)

	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler must not be called for revoked token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

// A3: blacklist returns (false, nil) → request passes through.
func TestAuthMiddleware_GivenValidToken_WhenBlacklistReturnsFalse_ThenForwards(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-pass", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "pass@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	SetTokenBlacklist(&inMemoryBlacklist{}) // fresh, no entries

	nextCalled := false
	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rr.Code)
	}
	if !nextCalled {
		t.Fatal("next handler must be called for valid non-revoked token")
	}
}
