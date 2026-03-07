package services

import (
	"crypto/rand"
	"crypto/rsa"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

func TestHashPasswordAndCheckPassword(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	hash, err := svc.HashPassword("super-secret")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	if hash == "super-secret" || hash == "" {
		t.Fatalf("HashPassword() returned invalid hash")
	}
	if !svc.CheckPassword("super-secret", hash) {
		t.Fatalf("CheckPassword() should return true for matching password")
	}
	if svc.CheckPassword("wrong-password", hash) {
		t.Fatalf("CheckPassword() should return false for non-matching password")
	}
}

func TestHashPasswordTooLong(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	longPassword := make([]byte, 80)
	for i := range longPassword {
		longPassword[i] = 'a'
	}

	_, err := svc.HashPassword(string(longPassword))
	if err == nil {
		t.Fatalf("HashPassword() expected error for password > 72 bytes")
	}
}

func TestGenerateTokenPairAndValidateToken(t *testing.T) {
	svc := NewAuthService("test-secret", 2)
	userID := uuid.New()
	email := "user@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatalf("GenerateTokenPair() should return both tokens")
	}
	if pair.ExpiresAt <= time.Now().Unix() {
		t.Fatalf("GenerateTokenPair() ExpiresAt should be in the future")
	}

	accessClaims, err := svc.ValidateToken(pair.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken(access) error = %v", err)
	}
	if accessClaims.UserID != userID || accessClaims.Email != email {
		t.Fatalf("ValidateToken(access) claims mismatch")
	}

	// Refresh token should NOT validate as an access token
	_, err = svc.ValidateToken(pair.RefreshToken)
	if err == nil {
		t.Fatalf("ValidateToken(refresh) should reject refresh tokens")
	}

	// But should validate with ValidateRefreshToken
	refreshClaims, err := svc.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken(refresh) error = %v", err)
	}
	if refreshClaims.UserID != userID || refreshClaims.Email != email {
		t.Fatalf("ValidateRefreshToken(refresh) claims mismatch")
	}
}

func TestValidateTokenErrors(t *testing.T) {
	t.Run("GivenMalformedToken_WhenValidate_ThenReturnsError", func(t *testing.T) {
		svc := NewAuthService("test-secret", 1)
		if _, err := svc.ValidateToken("not-a-token"); err == nil {
			t.Fatalf("ValidateToken() expected error for malformed token")
		}
	})

	t.Run("GivenTokenSignedWithUnexpectedMethod_WhenValidate_ThenReturnsError", func(t *testing.T) {
		svc := NewAuthService("test-secret", 1)
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatalf("rsa.GenerateKey() error = %v", err)
		}

		token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
			"user_id": uuid.NewString(),
			"email":   "user@test.dev",
			"exp":     time.Now().Add(time.Hour).Unix(),
			"iat":     time.Now().Unix(),
		})
		tokenString, err := token.SignedString(privateKey)
		if err != nil {
			t.Fatalf("SignedString() error = %v", err)
		}

		if _, err := svc.ValidateToken(tokenString); err == nil {
			t.Fatalf("ValidateToken() expected error for unexpected signing method")
		}
	})

	t.Run("GivenExpiredToken_WhenValidate_ThenReturnsError", func(t *testing.T) {
		svc := NewAuthService("test-secret", -1)
		pair, err := svc.GenerateTokenPair(uuid.New(), "expired@test.dev")
		if err != nil {
			t.Fatalf("GenerateTokenPair() error = %v", err)
		}

		if _, err := svc.ValidateToken(pair.AccessToken); err == nil {
			t.Fatalf("ValidateToken() expected error for expired access token")
		}
	})

	t.Run("GivenTokenSignedWithDifferentSecret_WhenValidate_ThenReturnsError", func(t *testing.T) {
		issuer := NewAuthService("issuer-secret", 1)
		validator := NewAuthService("validator-secret", 1)
		pair, err := issuer.GenerateTokenPair(uuid.New(), "secret@test.dev")
		if err != nil {
			t.Fatalf("GenerateTokenPair() error = %v", err)
		}

		if _, err := validator.ValidateToken(pair.AccessToken); err == nil {
			t.Fatalf("ValidateToken() expected error for wrong secret")
		}
	})
}

func TestAuthServiceConcurrentTokenGenerationAndValidation(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	const workers = 24

	var wg sync.WaitGroup
	errCh := make(chan error, workers)

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			userID := uuid.New()
			email := userID.String() + "@test.dev"

			pair, err := svc.GenerateTokenPair(userID, email)
			if err != nil {
				errCh <- err
				return
			}
			claims, err := svc.ValidateToken(pair.AccessToken)
			if err != nil {
				errCh <- err
				return
			}
			if claims.UserID != userID || claims.Email != email {
				errCh <- jwt.ErrTokenInvalidClaims
			}
		}()
	}

	wg.Wait()
	close(errCh)
	for err := range errCh {
		if err != nil {
			t.Fatalf("concurrent auth operation failed: %v", err)
		}
	}
}

func TestResetTokens(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "reset@test.dev"

	tokenStr, err := svc.GenerateResetToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateResetToken failed: %v", err)
	}

	claims, err := svc.ValidateResetToken(tokenStr)
	if err != nil {
		t.Fatalf("ValidateResetToken failed: %v", err)
	}

	if claims.UserID != userID {
		t.Fatalf("userid mismatch")
	}

	if claims.Subject != "password-reset" {
		t.Fatalf("subject mismatch")
	}

	// Try validating access token as a reset token
	pair, _ := svc.GenerateTokenPair(userID, email)
	_, err = svc.ValidateResetToken(pair.AccessToken)
	if err == nil || err.Error() != "token is not a password reset token" {
		t.Fatalf("expected error validating access token as reset token, got %v", err)
	}
}

func TestValidateResetToken_MalformedToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	_, err := svc.ValidateResetToken("not-a-valid-token-at-all")
	if err == nil {
		t.Fatal("ValidateResetToken() expected error for malformed token")
	}
}

func TestGenerateTokenPair_EmptySecret(t *testing.T) {
	// An empty secret should still succeed since jwt.SignedString accepts any []byte.
	svc := NewAuthService("", 1)
	userID := uuid.New()
	email := "empty@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() with empty secret error = %v", err)
	}
	if pair.AccessToken == "" || pair.RefreshToken == "" {
		t.Fatalf("GenerateTokenPair() should return both tokens even with empty secret")
	}

	// Validate with the same empty secret
	claims, err := svc.ValidateToken(pair.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken() with empty secret error = %v", err)
	}
	if claims.UserID != userID || claims.Email != email {
		t.Fatalf("claims mismatch")
	}
}

func TestGenerateTokenPair_ZeroExpiry(t *testing.T) {
	// jwtExpiryHours = 0 means the access token expires immediately,
	// but the refresh token (7 days) should still be valid.
	svc := NewAuthService("test-secret", 0)
	userID := uuid.New()
	email := "zero@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// Access token should be expired or at boundary
	// Refresh token should still validate via ValidateRefreshToken
	claims, err := svc.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken(refresh) error = %v", err)
	}
	if claims.UserID != userID {
		t.Fatalf("refresh token UserID mismatch")
	}
}

func TestGenerateResetToken_RoundTrip(t *testing.T) {
	svc := NewAuthService("roundtrip-secret", 1)
	userID := uuid.New()
	email := "roundtrip@test.dev"

	token, err := svc.GenerateResetToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateResetToken() error = %v", err)
	}

	// Should be validatable as a reset token
	claims, err := svc.ValidateResetToken(token)
	if err != nil {
		t.Fatalf("ValidateResetToken() error = %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("Email = %q, want %q", claims.Email, email)
	}
	if claims.Issuer != "solennix-backend" {
		t.Errorf("Issuer = %q, want %q", claims.Issuer, "solennix-backend")
	}

	// Should NOT be validatable by a service with a different secret
	otherSvc := NewAuthService("other-secret", 1)
	if _, err := otherSvc.ValidateResetToken(token); err == nil {
		t.Fatal("ValidateResetToken() expected error with wrong secret")
	}
}

func TestValidateToken_EmptyString(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	_, err := svc.ValidateToken("")
	if err == nil {
		t.Fatal("ValidateToken() expected error for empty string")
	}
}

func TestValidateResetToken_ExpiredToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "expired-reset@test.dev"

	// Manually create an expired reset token using jwt directly
	now := time.Now()
	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(-1 * time.Hour)), // expired 1 hour ago
			IssuedAt:  jwt.NewNumericDate(now.Add(-2 * time.Hour)),
			Issuer:    "solennix-backend",
			Subject:   "password-reset",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to create expired token: %v", err)
	}

	_, err = svc.ValidateResetToken(tokenString)
	if err == nil {
		t.Fatal("ValidateResetToken() expected error for expired token")
	}
}

func TestGenerateResetToken_Success(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "generate-reset@test.dev"

	tokenStr, err := svc.GenerateResetToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateResetToken() error = %v", err)
	}
	if tokenStr == "" {
		t.Fatal("GenerateResetToken() returned empty token")
	}

	// Validate the token and check claims
	claims, err := svc.ValidateResetToken(tokenStr)
	if err != nil {
		t.Fatalf("ValidateResetToken() error = %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("claims.UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("claims.Email = %q, want %q", claims.Email, email)
	}
	if claims.Subject != "password-reset" {
		t.Errorf("claims.Subject = %q, want %q", claims.Subject, "password-reset")
	}
}

// ---------------------------------------------------------------------------
// Additional coverage tests — GenerateTokenPair claim verification
// ---------------------------------------------------------------------------

func TestGenerateTokenPair_ClaimsRoundTrip(t *testing.T) {
	expiryHours := 4
	svc := NewAuthService("roundtrip-secret", expiryHours)
	userID := uuid.New()
	email := "claims-roundtrip@test.dev"

	before := time.Now()
	pair, err := svc.GenerateTokenPair(userID, email)
	after := time.Now()

	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// Verify access token claims
	accessClaims, err := svc.ValidateToken(pair.AccessToken)
	if err != nil {
		t.Fatalf("ValidateToken(access) error = %v", err)
	}
	if accessClaims.UserID != userID {
		t.Errorf("access UserID = %v, want %v", accessClaims.UserID, userID)
	}
	if accessClaims.Email != email {
		t.Errorf("access Email = %q, want %q", accessClaims.Email, email)
	}
	if accessClaims.Issuer != "solennix-backend" {
		t.Errorf("access Issuer = %q, want %q", accessClaims.Issuer, "solennix-backend")
	}
	// IssuedAt should be between before and after
	issuedAt := accessClaims.IssuedAt.Time
	if issuedAt.Before(before.Truncate(time.Second)) || issuedAt.After(after.Add(time.Second)) {
		t.Errorf("access IssuedAt = %v, expected between %v and %v", issuedAt, before, after)
	}
	// ExpiresAt should be approximately expiryHours from now
	expiresAt := accessClaims.ExpiresAt.Time
	expectedExpiry := before.Add(time.Duration(expiryHours) * time.Hour)
	if expiresAt.Before(expectedExpiry.Add(-time.Second)) || expiresAt.After(expectedExpiry.Add(2*time.Second)) {
		t.Errorf("access ExpiresAt = %v, expected near %v", expiresAt, expectedExpiry)
	}
	// Subject should be "access" for access tokens
	if accessClaims.Subject != "access" {
		t.Errorf("access Subject = %q, want %q", accessClaims.Subject, "access")
	}

	// Verify refresh token claims via ValidateRefreshToken
	refreshClaims, err := svc.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken(refresh) error = %v", err)
	}
	if refreshClaims.UserID != userID {
		t.Errorf("refresh UserID = %v, want %v", refreshClaims.UserID, userID)
	}
	if refreshClaims.Email != email {
		t.Errorf("refresh Email = %q, want %q", refreshClaims.Email, email)
	}
	if refreshClaims.Issuer != "solennix-backend" {
		t.Errorf("refresh Issuer = %q, want %q", refreshClaims.Issuer, "solennix-backend")
	}
	if refreshClaims.Subject != "refresh" {
		t.Errorf("refresh Subject = %q, want %q", refreshClaims.Subject, "refresh")
	}
	// Refresh token should expire in 7 days
	refreshExpiry := refreshClaims.ExpiresAt.Time
	expected7Days := before.Add(7 * 24 * time.Hour)
	if refreshExpiry.Before(expected7Days.Add(-time.Second)) || refreshExpiry.After(expected7Days.Add(2*time.Second)) {
		t.Errorf("refresh ExpiresAt = %v, expected near %v", refreshExpiry, expected7Days)
	}

	// Verify ExpiresAt field in TokenPair matches access token expiry
	if pair.ExpiresAt != accessClaims.ExpiresAt.Time.Unix() {
		t.Errorf("TokenPair.ExpiresAt = %d, want %d", pair.ExpiresAt, accessClaims.ExpiresAt.Time.Unix())
	}

	// Access and refresh tokens should be different
	if pair.AccessToken == pair.RefreshToken {
		t.Error("AccessToken and RefreshToken should be different")
	}
}

func TestValidateToken_ExactlyExpiredToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "exactly-expired@test.dev"

	// Create a token that expired exactly 1 second ago
	now := time.Now()
	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(-1 * time.Second)),
			IssuedAt:  jwt.NewNumericDate(now.Add(-2 * time.Hour)),
			Issuer:    "solennix-backend",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to create token: %v", err)
	}

	_, err = svc.ValidateToken(tokenString)
	if err == nil {
		t.Fatal("ValidateToken() expected error for token expired 1 second ago")
	}
}

func TestValidateToken_TokenWithWrongIssuer(t *testing.T) {
	// Tokens with non-matching issuer should still validate
	// (ValidateToken doesn't check issuer, it only checks signature and expiry)
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "wrong-issuer@test.dev"

	now := time.Now()
	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "some-other-issuer",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to create token: %v", err)
	}

	result, err := svc.ValidateToken(tokenString)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}
	if result.UserID != userID {
		t.Errorf("UserID = %v, want %v", result.UserID, userID)
	}
	if result.Issuer != "some-other-issuer" {
		t.Errorf("Issuer = %q, want %q", result.Issuer, "some-other-issuer")
	}
}

func TestNewAuthService(t *testing.T) {
	svc := NewAuthService("my-secret", 24)
	if svc == nil {
		t.Fatal("NewAuthService() returned nil")
	}
	if string(svc.jwtSecret) != "my-secret" {
		t.Errorf("jwtSecret = %q, want %q", string(svc.jwtSecret), "my-secret")
	}
	if svc.jwtExpiryHours != 24 {
		t.Errorf("jwtExpiryHours = %d, want %d", svc.jwtExpiryHours, 24)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — HashPassword with empty string
// ---------------------------------------------------------------------------

func TestHashPassword_EmptyString(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	// bcrypt should handle empty passwords without error
	hash, err := svc.HashPassword("")
	if err != nil {
		t.Fatalf("HashPassword(\"\") error = %v", err)
	}
	if hash == "" {
		t.Fatal("HashPassword(\"\") returned empty hash")
	}

	// Verify the empty password matches the hash
	if !svc.CheckPassword("", hash) {
		t.Error("CheckPassword(\"\", hash) should return true for matching empty password")
	}

	// Verify a non-empty password does NOT match the empty password hash
	if svc.CheckPassword("not-empty", hash) {
		t.Error("CheckPassword(\"not-empty\", hash) should return false against empty password hash")
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — CheckPassword edge cases
// ---------------------------------------------------------------------------

func TestCheckPassword_EmptyHash(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	// An empty hash should never match any password
	if svc.CheckPassword("password", "") {
		t.Error("CheckPassword should return false for empty hash")
	}
}

func TestCheckPassword_InvalidHash(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	// A non-bcrypt string should not match
	if svc.CheckPassword("password", "not-a-bcrypt-hash") {
		t.Error("CheckPassword should return false for invalid hash")
	}
}

func TestCheckPassword_CorrectAndIncorrect(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	password := "my-secure-password-123!"
	hash, err := svc.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	// Correct password
	if !svc.CheckPassword(password, hash) {
		t.Error("CheckPassword should return true for correct password")
	}

	// Incorrect passwords
	wrongPasswords := []string{
		"",
		"wrong",
		"my-secure-password-123",  // missing !
		"My-Secure-Password-123!", // different case
		password + " ",            // trailing space
		" " + password,            // leading space
	}
	for _, wrong := range wrongPasswords {
		if svc.CheckPassword(wrong, hash) {
			t.Errorf("CheckPassword(%q, hash) should return false", wrong)
		}
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — ValidateToken with non-HMAC signing method
// (verifies the error message content)
// ---------------------------------------------------------------------------

func TestValidateToken_NonHMAC_ErrorMessage(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	// Create an RSA-signed token
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("rsa.GenerateKey() error = %v", err)
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"user_id": uuid.NewString(),
		"email":   "rsa@test.dev",
		"exp":     time.Now().Add(time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	})
	tokenString, err := token.SignedString(privateKey)
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}

	_, err = svc.ValidateToken(tokenString)
	if err == nil {
		t.Fatal("ValidateToken() expected error for RS256-signed token")
	}

	// Verify the error message mentions "unexpected signing method"
	errMsg := err.Error()
	if !strings.Contains(errMsg, "unexpected signing method") && !strings.Contains(errMsg, "invalid token") {
		t.Errorf("error should mention unexpected signing method or invalid token, got: %v", errMsg)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — HashPassword produces different hashes for same input
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Security tests — Token type differentiation
// ---------------------------------------------------------------------------

func TestValidateToken_RejectsRefreshToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "reject-refresh@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// ValidateToken must reject a refresh token
	_, err = svc.ValidateToken(pair.RefreshToken)
	if err == nil {
		t.Fatal("ValidateToken() should reject refresh tokens")
	}
	if !strings.Contains(err.Error(), "invalid token type") {
		t.Errorf("error should mention invalid token type, got: %v", err)
	}
}

func TestValidateToken_RejectsResetToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "reject-reset@test.dev"

	resetToken, err := svc.GenerateResetToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateResetToken() error = %v", err)
	}

	// ValidateToken must reject a password-reset token
	_, err = svc.ValidateToken(resetToken)
	if err == nil {
		t.Fatal("ValidateToken() should reject password-reset tokens")
	}
	if !strings.Contains(err.Error(), "invalid token type") {
		t.Errorf("error should mention invalid token type, got: %v", err)
	}
}

func TestValidateRefreshToken_RejectsAccessToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "reject-access@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// ValidateRefreshToken must reject an access token
	_, err = svc.ValidateRefreshToken(pair.AccessToken)
	if err == nil {
		t.Fatal("ValidateRefreshToken() should reject access tokens")
	}
	if !strings.Contains(err.Error(), "not a refresh token") {
		t.Errorf("error should mention not a refresh token, got: %v", err)
	}
}

func TestValidateRefreshToken_RejectsResetToken(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "reject-reset-as-refresh@test.dev"

	resetToken, err := svc.GenerateResetToken(userID, email)
	if err != nil {
		t.Fatalf("GenerateResetToken() error = %v", err)
	}

	// ValidateRefreshToken must reject a password-reset token
	_, err = svc.ValidateRefreshToken(resetToken)
	if err == nil {
		t.Fatal("ValidateRefreshToken() should reject password-reset tokens")
	}
	if !strings.Contains(err.Error(), "not a refresh token") {
		t.Errorf("error should mention not a refresh token, got: %v", err)
	}
}

func TestValidateRefreshToken_Success(t *testing.T) {
	svc := NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "valid-refresh@test.dev"

	pair, err := svc.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// ValidateRefreshToken should succeed for a genuine refresh token
	claims, err := svc.ValidateRefreshToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateRefreshToken() error = %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID = %v, want %v", claims.UserID, userID)
	}
	if claims.Email != email {
		t.Errorf("Email = %q, want %q", claims.Email, email)
	}
	if claims.Subject != "refresh" {
		t.Errorf("Subject = %q, want %q", claims.Subject, "refresh")
	}
}

func TestHashPassword_ProducesDifferentHashes(t *testing.T) {
	svc := NewAuthService("test-secret", 1)

	hash1, err := svc.HashPassword("same-password")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}
	hash2, err := svc.HashPassword("same-password")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	// bcrypt with random salt should produce different hashes
	if hash1 == hash2 {
		t.Error("HashPassword should produce different hashes for the same password (bcrypt uses random salt)")
	}

	// But both should validate against the password
	if !svc.CheckPassword("same-password", hash1) {
		t.Error("hash1 should match the original password")
	}
	if !svc.CheckPassword("same-password", hash2) {
		t.Error("hash2 should match the original password")
	}
}
