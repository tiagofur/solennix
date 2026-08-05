package services

import (
	"strings"
	"testing"

	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/i18n"
)

func TestNewUserCleanupService(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "re_test_key",
		ResendFromEmail: "test@test.com",
	}
	emailSvc := NewEmailService(cfg)
	svc := NewUserCleanupService(nil, emailSvc)

	if svc == nil {
		t.Fatal("NewUserCleanupService() returned nil")
	}
	if svc.emailSvc != emailSvc {
		t.Error("NewUserCleanupService() emailSvc mismatch")
	}
}

func TestEmailService_SendInactivityWarning_NoApiKey(t *testing.T) {
	cfg := &config.Config{
		FrontendURL:     "http://localhost:5173",
		ResendAPIKey:    "",
		ResendFromEmail: "test@test.com",
	}
	emailSvc := NewEmailService(cfg)

	// Stage 1 (90 days)
	err := emailSvc.SendInactivityWarning("test@example.com", "John Doe", 1)
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected 'Resend not configured' error for stage 1, got %v", err)
	}

	// Stage 2 (120 days)
	err = emailSvc.SendInactivityWarningLocalized("test@example.com", "John Doe", "es", 2)
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected 'Resend not configured' error for stage 2, got %v", err)
	}

	// Stage 3 (150 days - English)
	err = emailSvc.SendInactivityWarningLocalized("test@example.com", "John Doe", "en", 3)
	if err == nil || err.Error() != "Resend not configured" {
		t.Errorf("expected 'Resend not configured' error for stage 3, got %v", err)
	}
}

func TestInactivityWarningTemplates_ES(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "https://solennix.com",
	}
	emailSvc := NewEmailService(cfg)

	loginLink := "https://solennix.com/login"
	html := emailSvc.renderTemplate(inactivityWarningBodyForLocale("es"), map[string]any{
		"UserName":  "María Pérez",
		"Days":      90,
		"LoginLink": loginLink,
		"Stage":     1,
	})

	if !strings.Contains(html, "María Pérez") {
		t.Errorf("expected HTML to contain user name 'María Pérez'")
	}
	if !strings.Contains(html, "90 días sin actividad") {
		t.Errorf("expected HTML to contain '90 días sin actividad'")
	}
	if !strings.Contains(html, loginLink) {
		t.Errorf("expected HTML to contain login link '%s'", loginLink)
	}
	if !strings.Contains(html, "Aviso de inactividad de cuenta") {
		t.Errorf("expected HTML to contain ES heading")
	}
}

func TestInactivityWarningTemplates_EN(t *testing.T) {
	cfg := &config.Config{
		FrontendURL: "https://solennix.com",
	}
	emailSvc := NewEmailService(cfg)

	loginLink := "https://solennix.com/login"
	html := emailSvc.renderTemplate(inactivityWarningBodyForLocale("en"), map[string]any{
		"UserName":  "Jane Smith",
		"Days":      120,
		"LoginLink": loginLink,
		"Stage":     2,
	})

	if !strings.Contains(html, "Jane Smith") {
		t.Errorf("expected HTML to contain user name 'Jane Smith'")
	}
	if !strings.Contains(html, "120 days") {
		t.Errorf("expected HTML to contain '120 days'")
	}
	if !strings.Contains(html, loginLink) {
		t.Errorf("expected HTML to contain login link '%s'", loginLink)
	}
	if !strings.Contains(html, "Account Inactivity Notice") {
		t.Errorf("expected HTML to contain EN heading")
	}
}

func TestInactivityWarningSubjects(t *testing.T) {
	s1ES := i18n.T("es", "email.inactivity_warning.stage1.subject")
	if !strings.Contains(s1ES, "90 días") {
		t.Errorf("expected stage 1 ES subject to mention 90 días, got %q", s1ES)
	}

	s2ES := i18n.T("es", "email.inactivity_warning.stage2.subject")
	if !strings.Contains(s2ES, "120 días") {
		t.Errorf("expected stage 2 ES subject to mention 120 días, got %q", s2ES)
	}

	s3ES := i18n.T("es", "email.inactivity_warning.stage3.subject")
	if !strings.Contains(s3ES, "Última advertencia") {
		t.Errorf("expected stage 3 ES subject to contain 'Última advertencia', got %q", s3ES)
	}

	s1EN := i18n.T("en", "email.inactivity_warning.stage1.subject")
	if !strings.Contains(s1EN, "90 days") {
		t.Errorf("expected stage 1 EN subject to mention 90 days, got %q", s1EN)
	}
}
