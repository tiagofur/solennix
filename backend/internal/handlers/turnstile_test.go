package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

// point turnstileVerifyURL at a local stub for these tests.
func stubTurnstile(t *testing.T, success bool, status int) {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if ct := r.Header.Get("Content-Type"); ct != "application/x-www-form-urlencoded" {
			t.Errorf("expected form content type, got %q", ct)
		}
		w.WriteHeader(status)
		if success {
			_, _ = w.Write([]byte(`{"success": true}`))
		} else {
			_, _ = w.Write([]byte(`{"success": false}`))
		}
	}))
	t.Cleanup(srv.Close)
	old := turnstileVerifyURL
	turnstileVerifyURL = srv.URL
	t.Cleanup(func() { turnstileVerifyURL = old })
}

func TestVerifyTurnstile_SkippedWithoutSecret(t *testing.T) {
	// No secret ⇒ dev mode, even with garbage token.
	if err := verifyTurnstileToken(context.Background(), "", "whatever", "127.0.0.1"); err != nil {
		t.Fatalf("expected skip without secret, got %v", err)
	}
}

func TestVerifyTurnstile_RequiresTokenWhenConfigured(t *testing.T) {
	stubTurnstile(t, true, http.StatusOK)
	if err := verifyTurnstileToken(context.Background(), "secret", "", "127.0.0.1"); err == nil {
		t.Fatal("expected error for empty token with configured secret")
	}
	if err := verifyTurnstileToken(context.Background(), "secret", "   ", "127.0.0.1"); err == nil {
		t.Fatal("expected error for blank token with configured secret")
	}
}

func TestVerifyTurnstile_AcceptsValidToken(t *testing.T) {
	stubTurnstile(t, true, http.StatusOK)
	if err := verifyTurnstileToken(context.Background(), "secret", "tok", "127.0.0.1"); err != nil {
		t.Fatalf("expected nil, got %v", err)
	}
}

func TestVerifyTurnstile_RejectsFailedVerification(t *testing.T) {
	stubTurnstile(t, false, http.StatusOK)
	if err := verifyTurnstileToken(context.Background(), "secret", "tok", "127.0.0.1"); err == nil {
		t.Fatal("expected error when cloudflare reports success=false")
	}
}
