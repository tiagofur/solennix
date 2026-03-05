package config

import (
	"os"
	"strings"
	"testing"
)

func TestLoad_Success(t *testing.T) {
	// Setup
	os.Setenv("DATABASE_URL", "postgres://test")
	os.Setenv("JWT_SECRET", "supersecret")
	os.Setenv("PORT", "9090")
	os.Setenv("ENVIRONMENT", "test")
	os.Setenv("RESEND_API_KEY", "re_test")
	os.Setenv("RESEND_FROM_EMAIL", "test@test.dev")
	os.Setenv("FRONTEND_URL", "http://test.com")
	os.Setenv("STRIPE_SECRET_KEY", "sk_test")
	os.Setenv("STRIPE_WEBHOOK_SECRET", "wh_test")
	os.Setenv("STRIPE_PRO_PRICE_ID", "price_test")
	os.Setenv("STRIPE_PORTAL_CONFIG_ID", "bpc_test")
	os.Setenv("REVENUECAT_WEBHOOK_SECRET", "rc_test")
	os.Setenv("UPLOAD_DIR", "/tmp/uploads")
	os.Setenv("JWT_EXPIRY_HOURS", "12")
	os.Setenv("CORS_ALLOWED_ORIGINS", "http://test.com,https://test2.com")

	defer func() {
		os.Clearenv()
	}()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if cfg.Port != "9090" {
		t.Errorf("expected port 9090, got %s", cfg.Port)
	}
	if cfg.Environment != "test" {
		t.Errorf("expected environment test, got %s", cfg.Environment)
	}
	if cfg.DatabaseURL != "postgres://test" {
		t.Errorf("expected dp url postgres://test, got %s", cfg.DatabaseURL)
	}
	if cfg.JWTSecret != "supersecret" {
		t.Errorf("expected secret supersecret, got %s", cfg.JWTSecret)
	}
	if cfg.ResendAPIKey != "re_test" {
		t.Errorf("expected resend API re_test, got %s", cfg.ResendAPIKey)
	}
	if cfg.ResendFromEmail != "test@test.dev" {
		t.Errorf("expected test@test.dev, got %s", cfg.ResendFromEmail)
	}
	if cfg.FrontendURL != "http://test.com" {
		t.Errorf("expected http://test.com, got %s", cfg.FrontendURL)
	}
	if cfg.StripeSecretKey != "sk_test" {
		t.Errorf("expected sk_test, got %s", cfg.StripeSecretKey)
	}
	if cfg.StripeWebhookSecret != "wh_test" {
		t.Errorf("expected wh_test, got %s", cfg.StripeWebhookSecret)
	}
	if cfg.StripeProPriceID != "price_test" {
		t.Errorf("expected price_test, got %s", cfg.StripeProPriceID)
	}
	if cfg.StripePortalConfigID != "bpc_test" {
		t.Errorf("expected bpc_test, got %s", cfg.StripePortalConfigID)
	}
	if cfg.RevenueCatWebhookSecret != "rc_test" {
		t.Errorf("expected rc_test, got %s", cfg.RevenueCatWebhookSecret)
	}
	if cfg.UploadDir != "/tmp/uploads" {
		t.Errorf("expected /tmp/uploads, got %s", cfg.UploadDir)
	}
	if cfg.JWTExpiryHours != 12 {
		t.Errorf("expected 12 hours, got %d", cfg.JWTExpiryHours)
	}
	if len(cfg.CORSAllowedOrigins) != 2 || cfg.CORSAllowedOrigins[0] != "http://test.com" || cfg.CORSAllowedOrigins[1] != "https://test2.com" {
		t.Errorf("expected CORS allowed origins to be parsed properly, got %v", cfg.CORSAllowedOrigins)
	}
}

func TestLoad_Defaults(t *testing.T) {
	os.Clearenv()
	os.Setenv("DATABASE_URL", "postgres://test")
	os.Setenv("JWT_SECRET", "supersecret")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("expected port 8080, got %s", cfg.Port)
	}
	if cfg.Environment != "development" {
		t.Errorf("expected env development, got %s", cfg.Environment)
	}
	if cfg.ResendFromEmail != "Solennix <noreply@solennix.com>" {
		t.Errorf("expected default email, got %s", cfg.ResendFromEmail)
	}
	if cfg.FrontendURL != "http://localhost:5173" {
		t.Errorf("expected default frontend url, got %s", cfg.FrontendURL)
	}
	if cfg.UploadDir != "./uploads" {
		t.Errorf("expected default upload dir, got %s", cfg.UploadDir)
	}
	if cfg.JWTExpiryHours != 24 {
		t.Errorf("expected default expiry 24, got %d", cfg.JWTExpiryHours)
	}
	if len(cfg.CORSAllowedOrigins) != 1 || cfg.CORSAllowedOrigins[0] != "http://localhost:5173" {
		t.Errorf("expected default cors allowed origins, got %v", cfg.CORSAllowedOrigins)
	}
}

func TestLoad_Errors(t *testing.T) {
	// Missing DATABASE_URL
	os.Clearenv()
	_, err := Load()
	if err == nil || !strings.Contains(err.Error(), "DATABASE_URL is required") {
		t.Errorf("expected missing database_url error, got %v", err)
	}

	// Missing JWT_SECRET
	os.Setenv("DATABASE_URL", "postgres://test")
	_, err = Load()
	if err == nil || !strings.Contains(err.Error(), "JWT_SECRET is required") {
		t.Errorf("expected missing jwt_secret error, got %v", err)
	}

	// Invalid JWT_EXPIRY_HOURS
	os.Setenv("JWT_SECRET", "secret")
	os.Setenv("JWT_EXPIRY_HOURS", "invalid")
	_, err = Load()
	if err == nil || !strings.Contains(err.Error(), "JWT_EXPIRY_HOURS must be a number") {
		t.Errorf("expected invalid expiry hours error, got %v", err)
	}
}

func TestGetEnv(t *testing.T) {
	os.Clearenv()

	if val := getEnv("TEST_GETENV", "fallback"); val != "fallback" {
		t.Errorf("expected fallback, got %v", val)
	}

	os.Setenv("TEST_GETENV", "value")
	if val := getEnv("TEST_GETENV", "fallback"); val != "value" {
		t.Errorf("expected value, got %v", val)
	}
}
