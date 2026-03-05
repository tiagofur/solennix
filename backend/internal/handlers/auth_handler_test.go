package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

func TestAuthHandlerValidationPaths(t *testing.T) {
	h := &AuthHandler{
		authService: services.NewAuthService("test-secret", 1),
	}

	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		call       func(*AuthHandler, http.ResponseWriter, *http.Request)
		wantStatus int
		wantBody   string
	}{
		{
			name:       "GivenInvalidRegisterBody_WhenRegister_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/register",
			body:       `{"email":}`,
			call:       (*AuthHandler).Register,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Invalid request body",
		},
		{
			name:       "GivenMissingRegisterFields_WhenRegister_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/register",
			body:       `{"email":"a@test.dev","password":"123456"}`,
			call:       (*AuthHandler).Register,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Email, password, and name are required",
		},
		{
			name:       "GivenShortPassword_WhenRegister_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/register",
			body:       `{"email":"a@test.dev","password":"123","name":"A"}`,
			call:       (*AuthHandler).Register,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Password must be at least 6 characters",
		},
		{
			name:       "GivenInvalidLoginBody_WhenLogin_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/login",
			body:       `{"email":}`,
			call:       (*AuthHandler).Login,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Invalid request body",
		},
		{
			name:       "GivenMissingLoginFields_WhenLogin_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/login",
			body:       `{"email":"a@test.dev"}`,
			call:       (*AuthHandler).Login,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Email and password are required",
		},
		{
			name:       "GivenInvalidRefreshBody_WhenRefresh_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/refresh",
			body:       `{"refresh_token":}`,
			call:       (*AuthHandler).RefreshToken,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Invalid request body",
		},
		{
			name:       "GivenInvalidRefreshToken_WhenRefresh_ThenUnauthorized",
			method:     http.MethodPost,
			path:       "/api/auth/refresh",
			body:       `{"refresh_token":"invalid-token"}`,
			call:       (*AuthHandler).RefreshToken,
			wantStatus: http.StatusUnauthorized,
			wantBody:   "Invalid or expired refresh token",
		},
		{
			name:       "GivenInvalidForgotPasswordBody_WhenForgotPassword_ThenBadRequest",
			method:     http.MethodPost,
			path:       "/api/auth/forgot-password",
			body:       `{"email":}`,
			call:       (*AuthHandler).ForgotPassword,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Invalid request body",
		},
		{
			name:       "GivenInvalidUpdateProfileBody_WhenUpdateProfile_ThenBadRequest",
			method:     http.MethodPut,
			path:       "/api/users/me",
			body:       `{"name":}`,
			call:       (*AuthHandler).UpdateProfile,
			wantStatus: http.StatusBadRequest,
			wantBody:   "Invalid request body",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			rr := httptest.NewRecorder()

			tc.call(h, rr, req)

			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rr.Code, tc.wantStatus)
			}
			if !strings.Contains(rr.Body.String(), tc.wantBody) {
				t.Fatalf("body = %q, expected to contain %q", rr.Body.String(), tc.wantBody)
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}
			var payload map[string]string
			if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
				t.Fatalf("response must be valid JSON: %v", err)
			}
			if payload["error"] == "" {
				t.Fatalf("response must include non-empty error field: %s", rr.Body.String())
			}
		})
	}
}

func TestAuthHandlerRefreshTokenSuccess(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{authService: authService}
	pair, err := authService.GenerateTokenPair(uuid.New(), "refresh@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(`{"refresh_token":"`+pair.RefreshToken+`"}`))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if !strings.Contains(rr.Body.String(), "access_token") {
		t.Fatalf("body = %q, expected access_token", rr.Body.String())
	}
}

func TestAuthHandlerErrorBranchesWithClosedRepo(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	h := &AuthHandler{
		userRepo:    repository.NewUserRepo(pool),
		authService: services.NewAuthService("test-secret", 1),
	}

	t.Run("RegisterCreateError", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"err@test.dev","password":"123456","name":"Err"}`))
		rr := httptest.NewRecorder()
		h.Register(rr, req)
		if rr.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusInternalServerError)
		}
	})

	t.Run("RegisterHashError", func(t *testing.T) {
		longPassword := strings.Repeat("a", 80)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"hash@test.dev","password":"`+longPassword+`","name":"Err"}`))
		rr := httptest.NewRecorder()
		h.Register(rr, req)
		if rr.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusInternalServerError)
		}
	})

	t.Run("LoginRepoError", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"x@test.dev","password":"123456"}`))
		rr := httptest.NewRecorder()
		h.Login(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
		}
	})

	t.Run("UpdateProfileRepoError", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(`{"name":"New Name"}`))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)
		if rr.Code != http.StatusInternalServerError {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusInternalServerError)
		}
	})
}

func TestNewAuthHandler(t *testing.T) {
	h := NewAuthHandler(nil, nil, nil)
	if h == nil {
		t.Fatal("NewAuthHandler returned nil")
	}
}

func TestAuthHandlerMe(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	h := &AuthHandler{
		userRepo: repository.NewUserRepo(pool),
	}
	req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	rr := httptest.NewRecorder()
	h.Me(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusNotFound)
	}
}

func TestAuthHandlerLogout(t *testing.T) {
	h := &AuthHandler{}
	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	rr := httptest.NewRecorder()
	h.Logout(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
	if !strings.Contains(rr.Body.String(), "Logged out") {
		t.Fatalf("body = %q, expected logout message", rr.Body.String())
	}
	// Verify cookie is cleared
	cookies := rr.Result().Cookies()
	found := false
	for _, c := range cookies {
		if c.Name == "auth_token" && c.MaxAge == -1 {
			found = true
		}
	}
	if !found {
		t.Fatal("expected auth_token cookie to be cleared (MaxAge=-1)")
	}
}

func TestAuthHandlerForgotPasswordWithClosedPool(t *testing.T) {
	pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
	if err != nil {
		t.Skipf("pgxpool.New failed: %v", err)
	}
	pool.Close()

	h := &AuthHandler{
		userRepo:    repository.NewUserRepo(pool),
		authService: services.NewAuthService("test-secret", 1),
	}
	req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(`{"email":"test@test.dev"}`))
	rr := httptest.NewRecorder()
	h.ForgotPassword(rr, req)
	// Always returns 200 (security: don't reveal if email exists)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
	}
}

func TestAuthHandlerResetPassword(t *testing.T) {
	h := &AuthHandler{
		authService: services.NewAuthService("test-secret", 1),
	}

	t.Run("InvalidBody", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{bad`))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("MissingFields", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"","new_password":""}`))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("ShortPassword", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"abc","new_password":"12345"}`))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("InvalidToken", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"invalid-token","new_password":"123456"}`))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
		}
	})

	t.Run("ValidResetTokenButUserNotFound", func(t *testing.T) {
		pool, err := pgxpool.New(context.Background(), "postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable")
		if err != nil {
			t.Skipf("pgxpool.New failed: %v", err)
		}
		pool.Close()

		hh := &AuthHandler{
			userRepo:    repository.NewUserRepo(pool),
			authService: services.NewAuthService("test-secret", 1),
		}

		// Generate a valid reset token
		token, _ := hh.authService.GenerateResetToken(uuid.New(), "test@test.dev")

		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"`+token+`","new_password":"123456"}`))
		rr := httptest.NewRecorder()
		hh.ResetPassword(rr, req)
		if rr.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want %d, body=%s", rr.Code, http.StatusNotFound, rr.Body.String())
		}
	})

	t.Run("NonResetToken", func(t *testing.T) {
		pair, _ := h.authService.GenerateTokenPair(uuid.New(), "test@test.dev")
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(`{"token":"`+pair.AccessToken+`","new_password":"123456"}`))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)
		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
		}
	})
}

func TestRegisterValidationEdgeCases(t *testing.T) {
	h := &AuthHandler{
		authService: services.NewAuthService("test-secret", 1),
	}

	t.Run("InvalidEmailFormat", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"not-an-email","password":"123456","name":"Test"}`))
		rr := httptest.NewRecorder()
		h.Register(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
		if !strings.Contains(rr.Body.String(), "Invalid email") {
			t.Fatalf("body = %q, expected invalid email error", rr.Body.String())
		}
	})

	t.Run("TooLongEmail", func(t *testing.T) {
		longEmail := strings.Repeat("a", 250) + "@test.dev"
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"`+longEmail+`","password":"123456","name":"Test"}`))
		rr := httptest.NewRecorder()
		h.Register(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
	})

	t.Run("TooLongName", func(t *testing.T) {
		longName := strings.Repeat("a", 256)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(`{"email":"valid@test.dev","password":"123456","name":"`+longName+`"}`))
		rr := httptest.NewRecorder()
		h.Register(rr, req)
		if rr.Code != http.StatusBadRequest {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusBadRequest)
		}
		if !strings.Contains(rr.Body.String(), "Name must not exceed") {
			t.Fatalf("body = %q, expected name length error", rr.Body.String())
		}
	})
}
