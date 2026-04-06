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
	RevenueCatAPIKey        string // RevenueCat secret API key for server-to-server calls

	// Google OAuth Client IDs for audience verification
	GoogleClientIDs []string // Allowed Google OAuth client IDs (iOS, Android, Web)

	// Apple Sign In configuration
	AppleBundleID string // Apple Bundle ID for audience verification

	UploadDir           string // Directory for uploaded files (default: "./uploads")
	StorageProvider     string // "local" or "s3" (default: "local")
	S3Bucket            string // S3 bucket name
	S3Region            string // S3 region (default: "us-east-1")
	S3Prefix            string // S3 key prefix (default: "uploads")
	S3Endpoint          string // Custom S3 endpoint (for MinIO/DO Spaces)
	S3CDNURL            string // CDN URL for serving S3 files
	BootstrapAdminEmail string // Email to automatically promote to admin on startup
	TrustProxy          bool   // Trust X-Forwarded-For header for client IP (only enable behind a reverse proxy)

	// Push Notifications
	FCMCredentialsJSON string // Firebase service account JSON (base64 or raw)
	APNsKeyPath        string // Path to APNs .p8 key file
	APNsKeyID          string // APNs key ID
	APNsTeamID         string // APNs team ID
	APNsBundleID       string // iOS app bundle ID
	APNsProduction     bool   // true for production APNs, false for sandbox
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
		RevenueCatAPIKey:        os.Getenv("REVENUECAT_API_KEY"),
		AppleBundleID:           os.Getenv("APPLE_BUNDLE_ID"),
		UploadDir:               getEnv("UPLOAD_DIR", "./uploads"),
		StorageProvider:         getEnv("STORAGE_PROVIDER", "local"),
		S3Bucket:                os.Getenv("S3_BUCKET"),
		S3Region:                getEnv("S3_REGION", "us-east-1"),
		S3Prefix:                getEnv("S3_PREFIX", "uploads"),
		S3Endpoint:              os.Getenv("S3_ENDPOINT"),
		S3CDNURL:                os.Getenv("S3_CDN_URL"),
		BootstrapAdminEmail:     os.Getenv("BOOTSTRAP_ADMIN_EMAIL"),
		TrustProxy:              getEnv("TRUST_PROXY", "false") == "true",
		FCMCredentialsJSON:      os.Getenv("FCM_CREDENTIALS_JSON"),
		APNsKeyPath:             os.Getenv("APNS_KEY_PATH"),
		APNsKeyID:               os.Getenv("APNS_KEY_ID"),
		APNsTeamID:              os.Getenv("APNS_TEAM_ID"),
		APNsBundleID:            getEnv("APNS_BUNDLE_ID", "com.creapolis.solennix"),
		APNsProduction:          getEnv("APNS_PRODUCTION", "false") == "true",
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 32 bytes for HMAC-SHA256 security")
	}

	jwtExpiry, err := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))
	if err != nil {
		return nil, fmt.Errorf("JWT_EXPIRY_HOURS must be a number: %w", err)
	}
	cfg.JWTExpiryHours = jwtExpiry

	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")
	cfg.CORSAllowedOrigins = strings.Split(origins, ",")

	// Parse Google Client IDs (comma-separated: iOS,Android,Web)
	googleIDs := os.Getenv("GOOGLE_CLIENT_IDS")
	if googleIDs != "" {
		for _, id := range strings.Split(googleIDs, ",") {
			id = strings.TrimSpace(id)
			if id != "" {
				cfg.GoogleClientIDs = append(cfg.GoogleClientIDs, id)
			}
		}
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
