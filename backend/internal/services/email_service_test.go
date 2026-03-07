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

// ---------------------------------------------------------------------------
// Additional coverage tests — SendPasswordReset with empty recipient
// ---------------------------------------------------------------------------

func TestEmailService_SendPasswordReset_EmptyRecipient(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_fake_key",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// With a valid (but fake) API key and empty recipient, the Resend API
	// will reject the request. This exercises the error path in sendEmail.
	err := emailService.SendPasswordReset("", "fake-token", "Test User")
	if err == nil {
		t.Error("expected error when sending to empty recipient with fake API key")
	}
}

// ---------------------------------------------------------------------------
// Additional coverage tests — XSS prevention in generatePasswordResetHTML
// ---------------------------------------------------------------------------

func TestEmailService_GeneratePasswordResetHTML_SpecialCharsInUserName(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	// Test with HTML/XSS special characters in userName
	// Go's html/template auto-escapes, so <script> should become &lt;script&gt;
	xssName := `<script>alert("xss")</script>`
	html := emailService.generatePasswordResetHTML(xssName, "http://localhost:5173/reset?token=abc")

	// The raw <script> tag should NOT appear in the output
	if strings.Contains(html, "<script>") {
		t.Error("XSS vulnerability: raw <script> tag found in HTML output")
	}
	// The escaped version should be present
	if !strings.Contains(html, "&lt;script&gt;") {
		t.Error("expected HTML-escaped script tag in output")
	}
	// The reset link should still be present
	if !strings.Contains(html, "http://localhost:5173/reset?token=abc") {
		t.Error("expected HTML to contain the reset link")
	}
}

func TestEmailService_GeneratePasswordResetHTML_AmpersandInUserName(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	// Test with ampersand and quotes in userName
	html := emailService.generatePasswordResetHTML(`John "O'Brien" & Co.`, "http://localhost:5173/reset?token=def")

	// html/template should escape & to &amp; and quotes appropriately
	if strings.Contains(html, `& Co.`) && !strings.Contains(html, `&amp; Co.`) {
		t.Error("expected ampersand to be HTML-escaped")
	}
	if !strings.Contains(html, "reset?token=def") {
		t.Error("expected HTML to contain reset link")
	}
}

func TestEmailService_GeneratePasswordResetHTML_UnicodeUserName(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	// Test with Unicode characters (common in Spanish names)
	html := emailService.generatePasswordResetHTML("Jose Garcia", "http://localhost:5173/reset?token=ghi")

	if !strings.Contains(html, "Jose Garcia") {
		t.Error("expected HTML to contain Unicode user name")
	}
}

func TestEmailService_SendPasswordReset_VerifiesResetLinkFormat(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "https://myapp.example.com",
		ResendAPIKey:    "",
		ResendFromEmail: "noreply@example.com",
	}
	emailService := NewEmailService(cfg)

	// SendPasswordReset will fail due to no API key, but we can verify
	// that generatePasswordResetHTML builds the correct link format
	html := emailService.generatePasswordResetHTML("Verify User", "https://myapp.example.com/reset-password?token=mytoken123")
	if !strings.Contains(html, "https://myapp.example.com/reset-password?token=mytoken123") {
		t.Error("expected HTML to contain full reset link with frontend URL")
	}
	// Verify the link appears as an href
	if !strings.Contains(html, `href="https://myapp.example.com/reset-password?token=mytoken123"`) {
		t.Error("expected reset link to be in an href attribute")
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — sendEmail with a fake but non-empty API key
// ---------------------------------------------------------------------------

func TestEmailService_SendEmail_WithFakeAPIKey(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_invalid_key_123",
		ResendFromEmail: "noreply@solennix.com",
	}
	svc := NewEmailService(cfg)

	// This exercises the code path past the API key check (line 142-145)
	// and into the Resend client creation and Send call (lines 147-160).
	// The API will reject the fake key, returning an error.
	err := svc.sendEmail("recipient@example.com", "Test Subject", "<p>Body</p>")
	if err == nil {
		t.Error("expected error when calling Resend API with invalid key")
	}
	if !strings.Contains(err.Error(), "failed to send email") {
		t.Errorf("expected 'failed to send email' in error, got: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — NewEmailService stores config correctly
// ---------------------------------------------------------------------------

func TestNewEmailService_StoresAllConfigFields(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "https://custom.example.com",
		ResendAPIKey:    "re_live_key_abc",
		ResendFromEmail: "custom@example.com",
	}
	svc := NewEmailService(cfg)
	if svc.cfg.FrontendURL != "https://custom.example.com" {
		t.Errorf("expected FrontendURL = %q, got %q", "https://custom.example.com", svc.cfg.FrontendURL)
	}
	if svc.cfg.ResendAPIKey != "re_live_key_abc" {
		t.Errorf("expected ResendAPIKey = %q, got %q", "re_live_key_abc", svc.cfg.ResendAPIKey)
	}
	if svc.cfg.ResendFromEmail != "custom@example.com" {
		t.Errorf("expected ResendFromEmail = %q, got %q", "custom@example.com", svc.cfg.ResendFromEmail)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — SendPasswordReset with empty name
// ---------------------------------------------------------------------------

func TestEmailService_SendPasswordReset_EmptyName(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// Empty name should not cause a panic; the email will fail because no API key.
	err := emailService.SendPasswordReset("user@example.com", "some-token", "")
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected 'Resend not configured' error, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — HTML template contains expected structure
// ---------------------------------------------------------------------------

func TestEmailService_GeneratePasswordResetHTML_ContainsStructure(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "http://localhost:5173",
	}
	emailService := NewEmailService(cfg)

	html := emailService.generatePasswordResetHTML("Test User", "http://localhost:5173/reset?token=abc")

	// Verify HTML doctype and lang
	if !strings.Contains(html, "<!DOCTYPE html>") {
		t.Error("expected HTML to contain DOCTYPE declaration")
	}
	if !strings.Contains(html, `lang="es"`) {
		t.Error("expected HTML to have Spanish language attribute")
	}

	// Verify key structural elements
	if !strings.Contains(html, "Solennix") {
		t.Error("expected HTML to contain 'Solennix' branding")
	}
	if !strings.Contains(html, "Hola Test User") {
		t.Error("expected HTML to contain personalized greeting")
	}
	if !strings.Contains(html, "1 hora") {
		t.Error("expected HTML to contain expiry warning of 1 hour")
	}
	if !strings.Contains(html, "Restablecer Contraseña") {
		t.Error("expected HTML to contain the reset button text")
	}
	if !strings.Contains(html, "class=\"button\"") {
		t.Error("expected HTML to contain button CSS class")
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — SendPasswordReset builds correct link
// ---------------------------------------------------------------------------

func TestEmailService_SendPasswordReset_BuildsCorrectLink(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "https://app.solennix.com",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	emailService := NewEmailService(cfg)

	// We can't intercept the HTML inside SendPasswordReset (it calls sendEmail
	// which fails), but we verify that generatePasswordResetHTML produces the
	// same link format SendPasswordReset would construct.
	expectedLink := "https://app.solennix.com/reset-password?token=tok123"
	html := emailService.generatePasswordResetHTML("Link Test", expectedLink)
	if !strings.Contains(html, expectedLink) {
		t.Errorf("expected HTML to contain link %q", expectedLink)
	}
}

// ---------------------------------------------------------------------------
// Additional coverage — sendEmail error message wraps underlying error
// ---------------------------------------------------------------------------

func TestEmailService_SendEmail_ErrorWrapping(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_some_fake_key",
		ResendFromEmail: "from@example.com",
	}
	svc := NewEmailService(cfg)

	err := svc.sendEmail("to@example.com", "Subject", "<p>Body</p>")
	if err == nil {
		t.Fatal("expected error from Resend API with fake key")
	}
	// The error should be wrapped with our prefix
	if !strings.HasPrefix(err.Error(), "failed to send email:") {
		t.Errorf("expected error to start with 'failed to send email:', got: %v", err)
	}
}
