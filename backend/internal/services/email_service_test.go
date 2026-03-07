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

func TestEmailService_SendPasswordReset_LinkFormat(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "https://app.solennix.com",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// SendPasswordReset will fail because no API key, but the HTML should
	// contain the correctly formatted link. We test generatePasswordResetHTML directly.
	html := emailService.generatePasswordResetHTML("Maria", "https://app.solennix.com/reset-password?token=abc123")
	if !strings.Contains(html, "Maria") {
		t.Error("expected HTML to contain user name")
	}
	if !strings.Contains(html, "https://app.solennix.com/reset-password?token=abc123") {
		t.Error("expected HTML to contain reset link")
	}
	if !strings.Contains(html, "Restablecer Contraseña") {
		t.Error("expected HTML to contain Spanish button text")
	}
}

func TestEmailService_SendEmail_EmptyRecipient(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_fake_key",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// With a fake key, this will hit the Resend API and fail.
	// This tests the error handling path in sendEmail.
	err := emailService.sendEmail("", "Test", "<p>Test</p>")
	if err == nil {
		t.Error("expected error when sending with fake key")
	}
}

func TestEmailService_GeneratePasswordResetHTML_EmptyName(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	// Test with empty username — should not panic
	html := emailService.generatePasswordResetHTML("", "http://localhost:5173/reset?token=xyz")
	if !strings.Contains(html, "Hola ") {
		t.Error("expected HTML to contain greeting")
	}
	if !strings.Contains(html, "http://localhost:5173/reset?token=xyz") {
		t.Error("expected HTML to contain the reset link")
	}
}
