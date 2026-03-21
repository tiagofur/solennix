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
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// resetTokenBlacklist stores SHA-256 hashes of used password reset tokens.
// Key: hex-encoded SHA-256 hash, Value: token expiry time (for cleanup).
var resetTokenBlacklist sync.Map

func init() {
	// Periodically clean expired entries from the reset token blacklist
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			now := time.Now()
			resetTokenBlacklist.Range(func(key, value any) bool {
				if expiry, ok := value.(time.Time); ok && now.After(expiry) {
					resetTokenBlacklist.Delete(key)
				}
				return true
			})
		}
	}()
}

// hashToken returns the hex-encoded SHA-256 hash of a token string.
func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// isResetTokenBlacklisted checks if a reset token has already been used.
func isResetTokenBlacklisted(token string) bool {
	_, found := resetTokenBlacklist.Load(hashToken(token))
	return found
}

// blacklistResetToken adds a reset token to the blacklist with its expiry time.
func blacklistResetToken(token string, expiry time.Time) {
	resetTokenBlacklist.Store(hashToken(token), expiry)
}

// isUniqueViolation checks if a database error is a PostgreSQL unique constraint violation (23505).
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

type AuthHandler struct {
	userRepo     FullUserRepository
	authService  *services.AuthService
	emailService *services.EmailService
	cfg          *config.Config
}

func NewAuthHandler(userRepo FullUserRepository, authService *services.AuthService, emailService *services.EmailService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		authService:  authService,
		emailService: emailService,
		cfg:          cfg,
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

	// Blacklist the token so it cannot be reused
	blacklistResetToken(req.Token, time.Now().Add(1*time.Hour))

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
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"user":   user,
				"tokens": tokens,
			})
			return
		}
		// Account exists but Google is NOT linked — do NOT auto-link (account takeover risk)
		slog.Warn("Google sign-in blocked: email exists with different provider", "email", email)
		writeJSON(w, http.StatusConflict, map[string]interface{}{
			"error":   "email_exists_different_provider",
			"message": "An account with this email already exists. Please sign in with your email and password first, then link your social account from settings.",
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
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"user":   existingUser,
					"tokens": tokens,
				})
				return
			}
			// Existing user doesn't have Google linked — same conflict rule applies
			writeJSON(w, http.StatusConflict, map[string]interface{}{
				"error":   "email_exists_different_provider",
				"message": "An account with this email already exists. Please sign in with your email and password first, then link your social account from settings.",
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

	// Add audience verification if configured
	if len(allowedClientIDs) > 0 {
		// jwt.WithAudience checks a single value; we check manually below for multiple
	} else {
		slog.Warn("Google Client IDs not configured — skipping audience verification (set GOOGLE_CLIENT_IDS in production)")
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
	claims, err := validateAppleIDToken(req.IdentityToken, h.cfg.AppleBundleID)
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
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"user":                  user,
			"tokens":                tokens,
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
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"user":                  user,
					"tokens":                tokens,
					"email_is_private_relay": isPrivateRelay(user.Email),
				})
				return
			}
			// Account exists but Apple is NOT linked — do NOT auto-link (account takeover risk)
			slog.Warn("Apple sign-in blocked: email exists with different provider", "email", email)
			writeJSON(w, http.StatusConflict, map[string]interface{}{
				"error":   "email_exists_different_provider",
				"message": "An account with this email already exists. Please sign in with your email and password first, then link your social account from settings.",
			})
			return
		}
	}

	// Create new user with Apple account
	// Apple may hide the real email, so we use a placeholder if not available
	if email == "" {
		email = appleUserID + "@privaterelay.appleid.com"
	}

	newUser := &models.User{
		Email:       email,
		Name:        name,
		Plan:        "basic",
		AppleUserID: &appleUserID,
	}
	if err := h.userRepo.CreateWithOAuth(r.Context(), newUser); err != nil {
		// Handle race condition: unique constraint violation means another request created the user
		if isUniqueViolation(err) {
			slog.Warn("Race condition in Apple OAuth: user already created, retrying lookup", "email", email)
			existingUser, lookupErr := h.userRepo.GetByEmail(r.Context(), email)
			if lookupErr != nil || existingUser == nil {
				slog.Error("Failed to find user after unique constraint violation", "email", email, "error", lookupErr)
				writeError(w, http.StatusInternalServerError, "Failed to create account")
				return
			}
			// Check if the existing user has this Apple account linked
			if existingUser.AppleUserID != nil && *existingUser.AppleUserID == appleUserID {
				tokens, tokenErr := h.authService.GenerateTokenPair(existingUser.ID, existingUser.Email)
				if tokenErr != nil {
					slog.Error("Failed to generate tokens", "error", tokenErr)
					writeError(w, http.StatusInternalServerError, "Internal server error")
					return
				}
				writeJSON(w, http.StatusOK, map[string]interface{}{
					"user":                  existingUser,
					"tokens":                tokens,
					"email_is_private_relay": isPrivateRelay(existingUser.Email),
				})
				return
			}
			// Existing user doesn't have Apple linked — same conflict rule applies
			writeJSON(w, http.StatusConflict, map[string]interface{}{
				"error":   "email_exists_different_provider",
				"message": "An account with this email already exists. Please sign in with your email and password first, then link your social account from settings.",
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

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user":                  newUser,
		"tokens":                tokens,
		"email_is_private_relay": isPrivateRelay(newUser.Email),
	})
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
// appleBundleID is used for audience verification; if empty, aud check is skipped (dev mode).
func validateAppleIDToken(identityToken string, appleBundleID string) (*AppleIDTokenClaims, error) {
	// Fetch Apple's public keys (uses 24h cache, falls back to stale cache if fetch fails)
	keys, err := fetchApplePublicKeys()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain Apple public keys for signature verification: %w", err)
	}

	// Parse the JWT header to find the kid
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256"}),
		jwt.WithIssuer("https://appleid.apple.com"),
	)

	// Add audience verification if configured
	if appleBundleID != "" {
		parser = jwt.NewParser(
			jwt.WithValidMethods([]string{"RS256"}),
			jwt.WithIssuer("https://appleid.apple.com"),
			jwt.WithAudience(appleBundleID),
		)
	} else {
		slog.Warn("Apple Bundle ID not configured — skipping audience verification (set APPLE_BUNDLE_ID in production)")
	}

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

	return &AppleIDTokenClaims{
		Subject: appleClaims.Subject,
		Email:   appleClaims.Email,
	}, nil
}

