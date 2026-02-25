package handlers

import (
	"log/slog"
	"net/http"

	"github.com/tiagofur/eventosapp-backend/internal/middleware"
	"github.com/tiagofur/eventosapp-backend/internal/models"
	"github.com/tiagofur/eventosapp-backend/internal/repository"
	"github.com/tiagofur/eventosapp-backend/internal/services"
)

type AuthHandler struct {
	userRepo    *repository.UserRepo
	authService *services.AuthService
}

func NewAuthHandler(userRepo *repository.UserRepo, authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		userRepo:    userRepo,
		authService: authService,
	}
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

// Register handles POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	// Check if user already exists
	existing, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		writeError(w, http.StatusConflict, "Email already registered")
		return
	}

	// Hash password
	hash, err := h.authService.HashPassword(req.Password)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
		Plan:         "basic",
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		slog.Error("Failed to create user", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	// Generate tokens
	tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":   user,
		"tokens": tokens,
	})
}

// Login handles POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Find user
	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Check password
	if !h.authService.CheckPassword(req.Password, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Generate tokens
	tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user":   user,
		"tokens": tokens,
	})
}

// Me handles GET /api/auth/me — returns current user profile
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// RefreshToken handles POST /api/auth/refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	claims, err := h.authService.ValidateToken(req.RefreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	}

	tokens, err := h.authService.GenerateTokenPair(claims.UserID, claims.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	writeJSON(w, http.StatusOK, tokens)
}

// ForgotPassword handles POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Always respond success (don't reveal if email exists)
	// In production, send an email with a password reset link
	_, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err == nil {
		// TODO: Send password reset email via SMTP
		slog.Info("Password reset requested", "email", req.Email)
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "If the email exists, a password reset link has been sent",
	})
}

// UpdateProfile handles PUT /api/users/me
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Name                    *string  `json:"name"`
		BusinessName            *string  `json:"business_name"`
		LogoURL                 *string  `json:"logo_url"`
		BrandColor              *string  `json:"brand_color"`
		ShowBusinessNameInPdf   *bool    `json:"show_business_name_in_pdf"`
		DefaultDepositPercent   *float64 `json:"default_deposit_percent"`
		DefaultCancellationDays *float64 `json:"default_cancellation_days"`
		DefaultRefundPercent    *float64 `json:"default_refund_percent"`
	}

	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.userRepo.Update(r.Context(), userID,
		req.Name, req.BusinessName, req.LogoURL, req.BrandColor, req.ShowBusinessNameInPdf,
		req.DefaultDepositPercent, req.DefaultCancellationDays, req.DefaultRefundPercent,
	)
	if err != nil {
		slog.Error("Failed to update profile", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, user)
}
