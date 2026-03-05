package services

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	jwtSecret      []byte
	jwtExpiryHours int
}

type TokenClaims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

func NewAuthService(jwtSecret string, jwtExpiryHours int) *AuthService {
	return &AuthService{
		jwtSecret:      []byte(jwtSecret),
		jwtExpiryHours: jwtExpiryHours,
	}
}

// HashPassword creates a bcrypt hash of the password.
func (s *AuthService) HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPassword compares a password with a bcrypt hash.
func (s *AuthService) CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateTokenPair creates an access token and a refresh token.
func (s *AuthService) GenerateTokenPair(userID uuid.UUID, email string) (*TokenPair, error) {
	now := time.Now()
	expiresAt := now.Add(time.Duration(s.jwtExpiryHours) * time.Hour)

	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "solennix-backend",
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessTokenString, err := accessToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// Refresh token lasts 7 days
	refreshClaims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "solennix-backend",
		},
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(s.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    expiresAt.Unix(),
	}, nil
}

// GenerateResetToken creates a short-lived token (1 hour) for password reset
func (s *AuthService) GenerateResetToken(userID uuid.UUID, email string) (string, error) {
	now := time.Now()
	expiresAt := now.Add(1 * time.Hour) // Reset tokens expire in 1 hour

	claims := TokenClaims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    "solennix-backend",
			Subject:   "password-reset", // Identify as reset token
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign reset token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken parses and validates a JWT token, returning its claims.
func (s *AuthService) ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// ValidateResetToken validates a password reset token specifically
func (s *AuthService) ValidateResetToken(tokenString string) (*TokenClaims, error) {
	claims, err := s.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Verify it's a reset token
	if claims.Subject != "password-reset" {
		return nil, fmt.Errorf("token is not a password reset token")
	}

	return claims, nil
}
