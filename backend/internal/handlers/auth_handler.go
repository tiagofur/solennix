package handlers

import (
	"log/slog"
	"net/http"
	"regexp"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

type AuthHandler struct {
	userRepo     FullUserRepository
	authService  *services.AuthService
	emailService *services.EmailService
}

func NewAuthHandler(userRepo FullUserRepository, authService *services.AuthService, emailService *services.EmailService) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		authService:  authService,
		emailService: emailService,
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

	req.Email = strings.TrimSpace(req.Email)
	req.Name = strings.TrimSpace(req.Name)

	if req.Email == "" || req.Password == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	if !emailRegex.MatchString(req.Email) || len(req.Email) > 255 {
		writeError(w, http.StatusBadRequest, "Invalid email format")
		return
	}

	if len(req.Name) > 255 {
		writeError(w, http.StatusBadRequest, "Name must not exceed 255 characters")
		return
	}

	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	if len(req.Password) > 128 {
		writeError(w, http.StatusBadRequest, "Password must not exceed 128 characters")
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

	// Set httpOnly cookie for auth token (SECURE)
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https", // True in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60, // 24 hours
	})

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

	req.Email = strings.TrimSpace(req.Email)

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

	// Set httpOnly cookie for auth token (SECURE)
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https", // True in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60, // 24 hours
	})

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

	claims, err := h.authService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	}

	// Verify user still exists (prevent deleted/suspended users from refreshing)
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		writeError(w, http.StatusUnauthorized, "User no longer exists")
		return
	}

	tokens, err := h.authService.GenerateTokenPair(claims.UserID, claims.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Set httpOnly cookie for new access token (SECURE)
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60, // 24 hours
	})

	// Also return tokens in response for backward compatibility
	writeJSON(w, http.StatusOK, tokens)
}

// Logout handles POST /api/auth/logout - Clears httpOnly cookie
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Clear the auth cookie by setting MaxAge to -1
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1, // Delete cookie
	})

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

// ForgotPassword handles POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Always respond success (don't reveal if email exists)
	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err == nil && user != nil {
		// Generate password reset token (expires in 1 hour)
		token, err := h.authService.GenerateResetToken(user.ID, user.Email)
		if err != nil {
			slog.Error("Failed to generate reset token", "error", err)
			writeJSON(w, http.StatusOK, map[string]string{
				"message": "If the email exists, a password reset link has been sent",
			})
			return
		}

		// Send password reset email
		if err := h.emailService.SendPasswordReset(user.Email, token, user.Name); err != nil {
			slog.Error("Failed to send password reset email", "error", err, "email", user.Email)
			// Still return success to user (security: don't reveal if email exists)
		} else {
			slog.Info("Password reset email sent", "email", user.Email)
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "If the email exists, a password reset link has been sent",
	})
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// ResetPassword handles POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate token and password
	if req.Token == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "Token and new password are required")
		return
	}

	if len(req.NewPassword) < 6 {
		writeError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	if len(req.NewPassword) > 128 {
		writeError(w, http.StatusBadRequest, "Password must not exceed 128 characters")
		return
	}

	// Validate reset token (must be valid and have subject="password-reset")
	claims, err := h.authService.ValidateResetToken(req.Token)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired reset token")
		return
	}

	// Get user from token claims
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	// Hash new password
	hash, err := h.authService.HashPassword(req.NewPassword)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Update password in database
	if err := h.userRepo.UpdatePassword(r.Context(), user.ID, hash); err != nil {
		slog.Error("Failed to update user password", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	slog.Info("Password reset successful", "user_id", user.ID)

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Password reset successfully",
	})
}

// ChangePassword handles POST /api/auth/change-password (authenticated)
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "Current password and new password are required")
		return
	}

	if len(req.NewPassword) < 6 {
		writeError(w, http.StatusBadRequest, "New password must be at least 6 characters")
		return
	}

	if len(req.NewPassword) > 128 {
		writeError(w, http.StatusBadRequest, "New password must not exceed 128 characters")
		return
	}

	// Get user to verify current password
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	// Verify current password
	if !h.authService.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		writeError(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	hash, err := h.authService.HashPassword(req.NewPassword)
	if err != nil {
		slog.Error("Failed to hash password", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Update password
	if err := h.userRepo.UpdatePassword(r.Context(), userID, hash); err != nil {
		slog.Error("Failed to update password", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	slog.Info("Password changed successfully", "user_id", userID)
	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Password changed successfully",
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
		ContractTemplate        *string  `json:"contract_template"`
	}

	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.ContractTemplate != nil {
		if err := validateContractTemplate(*req.ContractTemplate); err != nil {
			if validationErr, ok := err.(ValidationError); ok {
				writeError(w, http.StatusBadRequest, validationErr.Error())
				return
			}
			writeError(w, http.StatusBadRequest, "Invalid contract template")
			return
		}
	}

	user, err := h.userRepo.Update(r.Context(), userID,
		req.Name, req.BusinessName, req.LogoURL, req.BrandColor, req.ShowBusinessNameInPdf,
		req.DefaultDepositPercent, req.DefaultCancellationDays, req.DefaultRefundPercent, req.ContractTemplate,
	)
	if err != nil {
		slog.Error("Failed to update profile", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	writeJSON(w, http.StatusOK, user)
}
