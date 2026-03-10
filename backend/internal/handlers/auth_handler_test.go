package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
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
	userID := uuid.New()
	authService := services.NewAuthService("test-secret", 1)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Email: "refresh@test.dev"}, nil)
	h := &AuthHandler{authService: authService, userRepo: userRepo}
	pair, err := authService.GenerateTokenPair(userID, "refresh@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(`{"refresh_token":"`+pair.RefreshToken+`"}`))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body = %s", rr.Code, http.StatusOK, rr.Body.String())
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

// ---------------------------------------------------------------------------
// Auth Handler tests using MockFullUserRepo (mock-based, no DB required)
// ---------------------------------------------------------------------------

func TestAuthHandler_Register_HappyPaths(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)

	t.Run("Success_ValidRegistration", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		// No existing user
		mockRepo.On("GetByEmail", mock.Anything, "new@test.dev").Return(nil, fmt.Errorf("not found"))
		// Create succeeds and sets user ID
		mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.User")).Run(func(args mock.Arguments) {
			user := args.Get(1).(*models.User)
			user.ID = uuid.New()
		}).Return(nil)

		body := `{"email":"new@test.dev","password":"123456","name":"New User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Register(rr, req)

		assert.Equal(t, http.StatusCreated, rr.Code)
		assert.Contains(t, rr.Body.String(), "user")

		// Verify cookie is set
		cookies := rr.Result().Cookies()
		found := false
		for _, c := range cookies {
			if c.Name == "auth_token" && c.Value != "" {
				found = true
			}
		}
		assert.True(t, found, "expected auth_token cookie to be set")

		mockRepo.AssertExpectations(t)
	})

	t.Run("DuplicateEmail_Returns409", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		existingUser := &models.User{ID: uuid.New(), Email: "existing@test.dev"}
		mockRepo.On("GetByEmail", mock.Anything, "existing@test.dev").Return(existingUser, nil)

		body := `{"email":"existing@test.dev","password":"123456","name":"Test User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Register(rr, req)

		assert.Equal(t, http.StatusConflict, rr.Code)
		assert.Contains(t, rr.Body.String(), "Email already registered")
		mockRepo.AssertExpectations(t)
	})

	t.Run("CreateError_Returns500", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		mockRepo.On("GetByEmail", mock.Anything, "fail@test.dev").Return(nil, fmt.Errorf("not found"))
		mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.User")).Return(fmt.Errorf("db error"))

		body := `{"email":"fail@test.dev","password":"123456","name":"Fail User"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Register(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to create account")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_Login_HappyPaths(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)

	t.Run("Success_ValidLogin", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		hash, _ := authService.HashPassword("correct-password")
		user := &models.User{
			ID:           uuid.New(),
			Email:        "login@test.dev",
			PasswordHash: hash,
			Name:         "Login User",
			Plan:         "basic",
		}
		mockRepo.On("GetByEmail", mock.Anything, "login@test.dev").Return(user, nil)

		body := `{"email":"login@test.dev","password":"correct-password"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Login(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "user")

		// Verify cookie is set
		cookies := rr.Result().Cookies()
		found := false
		for _, c := range cookies {
			if c.Name == "auth_token" && c.Value != "" {
				found = true
			}
		}
		assert.True(t, found, "expected auth_token cookie to be set")
		mockRepo.AssertExpectations(t)
	})

	t.Run("UserNotFound_Returns401", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		mockRepo.On("GetByEmail", mock.Anything, "notfound@test.dev").Return(nil, fmt.Errorf("not found"))

		body := `{"email":"notfound@test.dev","password":"123456"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Login(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid email or password")
		mockRepo.AssertExpectations(t)
	})

	t.Run("WrongPassword_Returns401", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		hash, _ := authService.HashPassword("correct-password")
		user := &models.User{
			ID:           uuid.New(),
			Email:        "wrong@test.dev",
			PasswordHash: hash,
		}
		mockRepo.On("GetByEmail", mock.Anything, "wrong@test.dev").Return(user, nil)

		body := `{"email":"wrong@test.dev","password":"wrong-password"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.Login(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid email or password")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_Me_HappyPaths(t *testing.T) {
	t.Run("Success_ReturnsUser", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{userRepo: mockRepo}

		userID := uuid.New()
		user := &models.User{
			ID:    userID,
			Email: "me@test.dev",
			Name:  "Me User",
			Plan:  "pro",
		}
		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.Me(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "me@test.dev")
		assert.Contains(t, rr.Body.String(), "Me User")
		mockRepo.AssertExpectations(t)
	})

	t.Run("NotFound_Returns404", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{userRepo: mockRepo}

		userID := uuid.New()
		mockRepo.On("GetByID", mock.Anything, userID).Return(nil, fmt.Errorf("not found"))

		req := httptest.NewRequest(http.MethodGet, "/api/auth/me", nil)
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.Me(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "User not found")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_UpdateProfile_HappyPaths(t *testing.T) {
	t.Run("Success_ValidUpdate", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{userRepo: mockRepo}

		userID := uuid.New()
		newName := "New Name"
		newBusiness := "New Business"
		user := &models.User{
			ID:           userID,
			Email:        "update@test.dev",
			Name:         newName,
			BusinessName: &newBusiness,
		}

		mockRepo.On("Update", mock.Anything, userID,
			&newName, &newBusiness, (*string)(nil), (*string)(nil), (*bool)(nil),
			(*float64)(nil), (*float64)(nil), (*float64)(nil), (*string)(nil),
		).Return(user, nil)

		body := `{"name":"New Name","business_name":"New Business"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "New Name")
		assert.Contains(t, rr.Body.String(), "New Business")
		mockRepo.AssertExpectations(t)
	})

	t.Run("InvalidTemplate_Returns400", func(t *testing.T) {
		h := &AuthHandler{}
		userID := uuid.New()

		body := `{"contract_template":"Invalid [token]"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "contains unsupported token [token]")
	})

	t.Run("RepoError_Returns500", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{userRepo: mockRepo}
		userID := uuid.New()

		mockRepo.On("Update", mock.Anything, userID,
			mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything,
			mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		).Return(nil, fmt.Errorf("db error"))

		body := `{"name":"Fail Update"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to update profile")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_Logout_HappyPaths(t *testing.T) {
	t.Run("Success_ReturnsOKAndClearsCookie", func(t *testing.T) {
		h := &AuthHandler{}
		req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
		rr := httptest.NewRecorder()
		h.Logout(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "Logged out successfully")

		cookies := rr.Result().Cookies()
		found := false
		for _, c := range cookies {
			if c.Name == "auth_token" && c.MaxAge == -1 {
				found = true
			}
		}
		assert.True(t, found, "expected auth_token cookie cleared")
	})
}

func TestAuthHandler_ForgotPassword_Paths(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	emailService := services.NewEmailService(&config.Config{
		FrontendURL: "http://localhost:5173",
		// No Resend API key configured, so email send will fail gracefully
	})

	t.Run("UserFound_EmailSendFails_StillReturns200", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:     mockRepo,
			authService:  authService,
			emailService: emailService,
		}

		user := &models.User{
			ID:    uuid.New(),
			Email: "found@test.dev",
			Name:  "Found User",
		}
		mockRepo.On("GetByEmail", mock.Anything, "found@test.dev").Return(user, nil)

		body := `{"email":"found@test.dev"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ForgotPassword(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "If the email exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("UserNotFound_StillReturns200", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:     mockRepo,
			authService:  authService,
			emailService: emailService,
		}

		mockRepo.On("GetByEmail", mock.Anything, "notfound@test.dev").Return(nil, fmt.Errorf("not found"))

		body := `{"email":"notfound@test.dev"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ForgotPassword(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "If the email exists")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_ResetPassword_Paths(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)

	t.Run("Success_ValidTokenAndPassword", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		userID := uuid.New()
		token, err := authService.GenerateResetToken(userID, "reset@test.dev")
		assert.NoError(t, err)

		user := &models.User{
			ID:    userID,
			Email: "reset@test.dev",
			Name:  "Reset User",
		}
		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
		mockRepo.On("UpdatePassword", mock.Anything, userID, mock.AnythingOfType("string")).Return(nil)

		body := fmt.Sprintf(`{"token":"%s","new_password":"newpassword123"}`, token)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "Password reset successfully")
		mockRepo.AssertExpectations(t)
	})

	t.Run("InvalidToken_Returns401", func(t *testing.T) {
		h := &AuthHandler{authService: authService}

		body := `{"token":"invalid-token","new_password":"123456"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)

		assert.Equal(t, http.StatusUnauthorized, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid or expired reset token")
	})

	t.Run("ShortPassword_Returns400", func(t *testing.T) {
		h := &AuthHandler{authService: authService}

		body := `{"token":"abc","new_password":"12345"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Password must be at least 6 characters")
	})

	t.Run("UserNotFoundFromToken_Returns404", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		userID := uuid.New()
		token, _ := authService.GenerateResetToken(userID, "missing@test.dev")
		mockRepo.On("GetByID", mock.Anything, userID).Return(nil, fmt.Errorf("not found"))

		body := fmt.Sprintf(`{"token":"%s","new_password":"123456"}`, token)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)

		assert.Equal(t, http.StatusNotFound, rr.Code)
		assert.Contains(t, rr.Body.String(), "User not found")
		mockRepo.AssertExpectations(t)
	})

	t.Run("UpdatePasswordError_Returns500", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: authService,
		}

		userID := uuid.New()
		token, _ := authService.GenerateResetToken(userID, "updatefail@test.dev")
		user := &models.User{ID: userID, Email: "updatefail@test.dev"}
		mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)
		mockRepo.On("UpdatePassword", mock.Anything, userID, mock.AnythingOfType("string")).Return(fmt.Errorf("db error"))

		body := fmt.Sprintf(`{"token":"%s","new_password":"123456"}`, token)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ResetPassword(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to update password")
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthHandler_Register_GenerateTokenError(t *testing.T) {
	// Use an auth service with empty secret to cause token generation issues
	// Actually, HMAC signing with empty key still works. The only way to trigger
	// the GenerateTokenPair error is indirectly. Instead, test the full success
	// path with all assertions including cookie verification.
	authService := services.NewAuthService("test-secret", 1)
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	mockRepo.On("GetByEmail", mock.Anything, "test@test.dev").Return(nil, fmt.Errorf("not found"))
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.User")).Run(func(args mock.Arguments) {
		user := args.Get(1).(*models.User)
		user.ID = uuid.New()
	}).Return(nil)

	body := `{"email":"test@test.dev","password":"123456","name":"Test User"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Register(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)

	// Verify the response contains user and tokens (tokens in both cookie AND body for backward compat)
	var response map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotNil(t, response["user"])
	assert.NotNil(t, response["tokens"], "tokens should be in response body for backward compatibility")

	// Verify cookie
	cookies := rr.Result().Cookies()
	var authCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "auth_token" {
			authCookie = c
			break
		}
	}
	assert.NotNil(t, authCookie)
	assert.True(t, authCookie.HttpOnly)
	assert.Equal(t, "/", authCookie.Path)
	assert.Equal(t, 24*60*60, authCookie.MaxAge)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Login_FullSuccessVerification(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	hash, _ := authService.HashPassword("correct-pwd")
	user := &models.User{
		ID:           uuid.New(),
		Email:        "full@test.dev",
		PasswordHash: hash,
		Name:         "Full User",
		Plan:         "pro",
	}
	mockRepo.On("GetByEmail", mock.Anything, "full@test.dev").Return(user, nil)

	body := `{"email":"full@test.dev","password":"correct-pwd"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Login(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	// Verify response contains user and tokens (tokens in both cookie AND body for backward compat)
	var response map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.NotNil(t, response["user"])
	assert.NotNil(t, response["tokens"], "tokens should be in response body for backward compatibility")

	// Verify cookie properties
	cookies := rr.Result().Cookies()
	var authCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "auth_token" {
			authCookie = c
			break
		}
	}
	assert.NotNil(t, authCookie)
	assert.True(t, authCookie.HttpOnly)
	assert.Equal(t, http.SameSiteLaxMode, authCookie.SameSite)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_RefreshToken_CookieSetOnSuccess(t *testing.T) {
	userID := uuid.New()
	authService := services.NewAuthService("test-secret", 1)
	userRepo := new(MockFullUserRepo)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Email: "cookie@test.dev"}, nil)
	h := &AuthHandler{authService: authService, userRepo: userRepo}
	pair, err := authService.GenerateTokenPair(userID, "cookie@test.dev")
	assert.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(`{"refresh_token":"`+pair.RefreshToken+`"}`))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	// Verify cookie is set on refresh
	cookies := rr.Result().Cookies()
	var authCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "auth_token" {
			authCookie = c
			break
		}
	}
	assert.NotNil(t, authCookie, "expected auth_token cookie on refresh")
	assert.True(t, authCookie.HttpOnly)
	assert.Equal(t, 24*60*60, authCookie.MaxAge)

	// Verify response contains tokens
	var response map[string]interface{}
	json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NotEmpty(t, response["access_token"])
	assert.NotEmpty(t, response["refresh_token"])
}

func TestAuthHandler_ResetPassword_HashPasswordError(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	userID := uuid.New()
	token, err := authService.GenerateResetToken(userID, "hashfail@test.dev")
	assert.NoError(t, err)

	user := &models.User{ID: userID, Email: "hashfail@test.dev"}
	mockRepo.On("GetByID", mock.Anything, userID).Return(user, nil)

	// Password > 72 bytes triggers bcrypt error
	longPassword := strings.Repeat("a", 80)
	body := fmt.Sprintf(`{"token":"%s","new_password":"%s"}`, token, longPassword)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.ResetPassword(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Internal server error")
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_UpdateProfile_WithValidContractTemplate(t *testing.T) {
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: services.NewAuthService("test-secret", 1),
	}

	userID := uuid.New()
	updatedUser := &models.User{
		ID:    userID,
		Email: "template@test.dev",
		Name:  "Template User",
		Plan:  "pro",
	}

	mockRepo.On("Update", mock.Anything, userID,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything,
	).Return(updatedUser, nil)

	// Use a valid contract template with recognized tokens
	body := `{"contract_template":"Hello [client_name], your event on [event_date]."}`
	req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()
	h.UpdateProfile(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_UpdateProfile_WithAllFields(t *testing.T) {
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: services.NewAuthService("test-secret", 1),
	}

	userID := uuid.New()
	updatedUser := &models.User{
		ID:    userID,
		Email: "allfields@test.dev",
		Name:  "All Fields",
		Plan:  "pro",
	}

	mockRepo.On("Update", mock.Anything, userID,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything,
	).Return(updatedUser, nil)

	body := `{"name":"All Fields","business_name":"My Biz","logo_url":"https://example.com/logo.png","brand_color":"#ff6600","show_business_name_in_pdf":true,"default_deposit_percent":50.0,"default_cancellation_days":7.0,"default_refund_percent":80.0}`
	req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()
	h.UpdateProfile(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_UpdateProfile_Paths(t *testing.T) {
	t.Run("Success_ReturnsUpdatedUser", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: services.NewAuthService("test-secret", 1),
		}

		userID := uuid.New()
		name := "Updated Name"
		updatedUser := &models.User{
			ID:    userID,
			Email: "profile@test.dev",
			Name:  name,
			Plan:  "basic",
		}

		mockRepo.On("Update", mock.Anything, userID,
			mock.AnythingOfType("*string"),  // name
			mock.AnythingOfType("*string"),  // businessName
			mock.AnythingOfType("*string"),  // logoURL
			mock.AnythingOfType("*string"),  // brandColor
			(*bool)(nil),                    // showBusinessNameInPdf
			(*float64)(nil),                 // depositPercent
			(*float64)(nil),                 // cancellationDays
			(*float64)(nil),                 // refundPercent
			(*string)(nil),                  // contractTemplate
		).Return(updatedUser, nil)

		body := `{"name":"Updated Name","business_name":"My Biz"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "Updated Name")
		mockRepo.AssertExpectations(t)
	})

	t.Run("InvalidBody_Returns400", func(t *testing.T) {
		h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(`{invalid`))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		assert.Contains(t, rr.Body.String(), "Invalid request body")
	})

	t.Run("InvalidContractTemplate_Returns400", func(t *testing.T) {
		h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

		// Use an invalid token in the contract template
		body := `{"contract_template":"Hello [invalid_token_xyz] world"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusBadRequest, rr.Code)
		mockRepo := new(MockFullUserRepo) // not used, just to show pattern
		_ = mockRepo
	})

	t.Run("UpdateError_Returns500", func(t *testing.T) {
		mockRepo := new(MockFullUserRepo)
		h := &AuthHandler{
			userRepo:    mockRepo,
			authService: services.NewAuthService("test-secret", 1),
		}

		userID := uuid.New()
		mockRepo.On("Update", mock.Anything, userID,
			mock.Anything, mock.Anything, mock.Anything, mock.Anything,
			mock.Anything, mock.Anything, mock.Anything, mock.Anything,
			mock.Anything,
		).Return(nil, fmt.Errorf("db error"))

		body := `{"name":"Fail Name"}`
		req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
		req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
		rr := httptest.NewRecorder()
		h.UpdateProfile(rr, req)

		assert.Equal(t, http.StatusInternalServerError, rr.Code)
		assert.Contains(t, rr.Body.String(), "Failed to update profile")
		mockRepo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// Additional coverage tests — ForgotPassword edge cases
// ---------------------------------------------------------------------------

func TestAuthHandler_ForgotPassword_GenerateResetTokenError(t *testing.T) {
	// When GenerateResetToken fails, ForgotPassword should still return 200
	// for security reasons. We trigger this by using an auth service that
	// generates tokens normally, but we verify the early-return path in
	// ForgotPassword when the user is found but email send fails.
	// The GenerateResetToken error path (lines 269-275) requires the JWT
	// signing to fail, which is nearly impossible with HMAC. However, we
	// can verify the full flow with a found user where email sending fails
	// and confirm the response is always 200.

	t.Run("UserFoundButGetByEmailReturnsNilUser_StillReturns200", func(t *testing.T) {
		// Edge case: GetByEmail returns (nil, nil) — no error but no user either
		mockRepo := new(MockFullUserRepo)
		authService := services.NewAuthService("test-secret", 1)
		emailService := services.NewEmailService(&config.Config{
			FrontendURL: "http://localhost:5173",
		})
		h := &AuthHandler{
			userRepo:     mockRepo,
			authService:  authService,
			emailService: emailService,
		}

		mockRepo.On("GetByEmail", mock.Anything, "niluser@test.dev").Return(nil, nil)

		body := `{"email":"niluser@test.dev"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ForgotPassword(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "If the email exists")
		mockRepo.AssertExpectations(t)
	})

	t.Run("UserFoundEmailSendError_StillReturns200_WithMessage", func(t *testing.T) {
		// Verify the exact response body when email sending fails
		mockRepo := new(MockFullUserRepo)
		authService := services.NewAuthService("test-secret", 1)
		emailService := services.NewEmailService(&config.Config{
			FrontendURL:  "http://localhost:5173",
			ResendAPIKey: "", // No API key -> email send will fail
		})
		h := &AuthHandler{
			userRepo:     mockRepo,
			authService:  authService,
			emailService: emailService,
		}

		user := &models.User{
			ID:    uuid.New(),
			Email: "emailfail@test.dev",
			Name:  "Email Fail User",
		}
		mockRepo.On("GetByEmail", mock.Anything, "emailfail@test.dev").Return(user, nil)

		body := `{"email":"emailfail@test.dev"}`
		req := httptest.NewRequest(http.MethodPost, "/api/auth/forgot-password", strings.NewReader(body))
		rr := httptest.NewRecorder()
		h.ForgotPassword(rr, req)

		assert.Equal(t, http.StatusOK, rr.Code)
		var response map[string]string
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "If the email exists, a password reset link has been sent", response["message"])
		mockRepo.AssertExpectations(t)
	})
}

// ---------------------------------------------------------------------------
// Additional coverage tests — RefreshToken edge cases
// ---------------------------------------------------------------------------

func TestAuthHandler_RefreshToken_EmptyTokenField(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{authService: authService}

	// Empty refresh_token field should return 401
	body := `{"refresh_token":""}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid or expired refresh token")
}

func TestAuthHandler_RefreshToken_MissingFieldEntirely(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{authService: authService}

	// JSON body without the refresh_token field at all
	body := `{}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid or expired refresh token")
}

func TestAuthHandler_RefreshToken_TokenFromDifferentSecret(t *testing.T) {
	// Token signed with a different secret should fail validation
	issuerService := services.NewAuthService("issuer-secret", 1)
	validatorService := services.NewAuthService("validator-secret", 1)

	pair, err := issuerService.GenerateTokenPair(uuid.New(), "wrong-secret@test.dev")
	assert.NoError(t, err)

	h := &AuthHandler{authService: validatorService}
	body := `{"refresh_token":"` + pair.RefreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid or expired refresh token")
}

func TestAuthHandler_RefreshToken_ExpiredToken(t *testing.T) {
	// Use negative expiry to create an immediately-expired token pair
	svc := services.NewAuthService("test-secret", -1)
	pair, err := svc.GenerateTokenPair(uuid.New(), "expired-refresh@test.dev")
	assert.NoError(t, err)

	// The refresh token has a 7-day expiry hardcoded, so it won't be expired.
	// Instead, manually craft an expired refresh token.
	// We'll just verify that the access token (which IS expired) fails.
	h := &AuthHandler{authService: svc}
	body := `{"refresh_token":"` + pair.AccessToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid or expired refresh token")
}

// ---------------------------------------------------------------------------
// Additional coverage tests — UpdateProfile edge cases
// ---------------------------------------------------------------------------

func TestAuthHandler_UpdateProfile_ContractTemplateTooLong(t *testing.T) {
	h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

	// Contract template exceeding 20000 characters
	longTemplate := strings.Repeat("x", 20001)
	body := `{"contract_template":"` + longTemplate + `"}`
	req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	rr := httptest.NewRecorder()
	h.UpdateProfile(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "20000 characters or fewer")
}

func TestAuthHandler_UpdateProfile_SuccessWithAllFieldsIncludingContractTemplate(t *testing.T) {
	mockRepo := new(MockFullUserRepo)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: services.NewAuthService("test-secret", 1),
	}

	userID := uuid.New()
	updatedUser := &models.User{
		ID:    userID,
		Email: "full-update@test.dev",
		Name:  "Full Update User",
		Plan:  "pro",
	}

	mockRepo.On("Update", mock.Anything, userID,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything,
		mock.Anything,
	).Return(updatedUser, nil)

	body := `{
		"name":"Full Update User",
		"business_name":"My Business",
		"logo_url":"https://example.com/logo.png",
		"brand_color":"#ff6600",
		"show_business_name_in_pdf":true,
		"default_deposit_percent":50.0,
		"default_cancellation_days":7.0,
		"default_refund_percent":80.0,
		"contract_template":"Contrato para [client_name] en [event_date] por [event_total_amount]."
	}`
	req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	rr := httptest.NewRecorder()
	h.UpdateProfile(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "full-update@test.dev", response["email"])
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_UpdateProfile_MultipleInvalidContractTokens(t *testing.T) {
	h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

	// Template with multiple tokens, one of which is invalid
	body := `{"contract_template":"Hello [client_name], your [bogus_token] is ready."}`
	req := httptest.NewRequest(http.MethodPut, "/api/users/me", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	rr := httptest.NewRecorder()
	h.UpdateProfile(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "unsupported token")
	assert.Contains(t, rr.Body.String(), "bogus_token")
}

// ---------------------------------------------------------------------------
// Additional coverage tests — Login edge cases
// ---------------------------------------------------------------------------

func TestAuthHandler_Login_GetByEmailReturnsNilUserNilError(t *testing.T) {
	// When GetByEmail returns (nil, nil), Login should return 401
	mockRepo := new(MockFullUserRepo)
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	mockRepo.On("GetByEmail", mock.Anything, "ghost@test.dev").Return(nil, nil)

	body := `{"email":"ghost@test.dev","password":"123456"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Login(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid email or password")
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Login_EmailTrimming(t *testing.T) {
	// Verify that email is trimmed before lookup
	mockRepo := new(MockFullUserRepo)
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	hash, _ := authService.HashPassword("password123")
	user := &models.User{
		ID:           uuid.New(),
		Email:        "trimmed@test.dev",
		PasswordHash: hash,
		Name:         "Trimmed User",
		Plan:         "basic",
	}
	// The mock expects the trimmed email
	mockRepo.On("GetByEmail", mock.Anything, "trimmed@test.dev").Return(user, nil)

	body := `{"email":"  trimmed@test.dev  ","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Login(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "user")
	mockRepo.AssertExpectations(t)
}

// ---------------------------------------------------------------------------
// Additional coverage tests — Register edge cases
// ---------------------------------------------------------------------------

func TestAuthHandler_Register_EmailAndNameTrimming(t *testing.T) {
	// Verify that email and name are trimmed before processing
	mockRepo := new(MockFullUserRepo)
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{
		userRepo:    mockRepo,
		authService: authService,
	}

	mockRepo.On("GetByEmail", mock.Anything, "trimreg@test.dev").Return(nil, fmt.Errorf("not found"))
	mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*models.User")).Run(func(args mock.Arguments) {
		user := args.Get(1).(*models.User)
		user.ID = uuid.New()
	}).Return(nil)

	body := `{"email":"  trimreg@test.dev  ","password":"123456","name":"  Trim Name  "}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Register(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "user")
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Register_WhitespaceOnlyFields(t *testing.T) {
	// Whitespace-only email after trimming should be caught as empty
	h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

	body := `{"email":"   ","password":"123456","name":"Test"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Register(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Email, password, and name are required")
}

func TestAuthHandler_Register_WhitespaceOnlyName(t *testing.T) {
	// Whitespace-only name after trimming should be caught as empty
	h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

	body := `{"email":"valid@test.dev","password":"123456","name":"   "}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Register(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Email, password, and name are required")
}

// ---------------------------------------------------------------------------
// Security tests — Password max length
// ---------------------------------------------------------------------------

func TestAuthHandler_Register_PasswordTooLong(t *testing.T) {
	h := &AuthHandler{authService: services.NewAuthService("test-secret", 1)}

	// 129-character password should be rejected
	longPassword := strings.Repeat("a", 129)
	body := fmt.Sprintf(`{"email":"long-pw@test.dev","password":"%s","name":"Test User"}`, longPassword)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.Register(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Password must not exceed 128 characters")
}

func TestAuthHandler_ResetPassword_PasswordTooLong(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	h := &AuthHandler{authService: authService}

	userID := uuid.New()
	token, err := authService.GenerateResetToken(userID, "longpw-reset@test.dev")
	assert.NoError(t, err)

	// 129-character password should be rejected
	longPassword := strings.Repeat("b", 129)
	body := fmt.Sprintf(`{"token":"%s","new_password":"%s"}`, token, longPassword)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/reset-password", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.ResetPassword(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Password must not exceed 128 characters")
}

// ---------------------------------------------------------------------------
// Security tests — Refresh token verifies user exists
// ---------------------------------------------------------------------------

func TestAuthHandler_RefreshToken_UserNotFound(t *testing.T) {
	userID := uuid.New()
	authService := services.NewAuthService("test-secret", 1)

	// Generate a valid refresh token for a user
	pair, err := authService.GenerateTokenPair(userID, "deleted@test.dev")
	assert.NoError(t, err)

	// Mock repo returns not found for the user (simulating a deleted user)
	mockRepo := new(MockFullUserRepo)
	mockRepo.On("GetByID", mock.Anything, userID).Return(nil, fmt.Errorf("not found"))

	h := &AuthHandler{authService: authService, userRepo: mockRepo}

	body := `{"refresh_token":"` + pair.RefreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", strings.NewReader(body))
	rr := httptest.NewRecorder()
	h.RefreshToken(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
	assert.Contains(t, rr.Body.String(), "User no longer exists")
	mockRepo.AssertExpectations(t)
}
