package config

import "testing"

func TestLoad(t *testing.T) {
	t.Run("GivenMissingDatabaseURL_WhenLoad_ThenReturnError", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "")
		t.Setenv("JWT_SECRET", "secret")

		_, err := Load()
		if err == nil {
			t.Fatalf("Load() expected error for missing DATABASE_URL")
		}
	})

	t.Run("GivenMissingJWTSecret_WhenLoad_ThenReturnError", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
		t.Setenv("JWT_SECRET", "")

		_, err := Load()
		if err == nil {
			t.Fatalf("Load() expected error for missing JWT_SECRET")
		}
	})

	t.Run("GivenInvalidNumericEnv_WhenLoad_ThenReturnError", func(t *testing.T) {
		t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
		t.Setenv("JWT_SECRET", "secret")
		t.Setenv("JWT_EXPIRY_HOURS", "not-number")

		_, err := Load()
		if err == nil {
			t.Fatalf("Load() expected error for invalid JWT_EXPIRY_HOURS")
		}
	})

	t.Run("GivenValidEnv_WhenLoad_ThenReturnConfig", func(t *testing.T) {
		t.Setenv("PORT", "9090")
		t.Setenv("ENVIRONMENT", "test")
		t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/db")
		t.Setenv("JWT_SECRET", "secret")
		t.Setenv("JWT_EXPIRY_HOURS", "12")
		t.Setenv("RESEND_API_KEY", "re_test_123")
		t.Setenv("RESEND_FROM_EMAIL", "Test <noreply@test.dev>")
		t.Setenv("FRONTEND_URL", "http://localhost:3000")
		t.Setenv("CORS_ALLOWED_ORIGINS", "http://a.com,http://b.com")

		cfg, err := Load()
		if err != nil {
			t.Fatalf("Load() error = %v", err)
		}

		if cfg.Port != "9090" || cfg.Environment != "test" {
			t.Fatalf("Load() returned unexpected Port/Environment")
		}
		if cfg.JWTExpiryHours != 12 {
			t.Fatalf("Load() returned unexpected JWTExpiryHours")
		}
		if cfg.ResendAPIKey != "re_test_123" {
			t.Fatalf("Load() returned unexpected ResendAPIKey")
		}
		if len(cfg.CORSAllowedOrigins) != 2 {
			t.Fatalf("CORSAllowedOrigins len = %d, want 2", len(cfg.CORSAllowedOrigins))
		}
	})
}

func TestGetEnv(t *testing.T) {
	t.Setenv("EXISTING_ENV", "value")

	if got := getEnv("EXISTING_ENV", "fallback"); got != "value" {
		t.Fatalf("getEnv() = %q, want %q", got, "value")
	}
	if got := getEnv("MISSING_ENV", "fallback"); got != "fallback" {
		t.Fatalf("getEnv() = %q, want %q", got, "fallback")
	}
}
