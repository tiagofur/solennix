package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
)

// CSRF implements the Double-Submit Cookie pattern for web clients.
// Requests authenticated via Bearer header are exempt (mobile/API clients don't use cookies).
// Webhook paths are also exempt (verified by signature).
func CSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip for safe methods (GET, HEAD, OPTIONS)
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			ensureCSRFCookie(w, r)
			next.ServeHTTP(w, r)
			return
		}

		// Skip if using Authorization header (mobile/API clients)
		if r.Header.Get("Authorization") != "" {
			next.ServeHTTP(w, r)
			return
		}

		// Skip if no auth_token cookie exists (no web session to protect)
		if _, err := r.Cookie("auth_token"); err != nil {
			next.ServeHTTP(w, r)
			return
		}

		// Skip webhook endpoints (verified by signature, no CSRF needed)
		if isWebhookPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		// Skip auth endpoints (public, no session cookie to CSRF)
		if isAuthPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		// Validate: X-CSRF-Token header must match csrf_token_v2 cookie
		cookie, err := r.Cookie("csrf_token_v2")
		if err != nil {
			writeAuthError(w, http.StatusForbidden, "CSRF token missing")
			return
		}

		headerToken := r.Header.Get("X-CSRF-Token")
		if headerToken == "" || headerToken != cookie.Value {
			writeAuthError(w, http.StatusForbidden, "CSRF token invalid")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func ensureCSRFCookie(w http.ResponseWriter, r *http.Request) {
	if _, err := r.Cookie("csrf_token_v2"); err != nil {
		token := generateCSRFToken()
		
		domain := ""
		if strings.Contains(r.Host, "solennix.com") {
			domain = ".solennix.com"
		}

		http.SetCookie(w, &http.Cookie{
			Name:     "csrf_token_v2",
			Value:    token,
			Path:     "/",
			Domain:   domain,
			HttpOnly: false, // JS must read this
			Secure:   r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https",
			SameSite: http.SameSiteStrictMode,
			MaxAge:   86400, // 24 hours
		})
	}
}

// generateCSRFToken returns a cryptographically random 64-character hex string.
func generateCSRFToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// isWebhookPath returns true for paths under the webhook prefix —
// these endpoints verify authenticity via request signatures, not CSRF.
// Matches /api/subscriptions/webhook/ and /api/v1/subscriptions/webhook/.
func isWebhookPath(path string) bool {
	return strings.HasPrefix(path, "/api/subscriptions/webhook/") ||
		strings.HasPrefix(path, "/api/v1/subscriptions/webhook/")
}

// isAuthPath returns true for public authentication endpoints that
// don't have an existing session (register, login, refresh, etc.).
// Matches /api/auth/ and /api/v1/auth/.
func isAuthPath(path string) bool {
	return strings.HasPrefix(path, "/api/auth/") ||
		strings.HasPrefix(path, "/api/v1/auth/")
}
