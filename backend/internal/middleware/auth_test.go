package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/services"
)

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

func TestContextGettersWithMissingValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	if got := GetUserID(req.Context()); got != uuid.Nil {
		t.Fatalf("GetUserID() = %v, want uuid.Nil", got)
	}
	if got := GetUserEmail(req.Context()); got != "" {
		t.Fatalf("GetUserEmail() = %q, want empty string", got)
	}
}
