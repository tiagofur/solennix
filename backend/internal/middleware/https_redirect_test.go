package middleware

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRedirectToHTTPS(t *testing.T) {
	t.Run("GivenDevelopmentEnvironment_WhenHTTPRequest_ThenNoRedirect", func(t *testing.T) {
		handler := RedirectToHTTPS("development", true)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "http://example.com/api/health", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	})

	t.Run("GivenProductionWhenPlainHTTPGet_ThenRedirect301ToHTTPS", func(t *testing.T) {
		handler := RedirectToHTTPS("production", false)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "http://api.example.com/api/clients?q=test", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusMovedPermanently {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusMovedPermanently)
		}
		if got := rr.Header().Get("Location"); got != "https://api.example.com/api/clients?q=test" {
			t.Fatalf("Location = %q, want %q", got, "https://api.example.com/api/clients?q=test")
		}
	})

	t.Run("GivenProductionWhenPlainHTTPPost_ThenRedirect308ToHTTPS", func(t *testing.T) {
		handler := RedirectToHTTPS("production", false)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodPost, "http://api.example.com/api/auth/login", nil)
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusPermanentRedirect {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusPermanentRedirect)
		}
	})

	t.Run("GivenProductionWhenTLSRequest_ThenNoRedirect", func(t *testing.T) {
		handler := RedirectToHTTPS("production", false)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "https://api.example.com/health", nil)
		req.TLS = &tls.ConnectionState{}
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	})

	t.Run("GivenProductionAndTrustedProxyWhenForwardedHTTP_ThenRedirectUsingForwardedHost", func(t *testing.T) {
		handler := RedirectToHTTPS("production", true)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "http://internal.local/api/clients", nil)
		req.Header.Set("X-Forwarded-Proto", "http")
		req.Header.Set("X-Forwarded-Host", "api.solennix.com")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusMovedPermanently {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusMovedPermanently)
		}
		if got := rr.Header().Get("Location"); got != "https://api.solennix.com/api/clients" {
			t.Fatalf("Location = %q, want %q", got, "https://api.solennix.com/api/clients")
		}
	})

	t.Run("GivenProductionAndTrustedProxyWhenForwardedHTTPS_ThenNoRedirect", func(t *testing.T) {
		handler := RedirectToHTTPS("production", true)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "http://internal.local/api/clients", nil)
		req.Header.Set("X-Forwarded-Proto", "https")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusOK)
		}
	})

	t.Run("GivenProductionAndUntrustedProxyWhenForwardedHostSet_ThenDoNotTrustForwardedHost", func(t *testing.T) {
		handler := RedirectToHTTPS("production", false)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		}))

		req := httptest.NewRequest(http.MethodGet, "http://internal.local/api/clients", nil)
		req.Header.Set("X-Forwarded-Host", "api.solennix.com")
		rr := httptest.NewRecorder()

		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusMovedPermanently {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusMovedPermanently)
		}
		if got := rr.Header().Get("Location"); got != "https://internal.local/api/clients" {
			t.Fatalf("Location = %q, want %q", got, "https://internal.local/api/clients")
		}
	})
}
