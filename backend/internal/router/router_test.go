package router

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"os"
	"path/filepath"

	"github.com/tiagofur/solennix-backend/internal/handlers"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// noopAuditLogger is a no-op implementation of middleware.AuditLogger for tests.
type noopAuditLogger struct{}

func (n *noopAuditLogger) Create(_ context.Context, _ *models.AuditLog) error { return nil }

func TestNewRouter(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := New(&handlers.AuthHandler{}, &handlers.CRUDHandler{}, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, &handlers.UnavailableDateHandler{}, nil, nil, nil, nil, nil, nil, authService, &repository.UserRepo{}, &noopAuditLogger{}, nil, []string{"http://allowed.com"}, t.TempDir())

	t.Run("GivenHealthEndpoint_WhenRequest_ThenReturnsOK", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/health", nil)
		req.Header.Set("Origin", "http://allowed.com")
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
		if !strings.Contains(rr.Body.String(), `"status":"ok"`) {
			t.Fatalf("body = %q, expected health JSON", rr.Body.String())
		}
		if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "http://allowed.com" {
			t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, "http://allowed.com")
		}
	})

	t.Run("GivenProtectedEndpointWithoutToken_WhenRequest_ThenUnauthorized", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/clients", nil)
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
		}
		if !strings.Contains(rr.Body.String(), "Authentication required") {
			t.Fatalf("body = %q, expected auth error", rr.Body.String())
		}
	})

	t.Run("GivenUploadsEndpoint_WhenRequest_ThenSetsCacheControl", func(t *testing.T) {
		tempDir := t.TempDir()
		testFilePath := filepath.Join(tempDir, "test.png")
		_ = os.WriteFile(testFilePath, []byte("fake image data"), 0644)

		h := New(&handlers.AuthHandler{}, &handlers.CRUDHandler{}, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(tempDir, nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, &handlers.UnavailableDateHandler{}, nil, nil, nil, nil, nil, nil, authService, &repository.UserRepo{}, &noopAuditLogger{}, nil, []string{"http://allowed.com"}, tempDir)

		req := httptest.NewRequest(http.MethodGet, "/api/uploads/test.png", nil)
		rr := httptest.NewRecorder()

		h.ServeHTTP(rr, req)

		if got := rr.Header().Get("Cache-Control"); got != "public, max-age=31536000" {
			t.Fatalf("Cache-Control = %q, want %q, status=%v", got, "public, max-age=31536000", rr.Code)
		}
	})
}
func TestProtectedRoutesRequireValidBearerToken(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := New(&handlers.AuthHandler{}, &handlers.CRUDHandler{}, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, &handlers.UnavailableDateHandler{}, nil, nil, nil, nil, nil, nil, authService, &repository.UserRepo{}, &noopAuditLogger{}, nil, []string{"http://allowed.com"}, t.TempDir())

	protectedRequests := []struct {
		name   string
		method string
		path   string
	}{
		{"ClientsList", http.MethodGet, "/api/clients"},
		{"ClientCreate", http.MethodPost, "/api/clients"},
		{"EventsList", http.MethodGet, "/api/events"},
		{"EventCreate", http.MethodPost, "/api/events"},
		{"ProductsList", http.MethodGet, "/api/products"},
		{"ProductCreate", http.MethodPost, "/api/products"},
		{"InventoryList", http.MethodGet, "/api/inventory"},
		{"InventoryCreate", http.MethodPost, "/api/inventory"},
		{"PaymentsList", http.MethodGet, "/api/payments"},
		{"PaymentsCreate", http.MethodPost, "/api/payments"},
		{"CurrentUser", http.MethodGet, "/api/auth/me"},
		{"UpdateProfile", http.MethodPut, "/api/users/me"},
	}

	unauthorizedCases := []struct {
		name       string
		authHeader string
		wantBody   string
	}{
		{"NoHeader", "", "Authentication required"},
		{"InvalidFormat", "Token abc", "Authentication required"},
		{"InvalidToken", "Bearer invalid-token", "Invalid or expired token"},
	}

	for _, reqCase := range protectedRequests {
		for _, authCase := range unauthorizedCases {
			t.Run(reqCase.name+"_"+authCase.name, func(t *testing.T) {
				req := httptest.NewRequest(reqCase.method, reqCase.path, nil)
				if authCase.authHeader != "" {
					req.Header.Set("Authorization", authCase.authHeader)
				}
				rr := httptest.NewRecorder()

				h.ServeHTTP(rr, req)

				if rr.Code != http.StatusUnauthorized {
					t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
				}
				if !strings.Contains(rr.Body.String(), authCase.wantBody) {
					t.Fatalf("body = %q, expected %q", rr.Body.String(), authCase.wantBody)
				}
			})
		}
	}
}

func TestRouterErrorContractMatrix(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := New(&handlers.AuthHandler{}, &handlers.CRUDHandler{}, &handlers.SubscriptionHandler{}, &handlers.SearchHandler{}, &handlers.EventPaymentHandler{}, handlers.NewUploadHandler(t.TempDir(), nil), &handlers.AdminHandler{}, &handlers.DashboardHandler{}, &handlers.AuditHandler{}, &handlers.UnavailableDateHandler{}, nil, nil, nil, nil, nil, nil, authService, &repository.UserRepo{}, &noopAuditLogger{}, nil, []string{"http://allowed.com"}, t.TempDir())

	cases := []struct {
		name       string
		method     string
		path       string
		body       string
		authHeader string
		wantStatus int
		wantError  string
	}{
		{
			name:       "RegisterInvalidJSON",
			method:     http.MethodPost,
			path:       "/api/auth/register",
			body:       `{"email":}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid request body",
		},
		{
			name:       "RegisterMissingFields",
			method:     http.MethodPost,
			path:       "/api/auth/register",
			body:       `{"email":"a@test.dev","password":"123456"}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "Email, password, and name are required",
		},
		{
			name:       "LoginMissingFields",
			method:     http.MethodPost,
			path:       "/api/auth/login",
			body:       `{"email":"a@test.dev"}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "Email and password are required",
		},
		{
			name:       "RefreshInvalidJSON",
			method:     http.MethodPost,
			path:       "/api/auth/refresh",
			body:       `{"refresh_token":}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "Invalid request body",
		},
		{
			name:       "ProtectedNoHeader",
			method:     http.MethodGet,
			path:       "/api/clients",
			wantStatus: http.StatusUnauthorized,
			wantError:  "Authentication required",
		},
		{
			name:       "ProtectedInvalidBearerFormat",
			method:     http.MethodPut,
			path:       "/api/users/me",
			authHeader: "Token abc",
			wantStatus: http.StatusUnauthorized,
			wantError:  "Authentication required",
		},
		{
			name:       "ProtectedInvalidToken",
			method:     http.MethodGet,
			path:       "/api/payments?event_ids=bad",
			authHeader: "Bearer invalid-token",
			wantStatus: http.StatusUnauthorized,
			wantError:  "Invalid or expired token",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, bytes.NewBufferString(tc.body))
			if tc.body != "" {
				req.Header.Set("Content-Type", "application/json")
			}
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rr := httptest.NewRecorder()

			h.ServeHTTP(rr, req)

			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d, body=%s", rr.Code, tc.wantStatus, rr.Body.String())
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}
			var payload map[string]string
			if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
				t.Fatalf("body is not valid JSON: %v; body=%s", err, rr.Body.String())
			}
			if payload["error"] != tc.wantError {
				t.Fatalf("error = %q, want %q", payload["error"], tc.wantError)
			}
		})
	}
}
