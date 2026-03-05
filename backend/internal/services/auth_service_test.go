package services

import (
	"crypto/rand"
	"crypto/rsa"
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

	refreshClaims, err := svc.ValidateToken(pair.RefreshToken)
	if err != nil {
		t.Fatalf("ValidateToken(refresh) error = %v", err)
	}
	if refreshClaims.UserID != userID || refreshClaims.Email != email {
		t.Fatalf("ValidateToken(refresh) claims mismatch")
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
