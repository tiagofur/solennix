package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Environment string

	DatabaseURL string

	JWTSecret      string
	JWTExpiryHours int

	CORSAllowedOrigins []string

	ResendAPIKey    string
	ResendFromEmail string
	FrontendURL     string

	StripeSecretKey         string
	StripeWebhookSecret     string
	StripeProPriceID        string
	StripePortalConfigID    string // Billing Portal configuration ID (optional)
	RevenueCatWebhookSecret string // RevenueCat v2 webhook authorization header secret

	UploadDir           string // Directory for uploaded files (default: "./uploads")
	BootstrapAdminEmail string // Email to automatically promote to admin on startup
}

func Load() (*Config, error) {
	// Load .env file (ignore error if not present, e.g. in production)
	_ = godotenv.Load()

	cfg := &Config{
		Port:                    getEnv("PORT", "8080"),
		Environment:             getEnv("ENVIRONMENT", "development"),
		DatabaseURL:             os.Getenv("DATABASE_URL"),
		JWTSecret:               os.Getenv("JWT_SECRET"),
		ResendAPIKey:            os.Getenv("RESEND_API_KEY"),
		ResendFromEmail:         getEnv("RESEND_FROM_EMAIL", "Solennix <noreply@solennix.com>"),
		FrontendURL:             getEnv("FRONTEND_URL", "http://localhost:5173"),
		StripeSecretKey:         os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:     os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripeProPriceID:        os.Getenv("STRIPE_PRO_PRICE_ID"),
		StripePortalConfigID:    os.Getenv("STRIPE_PORTAL_CONFIG_ID"),
		RevenueCatWebhookSecret: os.Getenv("REVENUECAT_WEBHOOK_SECRET"),
		UploadDir:               getEnv("UPLOAD_DIR", "./uploads"),
		BootstrapAdminEmail:     os.Getenv("BOOTSTRAP_ADMIN_EMAIL"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	jwtExpiry, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		return nil, fmt.Errorf("JWT_EXPIRY_HOURS must be a number: %w", err)
	}
	cfg.JWTExpiryHours = jwtExpiry

	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	cfg.CORSAllowedOrigins = strings.Split(origins, ",")

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
