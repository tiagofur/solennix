package handlers

import (
	"context"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"

	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// clientIP returns the real client IP address, checking X-Forwarded-For first
// (for clients behind a reverse proxy), then falling back to r.RemoteAddr.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs; the first is the original client
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	return r.RemoteAddr
}

// dummyHash is a pre-computed bcrypt hash used to normalize timing on login attempts
// with non-existent emails, preventing user enumeration via timing side-channels.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-timing-normalization"), bcrypt.DefaultCost)

// Note: Token blacklist cleanup is now handled by the persistent RevokedTokenRepo
// via a background job in main.go. The in-memory init() goroutine is no longer needed.

// hashToken returns the hex-encoded SHA-256 hash of a token string.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// isResetTokenBlacklisted checks if a reset token has already been used.
func isResetTokenBlacklisted(token string) bool {
	return middleware.GetTokenBlacklist().IsRevoked(context.Background(), hashToken(token))
}

// blacklistResetToken adds a reset token to the blacklist with its expiry time.
func blacklistResetToken(token string, expiry time.Time) {
	_ = middleware.GetTokenBlacklist().Revoke(context.Background(), hashToken(token), expiry)
}

// validatePasswordStrength checks that a password meets minimum complexity requirements:
// at least 8 characters, one uppercase letter, one lowercase letter, and one digit.
func validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one digit")
	}
	if len(password) > 128 {
		return fmt.Errorf("Password must not exceed 128 characters")
	}
	var hasUpper, hasLower, hasDigit bool
	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return fmt.Errorf("Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one digit")
	}
	return nil
}

// isUniqueViolation checks if a database error is a PostgreSQL unique constraint violation (23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type AuthHandler struct {
	userRepo         FullUserRepository
	authService      *services.AuthService
	emailService     *services.EmailService
	cfg              *config.Config
	refreshTokenRepo RefreshTokenRepository
}

func NewAuthHandler(userRepo FullUserRepository, authService *services.AuthService, emailService *services.EmailService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		authService:  authService,
		emailService: emailService,
		cfg:          cfg,
	}
}

// SetRefreshTokenRepo configures refresh token rotation. If not set, old behavior is used.
func (h *AuthHandler) SetRefreshTokenRepo(repo RefreshTokenRepository) {
	h.refreshTokenRepo = repo
}

// setAuthCookie sets the httpOnly auth cookie for the access token.
func setAuthCookie(w http.ResponseWriter, r *http.Request, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   24 * 60 * 60, // 24 hours
	})
}

// storeRefreshToken stores a refresh token in the family table if rotation is enabled.
func (h *AuthHandler) storeRefreshToken(ctx context.Context, refreshToken string, userID uuid.UUID) {
	if h.refreshTokenRepo == nil {
		return
	}
	tokenHash := hashToken(refreshToken)
	refreshClaims, err := h.authService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return
	}
	h.refreshTokenRepo.Store(ctx, userID, refreshClaims.FamilyID, tokenHash, time.Now().Add(7*24*time.Hour))
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

	if err := validatePasswordStrength(req.Password); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check if user already exists. We return 409 with a stable error code so
	// clients can show a clear "email already registered" message. Anti-enumeration
	// on /register is theater — the real defense lives in /login (timing
	// normalization) and /forgot-password. Rate limiting + captcha cover abuse here.
	existing, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		slog.Warn("auth.event", "action", "register_duplicate", "email", req.Email, "ip", clientIP(r))
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

	// Send welcome email (fire-and-forget)
	if h.emailService != nil {
		go func() {
			if err := h.emailService.SendWelcome(user.Email, user.Name); err != nil {
				slog.Warn("Failed to send welcome email", "email", user.Email, "error", err)
			}
		}()
	}

	// Generate tokens
	tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	// Store initial refresh token in family table for rotation
	h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)

	// Set httpOnly cookie for auth token (SECURE)
	setAuthCookie(w, r, tokens.AccessToken)

	slog.Info("auth.event", "action", "register", "user_id", user.ID, "email", user.Email, "ip", clientIP(r))

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
		// Perform dummy bcrypt comparison to normalize response timing,
		// preventing user enumeration via timing side-channels.
		_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(req.Password))
		slog.Warn("auth.event", "action", "login_failed", "email", req.Email, "reason", "user_not_found", "ip", clientIP(r))
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	// Check password
	if !h.authService.CheckPassword(req.Password, user.PasswordHash) {
		slog.Warn("auth.event", "action", "login_failed", "email", req.Email, "reason", "invalid_password", "ip", clientIP(r))
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

	// Store initial refresh token in family table for rotation
	h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)

	// Set httpOnly cookie for auth token (SECURE)
	setAuthCookie(w, r, tokens.AccessToken)

	slog.Info("auth.event", "action", "login_success", "user_id", user.ID, "email", user.Email, "method", "email", "ip", clientIP(r))

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
		slog.Warn("auth.event", "action", "token_refresh_failed", "reason", "invalid_refresh_token", "ip", clientIP(r))
		writeError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	// Verify user still exists (prevent deleted/suspended users from refreshing)
	user, err := h.userRepo.GetByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		slog.Warn("auth.event", "action", "token_refresh_failed", "reason", "user_not_found", "user_id", claims.UserID, "ip", clientIP(r))
		writeError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	// --- ROTATION LOGIC ---
	if h.refreshTokenRepo != nil {
		tokenHash := hashToken(req.RefreshToken)
		familyID, userID, consumeErr := h.refreshTokenRepo.Consume(r.Context(), tokenHash)
		if consumeErr != nil {
			if strings.Contains(consumeErr.Error(), "reuse detected") {
				// COMPROMISE: revoke entire family
				slog.Warn("auth.event", "action", "refresh_token_reuse_detected", "family_id", familyID, "user_id", userID, "ip", clientIP(r))
				h.refreshTokenRepo.RevokeFamily(r.Context(), familyID)
			}
			writeError(w, http.StatusUnauthorized, "Invalid or expired token")
			return
		}

		// Generate new pair with SAME family
		tokens, err := h.authService.GenerateTokenPairWithFamily(claims.UserID, claims.Email, familyID)
		if err != nil {
			slog.Error("Failed to generate tokens", "error", err)
			writeError(w, http.StatusInternalServerError, "Internal server error")
			return
		}

		// Store the new refresh token in the family
		newTokenHash := hashToken(tokens.RefreshToken)
		refreshExpiry := time.Now().Add(7 * 24 * time.Hour)
		h.refreshTokenRepo.Store(r.Context(), claims.UserID, familyID, newTokenHash, refreshExpiry)

		setAuthCookie(w, r, tokens.AccessToken)
		slog.Info("auth.event", "action", "token_refresh", "user_id", claims.UserID, "family_id", familyID, "ip", clientIP(r))
		writeJSON(w, http.StatusOK, tokens)
		return
	}

	// Fallback: no rotation (backward compatible)
	tokens, err := h.authService.GenerateTokenPair(claims.UserID, claims.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	setAuthCookie(w, r, tokens.AccessToken)
	slog.Info("auth.event", "action", "token_refresh", "user_id", claims.UserID, "ip", clientIP(r))
	writeJSON(w, http.StatusOK, tokens)
}

// Logout handles POST /api/auth/logout - Clears httpOnly cookie and blacklists access token
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Extract and blacklist the access token so it cannot be reused via Authorization header
	var token string
	if cookie, err := r.Cookie("auth_token"); err == nil {
		token = cookie.Value
	}
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "bearer") {
				token = parts[1]
			}
		}
	}
	var logoutUserID *string
	if token != "" {
		// Parse token to get expiry for cleanup, then blacklist it
		claims, err := h.authService.ValidateToken(token)
		if err == nil {
			uid := claims.UserID.String()
			logoutUserID = &uid
			expiry := time.Now().Add(24 * time.Hour) // Default: JWT expiry window
			if claims.ExpiresAt != nil {
				expiry = claims.ExpiresAt.Time
			}
			_ = middleware.GetTokenBlacklist().Revoke(context.Background(), hashToken(token), expiry)

			// Revoke all refresh token families for this user
			if h.refreshTokenRepo != nil {
				h.refreshTokenRepo.RevokeAllForUser(r.Context(), claims.UserID)
			}
		}
	}

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

	if logoutUserID != nil {
		slog.Info("auth.event", "action", "logout", "user_id", *logoutUserID, "ip", clientIP(r))
	} else {
		slog.Info("auth.event", "action", "logout", "ip", clientIP(r))
	}

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

	slog.Info("auth.event", "action", "password_reset_request", "email", req.Email, "ip", clientIP(r))

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

		// Send password reset email with retry (up to 3 attempts)
		const maxRetries = 3
		var sendErr error
		for attempt := 1; attempt <= maxRetries; attempt++ {
			sendErr = h.emailService.SendPasswordReset(user.Email, token, user.Name)
			if sendErr == nil {
				slog.Info("Password reset email sent", "email", user.Email, "attempt", attempt)
				break
			}
			slog.Warn("Failed to send password reset email", "error", sendErr, "email", user.Email, "attempt", attempt)
			if attempt < maxRetries {
				time.Sleep(1 * time.Second)
			}
		}
		if sendErr != nil {
			slog.Error("All attempts to send password reset email failed", "error", sendErr, "email", user.Email, "attempts", maxRetries)
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

	if err := validatePasswordStrength(req.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Check if token has already been used
	if isResetTokenBlacklisted(req.Token) {
		writeError(w, http.StatusUnauthorized, "Reset token has already been used")
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
		slog.Warn("auth.event", "action", "password_reset_failed", "reason", "user_not_found", "user_id", claims.UserID, "ip", clientIP(r))
		writeError(w, http.StatusUnauthorized, "Invalid or expired reset token")
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

	// Blacklist the token so it cannot be reused
	blacklistResetToken(req.Token, time.Now().Add(1*time.Hour))

	// Revoke all refresh token families on password reset
	if h.refreshTokenRepo != nil {
		h.refreshTokenRepo.RevokeAllForUser(r.Context(), user.ID)
	}

	slog.Info("auth.event", "action", "password_reset", "user_id", user.ID, "ip", clientIP(r))

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

	if err := validatePasswordStrength(req.NewPassword); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Get user to verify current password
	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		slog.Warn("auth.event", "action", "change_password_failed", "reason", "user_not_found", "user_id", userID, "ip", clientIP(r))
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Verify current password
	if !h.authService.CheckPassword(req.CurrentPassword, user.PasswordHash) {
		slog.Warn("auth.event", "action", "change_password_failed", "reason", "invalid_current_password", "user_id", userID, "ip", clientIP(r))
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

	// Revoke all refresh token families on password change
	if h.refreshTokenRepo != nil {
		h.refreshTokenRepo.RevokeAllForUser(r.Context(), userID)
	}

	slog.Info("auth.event", "action", "password_changed", "user_id", userID, "ip", clientIP(r))
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

// GoogleSignIn handles POST /api/auth/google
// Validates a Google ID token and returns user + JWT tokens
func (h *AuthHandler) GoogleSignIn(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDToken  string  `json:"id_token"`
		FullName *string `json:"full_name,omitempty"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.IDToken == "" {
		writeError(w, http.StatusBadRequest, "id_token is required")
		return
	}

	// Validate Google ID token
	claims, err := validateGoogleIDToken(r.Context(), req.IDToken, h.cfg.GoogleClientIDs)
	if err != nil {
		slog.Warn("Invalid Google ID token", "error", err)
		writeError(w, http.StatusUnauthorized, "Invalid Google ID token")
		return
	}

	googleUserID := claims.Subject
	email := claims.Email
	name := claims.Name
	if req.FullName != nil && *req.FullName != "" {
		name = *req.FullName
	}
	if name == "" {
		name = email // Fallback to email if name is not provided
	}

	// Try to find user by Google ID first
	user, err := h.userRepo.GetByGoogleUserID(r.Context(), googleUserID)
	if err == nil && user != nil {
		// User exists with this Google ID - login
		tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
		if err != nil {
			slog.Error("Failed to generate tokens", "error", err)
			writeError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
		h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
		setAuthCookie(w, r, tokens.AccessToken)
		slog.Info("auth.event", "action", "google_login", "user_id", user.ID, "email", email, "ip", clientIP(r))
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"user":   user,
			"tokens": tokens,
		})
		return
	}

	// Try to find user by email
	user, err = h.userRepo.GetByEmail(r.Context(), email)
	if err == nil && user != nil {
		// User exists with this email — check if Google is already linked
		if user.GoogleUserID != nil && *user.GoogleUserID == googleUserID {
			// Same Google account already linked (shouldn't reach here, but handle gracefully)
			tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
			if err != nil {
				slog.Error("Failed to generate tokens", "error", err)
				writeError(w, http.StatusInternalServerError, "Internal server error")
				return
			}
			h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
			setAuthCookie(w, r, tokens.AccessToken)
			slog.Info("auth.event", "action", "google_login", "user_id", user.ID, "email", email, "ip", clientIP(r))
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"user":   user,
				"tokens": tokens,
			})
			return
		}
		// Account exists but Google is NOT linked — auto-link since Google verified the email
		if err := h.userRepo.LinkGoogleAccount(r.Context(), user.ID, googleUserID); err != nil {
			slog.Error("Failed to link Google account", "error", err, "user_id", user.ID)
			writeError(w, http.StatusInternalServerError, "Failed to link Google account")
			return
		}
		tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
		if err != nil {
			slog.Error("Failed to generate tokens", "error", err)
			writeError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
		h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
		setAuthCookie(w, r, tokens.AccessToken)
		slog.Info("auth.event", "action", "google_link_and_login", "user_id", user.ID, "email", email, "ip", clientIP(r))
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"user":   user,
			"tokens": tokens,
		})
		return
	}

	// Create new user with Google account
	newUser := &models.User{
		Email:        email,
		Name:         name,
		Plan:         "basic",
		GoogleUserID: &googleUserID,
	}
	if err := h.userRepo.CreateWithOAuth(r.Context(), newUser); err != nil {
		// Handle race condition: unique constraint violation means another request created the user
		if isUniqueViolation(err) {
			slog.Warn("Race condition in Google OAuth: user already created, retrying lookup", "email", email)
			existingUser, lookupErr := h.userRepo.GetByEmail(r.Context(), email)
			if lookupErr != nil || existingUser == nil {
				slog.Error("Failed to find user after unique constraint violation", "email", email, "error", lookupErr)
				writeError(w, http.StatusInternalServerError, "Failed to create account")
				return
			}
			// Check if the existing user has this Google account linked
			if existingUser.GoogleUserID != nil && *existingUser.GoogleUserID == googleUserID {
				tokens, tokenErr := h.authService.GenerateTokenPair(existingUser.ID, existingUser.Email)
				if tokenErr != nil {
					slog.Error("Failed to generate tokens", "error", tokenErr)
					writeError(w, http.StatusInternalServerError, "Internal server error")
					return
				}
				h.storeRefreshToken(r.Context(), tokens.RefreshToken, existingUser.ID)
				setAuthCookie(w, r, tokens.AccessToken)
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"user":   existingUser,
					"tokens": tokens,
				})
				return
			}
			// Existing user doesn't have Google linked — auto-link
			if linkErr := h.userRepo.LinkGoogleAccount(r.Context(), existingUser.ID, googleUserID); linkErr != nil {
				slog.Error("Failed to link Google account on race recovery", "error", linkErr)
				writeError(w, http.StatusInternalServerError, "Failed to link Google account")
				return
			}
			tokens, tokenErr := h.authService.GenerateTokenPair(existingUser.ID, existingUser.Email)
			if tokenErr != nil {
				slog.Error("Failed to generate tokens", "error", tokenErr)
				writeError(w, http.StatusInternalServerError, "Internal server error")
				return
			}
			h.storeRefreshToken(r.Context(), tokens.RefreshToken, existingUser.ID)
			setAuthCookie(w, r, tokens.AccessToken)
			slog.Info("auth.event", "action", "google_link_and_login_race", "user_id", existingUser.ID, "email", email, "ip", clientIP(r))
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"user":   existingUser,
				"tokens": tokens,
			})
			return
		}
		slog.Error("Failed to create user", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	tokens, err := h.authService.GenerateTokenPair(newUser.ID, newUser.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	h.storeRefreshToken(r.Context(), tokens.RefreshToken, newUser.ID)
	setAuthCookie(w, r, tokens.AccessToken)
	slog.Info("auth.event", "action", "google_register", "user_id", newUser.ID, "email", newUser.Email, "ip", clientIP(r))

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":   newUser,
		"tokens": tokens,
	})
}

// GoogleIDTokenClaims represents the claims from a Google ID token
type GoogleIDTokenClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Name    string `json:"name"`
}

// googleJWKS caches Google's public keys for JWT signature verification
var (
	googleJWKSCache    []googleJWK
	googleJWKSCacheMu  sync.RWMutex
	googleJWKSCachedAt time.Time
	googleJWKSCacheTTL = 24 * time.Hour
)

type googleJWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type googleJWKSResponse struct {
	Keys []googleJWK `json:"keys"`
}

// fetchGooglePublicKeys fetches Google's JWKS (with caching)
func fetchGooglePublicKeys() ([]googleJWK, error) {
	googleJWKSCacheMu.RLock()
	if len(googleJWKSCache) > 0 && time.Since(googleJWKSCachedAt) < googleJWKSCacheTTL {
		keys := googleJWKSCache
		googleJWKSCacheMu.RUnlock()
		return keys, nil
	}
	googleJWKSCacheMu.RUnlock()

	googleJWKSCacheMu.Lock()
	defer googleJWKSCacheMu.Unlock()

	// Double-check after acquiring write lock
	if len(googleJWKSCache) > 0 && time.Since(googleJWKSCachedAt) < googleJWKSCacheTTL {
		return googleJWKSCache, nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/certs")
	if err != nil {
		if len(googleJWKSCache) > 0 {
			slog.Warn("Google JWKS fetch failed, using stale cached keys", "error", err, "cached_at", googleJWKSCachedAt)
			return googleJWKSCache, nil
		}
		return nil, fmt.Errorf("failed to fetch Google JWKS and no cached keys available: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if len(googleJWKSCache) > 0 {
			slog.Warn("Google JWKS endpoint returned non-200, using stale cached keys", "status", resp.StatusCode, "cached_at", googleJWKSCachedAt)
			return googleJWKSCache, nil
		}
		return nil, fmt.Errorf("Google JWKS endpoint returned status %d and no cached keys available", resp.StatusCode)
	}

	var jwks googleJWKSResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		if len(googleJWKSCache) > 0 {
			slog.Warn("Failed to decode Google JWKS response, using stale cached keys", "error", err, "cached_at", googleJWKSCachedAt)
			return googleJWKSCache, nil
		}
		return nil, fmt.Errorf("failed to decode Google JWKS and no cached keys available: %w", err)
	}

	googleJWKSCache = jwks.Keys
	googleJWKSCachedAt = time.Now()
	return jwks.Keys, nil
}

// googleJWKToRSAPublicKey converts a Google JWK to an *rsa.PublicKey
func googleJWKToRSAPublicKey(jwk googleJWK) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{N: n, E: e}, nil
}

// validateGoogleIDToken validates a Google ID token offline using JWKS.
// allowedClientIDs are the Google OAuth client IDs for this app (iOS, Android, Web).
// If empty, audience verification is skipped (development mode).
func validateGoogleIDToken(_ context.Context, idToken string, allowedClientIDs []string) (*GoogleIDTokenClaims, error) {
	// Fetch Google's public keys (uses 24h cache, falls back to stale cache if fetch fails)
	keys, err := fetchGooglePublicKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain Google public keys for signature verification: %w", err)
	}

	// Build parser options
	parserOpts := []jwt.ParserOption{
		jwt.WithValidMethods([]string{"RS256"}),
	}

	// Audience verification is mandatory — reject if client IDs are not configured
	if len(allowedClientIDs) == 0 {
		slog.Error("Google Client IDs not configured — rejecting token (set GOOGLE_CLIENT_IDS env var)")
		return nil, fmt.Errorf("server misconfiguration: Google audience verification not configured")
	}

	parser := jwt.NewParser(parserOpts...)

	var googleClaims struct {
		jwt.RegisteredClaims
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
	}

	token, err := parser.ParseWithClaims(idToken, &googleClaims, func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid in token header")
		}

		for _, key := range keys {
			if key.Kid == kid {
				return googleJWKToRSAPublicKey(key)
			}
		}
		return nil, fmt.Errorf("no matching key found for kid: %s", kid)
	})

	if err != nil {
		return nil, fmt.Errorf("token verification failed: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Verify issuer
	iss, _ := googleClaims.GetIssuer()
	if iss != "https://accounts.google.com" && iss != "accounts.google.com" {
		return nil, fmt.Errorf("invalid token issuer: %s", iss)
	}

	// Verify email is verified
	if !googleClaims.EmailVerified {
		return nil, fmt.Errorf("email not verified")
	}

	// Verify audience (client ID) — prevents tokens from other apps being accepted
	if len(allowedClientIDs) > 0 {
		aud, _ := googleClaims.GetAudience()
		audValid := false
		for _, tokenAud := range aud {
			for _, allowed := range allowedClientIDs {
				if tokenAud == allowed {
					audValid = true
					break
				}
			}
			if audValid {
				break
			}
		}
		if !audValid {
			return nil, fmt.Errorf("invalid token audience: %v", aud)
		}
	}

	// Verify expiration
	exp, _ := googleClaims.GetExpirationTime()
	if exp != nil && exp.Before(time.Now()) {
		return nil, fmt.Errorf("token has expired")
	}

	return &GoogleIDTokenClaims{
		Subject: googleClaims.Subject,
		Email:   googleClaims.Email,
		Name:    googleClaims.Name,
	}, nil
}

// AppleSignIn handles POST /api/auth/apple
// Validates an Apple identity token and returns user + JWT tokens
func (h *AuthHandler) AppleSignIn(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IdentityToken     string  `json:"identity_token"`
		AuthorizationCode string  `json:"authorization_code"`
		FullName          *string `json:"full_name,omitempty"`
		Email             *string `json:"email,omitempty"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.IdentityToken == "" {
		writeError(w, http.StatusBadRequest, "identity_token is required")
		return
	}

	// Validate Apple identity token
	claims, err := validateAppleIDToken(req.IdentityToken, h.cfg.AppleClientIDs)
	if err != nil {
		slog.Warn("Invalid Apple identity token", "error", err)
		writeError(w, http.StatusUnauthorized, "Invalid Apple identity token")
		return
	}

	appleUserID := claims.Subject
	email := claims.Email
	if email == "" && req.Email != nil {
		email = *req.Email
	}

	name := ""
	if req.FullName != nil && *req.FullName != "" {
		name = *req.FullName
	}
	if name == "" && email != "" {
		name = strings.Split(email, "@")[0] // Fallback to email prefix
	}
	if name == "" {
		name = "Usuario Apple"
	}

	// Helper to detect Apple Private Relay emails
	isPrivateRelay := func(e string) bool {
		return strings.HasSuffix(e, "@privaterelay.appleid.com")
	}

	// Try to find user by Apple ID first
	user, err := h.userRepo.GetByAppleUserID(r.Context(), appleUserID)
	if err == nil && user != nil {
		// User exists with this Apple ID - login
		tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
		if err != nil {
			slog.Error("Failed to generate tokens", "error", err)
			writeError(w, http.StatusInternalServerError, "Internal server error")
			return
		}
		h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
		setAuthCookie(w, r, tokens.AccessToken)
		slog.Info("auth.event", "action", "apple_login", "user_id", user.ID, "email", user.Email, "ip", clientIP(r))
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"user":                   user,
			"tokens":                 tokens,
			"email_is_private_relay": isPrivateRelay(user.Email),
		})
		return
	}

	// Try to find user by email (if email is available)
	if email != "" {
		user, err = h.userRepo.GetByEmail(r.Context(), email)
		if err == nil && user != nil {
			// User exists with this email — check if Apple is already linked
			if user.AppleUserID != nil && *user.AppleUserID == appleUserID {
				// Same Apple account already linked (shouldn't reach here, but handle gracefully)
				tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
				if err != nil {
					slog.Error("Failed to generate tokens", "error", err)
					writeError(w, http.StatusInternalServerError, "Internal server error")
					return
				}
				h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
				setAuthCookie(w, r, tokens.AccessToken)
				slog.Info("auth.event", "action", "apple_login", "user_id", user.ID, "email", email, "ip", clientIP(r))
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"user":                   user,
					"tokens":                 tokens,
					"email_is_private_relay": isPrivateRelay(user.Email),
				})
				return
			}
			// Account exists but Apple is NOT linked — auto-link since Apple verified the email
			if err := h.userRepo.LinkAppleAccount(r.Context(), user.ID, appleUserID); err != nil {
				slog.Error("Failed to link Apple account", "error", err, "user_id", user.ID)
				writeError(w, http.StatusInternalServerError, "Failed to link Apple account")
				return
			}
			tokens, err := h.authService.GenerateTokenPair(user.ID, user.Email)
			if err != nil {
				slog.Error("Failed to generate tokens", "error", err)
				writeError(w, http.StatusInternalServerError, "Internal server error")
				return
			}
			h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
			setAuthCookie(w, r, tokens.AccessToken)
			slog.Info("auth.event", "action", "apple_link", "user_id", user.ID, "email", email, "ip", clientIP(r))
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"user":                   user,
				"tokens":                 tokens,
				"email_is_private_relay": isPrivateRelay(user.Email),
			})
			return
		}
	}

	// Create new user
	if email == "" {
		writeError(w, http.StatusBadRequest, "Apple did not provide an email address")
		return
	}

	newUser := &models.User{
		ID:          uuid.New(),
		Email:       email,
		Name:        name,
		AppleUserID: &appleUserID,
	}

	if err := h.userRepo.Create(r.Context(), newUser); err != nil {
		slog.Error("Failed to create user from Apple", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	tokens, err := h.authService.GenerateTokenPair(newUser.ID, newUser.Email)
	if err != nil {
		slog.Error("Failed to generate tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}
	h.storeRefreshToken(r.Context(), tokens.RefreshToken, newUser.ID)
	setAuthCookie(w, r, tokens.AccessToken)

	slog.Info("auth.event", "action", "apple_register", "user_id", newUser.ID, "email", newUser.Email, "ip", clientIP(r))
	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":                   newUser,
		"tokens":                 tokens,
		"email_is_private_relay": isPrivateRelay(newUser.Email),
	})
}

// AppleInit handles GET /api/auth/apple/init
// Redirects the user to Apple's authorization page
func (h *AuthHandler) AppleInit(w http.ResponseWriter, r *http.Request) {
	if h.cfg.AppleTeamID == "" || h.cfg.AppleKeyID == "" || h.cfg.AppleRedirectURI == "" {
		slog.Error("Apple Sign-In not configured for REST flow")
		writeError(w, http.StatusInternalServerError, "Apple Sign-In misconfiguration")
		return
	}

	clientID := ""
	for _, id := range h.cfg.AppleClientIDs {
		if strings.HasSuffix(id, ".web") {
			clientID = id
			break
		}
	}
	if clientID == "" && len(h.cfg.AppleClientIDs) > 0 {
		clientID = h.cfg.AppleClientIDs[0]
	}

	if clientID == "" {
		slog.Error("No Apple Client ID configured")
		writeError(w, http.StatusInternalServerError, "Apple Sign-In misconfiguration")
		return
	}

	v := url.Values{}
	v.Set("client_id", clientID)
	v.Set("redirect_uri", h.cfg.AppleRedirectURI)
	v.Set("response_type", "code")
	v.Set("scope", "name email")
	v.Set("response_mode", "form_post")

	authURL := "https://appleid.apple.com/auth/authorize?" + v.Encode()
	http.Redirect(w, r, authURL, http.StatusFound)
}

// AppleCallback handles POST /api/auth/apple/callback
func (h *AuthHandler) AppleCallback(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeError(w, http.StatusBadRequest, "Failed to parse form")
		return
	}

	code := r.FormValue("code")
	if code == "" {
		writeError(w, http.StatusBadRequest, "Missing authorization code")
		return
	}

	userJSON := r.FormValue("user")
	var appleUser struct {
		Name struct {
			FirstName string `json:"firstName"`
			LastName  string `json:"lastName"`
		} `json:"name"`
		Email string `json:"email"`
	}
	if userJSON != "" {
		_ = json.Unmarshal([]byte(userJSON), &appleUser)
	}

	clientID := ""
	for _, id := range h.cfg.AppleClientIDs {
		if strings.HasSuffix(id, ".web") {
			clientID = id
			break
		}
	}
	if clientID == "" && len(h.cfg.AppleClientIDs) > 0 {
		clientID = h.cfg.AppleClientIDs[0]
	}

	clientSecret, err := h.generateAppleClientSecret(clientID)
	if err != nil {
		slog.Error("Failed to generate Apple client secret", "error", err)
		writeError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	v := url.Values{}
	v.Set("client_id", clientID)
	v.Set("client_secret", clientSecret)
	v.Set("code", code)
	v.Set("grant_type", "authorization_code")
	v.Set("redirect_uri", h.cfg.AppleRedirectURI)

	resp, err := http.PostForm("https://appleid.apple.com/auth/token", v)
	if err != nil {
		slog.Error("Failed to call Apple token endpoint", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to exchange Apple code")
		return
	}
	defer resp.Body.Close()

	var tokenResp struct {
		IDToken      string `json:"id_token"`
		Error        string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to decode Apple token response")
		return
	}

	if tokenResp.Error != "" {
		slog.Error("Apple token error", "error", tokenResp.Error)
		writeError(w, http.StatusUnauthorized, "Apple authentication failed: "+tokenResp.Error)
		return
	}

	claims, err := validateAppleIDToken(tokenResp.IDToken, h.cfg.AppleClientIDs)
	if err != nil {
		slog.Warn("Invalid Apple identity token from callback", "error", err)
		writeError(w, http.StatusUnauthorized, "Invalid Apple identity token")
		return
	}

	appleUserID := claims.Subject
	email := claims.Email
	if email == "" && appleUser.Email != "" {
		email = appleUser.Email
	}

	fullName := ""
	if appleUser.Name.FirstName != "" || appleUser.Name.LastName != "" {
		fullName = strings.TrimSpace(appleUser.Name.FirstName + " " + appleUser.Name.LastName)
	}
	if fullName == "" && email != "" {
		fullName = strings.Split(email, "@")[0]
	}

	user, err := h.userRepo.GetByAppleUserID(r.Context(), appleUserID)
	if err == nil && user != nil {
		tokens, _ := h.authService.GenerateTokenPair(user.ID, user.Email)
		h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
		setAuthCookie(w, r, tokens.AccessToken)
		http.Redirect(w, r, h.cfg.FrontendURL+"/dashboard", http.StatusFound)
		return
	}

	if email != "" {
		user, err = h.userRepo.GetByEmail(r.Context(), email)
		if err == nil && user != nil {
			_ = h.userRepo.LinkAppleAccount(r.Context(), user.ID, appleUserID)
			tokens, _ := h.authService.GenerateTokenPair(user.ID, user.Email)
			h.storeRefreshToken(r.Context(), tokens.RefreshToken, user.ID)
			setAuthCookie(w, r, tokens.AccessToken)
			http.Redirect(w, r, h.cfg.FrontendURL+"/dashboard", http.StatusFound)
			return
		}
	}

	if email == "" {
		writeError(w, http.StatusBadRequest, "Apple did not provide an email address")
		return
	}
	newUser := &models.User{
		ID:          uuid.New(),
		Email:       email,
		Name:        fullName,
		AppleUserID: &appleUserID,
	}
	if err := h.userRepo.Create(r.Context(), newUser); err != nil {
		slog.Error("Failed to create user from Apple", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create account")
		return
	}

	tokens, _ := h.authService.GenerateTokenPair(newUser.ID, newUser.Email)
	h.storeRefreshToken(r.Context(), tokens.RefreshToken, newUser.ID)
	setAuthCookie(w, r, tokens.AccessToken)
	http.Redirect(w, r, h.cfg.FrontendURL+"/dashboard", http.StatusFound)
}

func (h *AuthHandler) generateAppleClientSecret(clientID string) (string, error) {
	if h.cfg.AppleTeamID == "" || h.cfg.AppleKeyID == "" || h.cfg.ApplePrivateKey == "" {
		return "", fmt.Errorf("missing Apple configuration for client_secret generation")
	}

	keyBytes := []byte(h.cfg.ApplePrivateKey)
	if !strings.Contains(h.cfg.ApplePrivateKey, "-----BEGIN") {
		decoded, err := base64.StdEncoding.DecodeString(h.cfg.ApplePrivateKey)
		if err == nil {
			keyBytes = decoded
		}
	}

	privKey, err := jwt.ParseECPrivateKeyFromPEM(keyBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse Apple private key: %w", err)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.MapClaims{
		"iss": h.cfg.AppleTeamID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(5 * time.Minute).Unix(),
		"aud": "https://appleid.apple.com",
		"sub": clientID,
	})
	token.Header["kid"] = h.cfg.AppleKeyID

	return token.SignedString(privKey)
}

// AppleIDTokenClaims represents the claims from an Apple identity token
type AppleIDTokenClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
}

// appleJWKS caches Apple's public keys for JWT signature verification
var (
	appleJWKSCache    []appleJWK
	appleJWKSCacheMu  sync.RWMutex
	appleJWKSCachedAt time.Time
	appleJWKSCacheTTL = 24 * time.Hour
)

type appleJWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type appleJWKSResponse struct {
	Keys []appleJWK `json:"keys"`
}

// fetchApplePublicKeys fetches Apple's JWKS (with caching)
func fetchApplePublicKeys() ([]appleJWK, error) {
	appleJWKSCacheMu.RLock()
	if len(appleJWKSCache) > 0 && time.Since(appleJWKSCachedAt) < appleJWKSCacheTTL {
		keys := appleJWKSCache
		appleJWKSCacheMu.RUnlock()
		return keys, nil
	}
	appleJWKSCacheMu.RUnlock()

	appleJWKSCacheMu.Lock()
	defer appleJWKSCacheMu.Unlock()

	// Double-check after acquiring write lock
	if len(appleJWKSCache) > 0 && time.Since(appleJWKSCachedAt) < appleJWKSCacheTTL {
		return appleJWKSCache, nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get("https://appleid.apple.com/auth/keys")
	if err != nil {
		// Fetch failed — fall back to stale cache if available
		if len(appleJWKSCache) > 0 {
			slog.Warn("Apple JWKS fetch failed, using stale cached keys", "error", err, "cached_at", appleJWKSCachedAt)
			return appleJWKSCache, nil
		}
		return nil, fmt.Errorf("failed to fetch Apple JWKS and no cached keys available: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Non-200 response — fall back to stale cache if available
		if len(appleJWKSCache) > 0 {
			slog.Warn("Apple JWKS endpoint returned non-200, using stale cached keys", "status", resp.StatusCode, "cached_at", appleJWKSCachedAt)
			return appleJWKSCache, nil
		}
		return nil, fmt.Errorf("Apple JWKS endpoint returned status %d and no cached keys available", resp.StatusCode)
	}

	var jwks appleJWKSResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		// Decode failed — fall back to stale cache if available
		if len(appleJWKSCache) > 0 {
			slog.Warn("Failed to decode Apple JWKS response, using stale cached keys", "error", err, "cached_at", appleJWKSCachedAt)
			return appleJWKSCache, nil
		}
		return nil, fmt.Errorf("failed to decode Apple JWKS and no cached keys available: %w", err)
	}

	appleJWKSCache = jwks.Keys
	appleJWKSCachedAt = time.Now()
	return jwks.Keys, nil
}

// jwkToRSAPublicKey converts a JWK to an *rsa.PublicKey
func jwkToRSAPublicKey(jwk appleJWK) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(jwk.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(jwk.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e<<8 + int(b)
	}

	return &rsa.PublicKey{N: n, E: e}, nil
}

// validateAppleIDToken validates an Apple identity token by verifying its JWT
// signature against Apple's public keys and checking standard claims.
// appleClientIDs are used for audience verification; if empty, aud check fails.
func validateAppleIDToken(identityToken string, appleClientIDs []string) (*AppleIDTokenClaims, error) {
	// Fetch Apple's public keys (uses 24h cache, falls back to stale cache if fetch fails)
	keys, err := fetchApplePublicKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain Apple public keys for signature verification: %w", err)
	}

	// Audience verification is mandatory — reject if no client IDs are configured
	if len(appleClientIDs) == 0 {
		slog.Error("Apple Client IDs not configured — rejecting token (set APPLE_CLIENT_IDS env var)")
		return nil, fmt.Errorf("server misconfiguration: Apple audience verification not configured")
	}

	// Parse the JWT header to find the kid
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer("https://appleid.apple.com"),
	)

	var appleClaims struct {
		jwt.RegisteredClaims
		Email         string `json:"email"`
		EmailVerified any    `json:"email_verified"`
	}

	token, err := parser.ParseWithClaims(identityToken, &appleClaims, func(token *jwt.Token) (interface{}, error) {
		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("missing kid in token header")
		}

		for _, key := range keys {
			if key.Kid == kid {
				return jwkToRSAPublicKey(key)
			}
		}
		return nil, fmt.Errorf("no matching key found for kid: %s", kid)
	})

	if err != nil {
		return nil, fmt.Errorf("token verification failed: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	// Verify audience (client ID) — prevents tokens from other apps being accepted
	aud, _ := appleClaims.GetAudience()
	audValid := false
	for _, tokenAud := range aud {
		for _, allowed := range appleClientIDs {
			if tokenAud == allowed {
				audValid = true
				break
			}
		}
		if audValid {
			break
		}
	}
	if !audValid {
		return nil, fmt.Errorf("invalid token audience: %v", aud)
	}

	return &AppleIDTokenClaims{
		Subject: appleClaims.Subject,
		Email:   appleClaims.Email,
	}, nil
}
