package middleware

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
)

type cspNonceContextKey struct{}

// GetCSPNonce returns the request-scoped CSP nonce for HTML responses.
// Handlers that render HTML can use this value in nonce="..." script tags.
func GetCSPNonce(ctx context.Context) string {
	nonce, _ := ctx.Value(cspNonceContextKey{}).(string)
	return nonce
}

func generateCSPNonce() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawStdEncoding.EncodeToString(b), nil
}

func buildDefaultCSP() string {
	return "default-src 'self'; " +
		"script-src 'self'; " +
		"style-src 'self'; " +
		"img-src 'self' data: https:; " +
		"font-src 'self' data:; " +
		"connect-src 'self'; " +
		"frame-ancestors 'none'; " +
		"base-uri 'self'; " +
		"form-action 'self'"
}

func buildHTMLCSP(nonce string) string {
	return "default-src 'self'; " +
		"script-src 'self' 'nonce-" + nonce + "'; " +
		"style-src 'self'; " +
		"img-src 'self' data: https:; " +
		"font-src 'self' data:; " +
		"connect-src 'self'; " +
		"frame-ancestors 'none'; " +
		"base-uri 'self'; " +
		"form-action 'self'"
}

// SecurityHeaders adds essential security headers to all HTTP responses.
// Implements OWASP recommended security headers to protect against common web vulnerabilities.
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		// Blocks browsers from MIME-sniffing a response away from the declared content-type
		// Mitigates: Drive-by download attacks, MIME confusion attacks
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking attacks
		// Prevents the page from being displayed in a frame/iframe
		// Mitigates: Clickjacking, UI redress attacks
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable XSS protection (legacy browsers)
		// Modern browsers have built-in XSS protection, but this helps older browsers
		// Mitigates: Cross-Site Scripting (XSS) attacks
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS (only if request is HTTPS or behind HTTPS proxy)
		// Tells browsers to only access the site via HTTPS for the next year
		// Mitigates: SSL stripping attacks, man-in-the-middle attacks
		if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
			// max-age=31536000: Enforce HTTPS for 1 year (31536000 seconds)
			// includeSubDomains: Apply to all subdomains
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}

		acceptHeader := strings.ToLower(r.Header.Get("Accept"))
		isHTML := strings.Contains(acceptHeader, "text/html")

		csp := buildDefaultCSP()
		if isHTML {
			nonce, err := generateCSPNonce()
			if err == nil {
				r = r.WithContext(context.WithValue(r.Context(), cspNonceContextKey{}, nonce))
				csp = buildHTMLCSP(nonce)
			}
		}
		w.Header().Set("Content-Security-Policy", csp)

		// Referrer Policy
		// Controls how much referrer information is included with requests
		// Mitigates: Information leakage via Referer header
		//
		// strict-origin-when-cross-origin:
		// - Same origin: Send full URL
		// - HTTPS → HTTPS cross-origin: Send origin only
		// - HTTPS → HTTP: Send nothing (downgrade protection)
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature-Policy)
		// Disables browser features that aren't needed
		// Mitigates: Privacy violations, unwanted feature access
		//
		// Disabled features:
		// - geolocation, microphone, camera: No location or media access needed
		// - payment: Stripe handles payment in their iframe
		// - usb: No USB device access needed
		// - magnetometer, gyroscope, accelerometer: No device sensors needed
		permissions := "geolocation=(), microphone=(), camera=(), payment=(), usb=(), " +
			"magnetometer=(), gyroscope=(), accelerometer=()"
		w.Header().Set("Permissions-Policy", permissions)

		// Serve the request
		next.ServeHTTP(w, r)
	})
}
