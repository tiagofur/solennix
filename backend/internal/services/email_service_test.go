package services

import (
	"strings"
	"testing"

	"github.com/tiagofur/solennix-backend/internal/config"
)

func TestNewEmailService(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_test_key",
		ResendFromEmail: "test@test.com",
	}
	svc := NewEmailService(cfg)
	if svc == nil {
		t.Fatal("NewEmailService() returned nil")
	}
	if svc.cfg != cfg {
		t.Fatal("NewEmailService() config mismatch")
	}
}

func TestEmailService_SendEmail_NoApiKey(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	svc := NewEmailService(cfg)

	err := svc.sendEmail("user@example.com", "Test Subject", "<p>Hello</p>")
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected 'Resend not configured' error, got %v", err)
	}
}

func TestEmailService_GeneratePasswordResetHTML(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	html := emailService.generatePasswordResetHTML("John Doe", "http://localhost:5173/reset?token=123")

	if !strings.Contains(html, "John Doe") {
		t.Errorf("expected HTML to contain user name: %s", "John Doe")
	}
	if !strings.Contains(html, "http://localhost:5173/reset?token=123") {
		t.Errorf("expected HTML to contain reset link")
	}
}

func TestEmailService_SendPasswordReset_NoApiKey(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	err := emailService.SendPasswordReset("user@example.com", "fake-token", "John Doe")
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected Resend not configured error, got %v", err)
	}
}

func TestEmailService_SendPasswordReset_WithFakeKey(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_fake_key",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// Since the key is fake, the resend API responds with an error.
	// This covers lines 147 to 160.
	err := emailService.SendPasswordReset("user@example.com", "fake-token", "John Doe")
	if err == nil {
		t.Error("expected error when sending with fake key")
	}
}
