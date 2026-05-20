package middleware

import (
	"net/http"
	"strings"
)

// RedirectToHTTPS enforces HTTPS only in production. It trusts forwarded
// headers only when trustProxy is enabled to avoid spoofing.
func RedirectToHTTPS(environment string, trustProxy bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.EqualFold(environment, "production") {
				next.ServeHTTP(w, r)
				return
			}

			isHTTPS := r.TLS != nil
			if trustProxy {
				isHTTPS = isHTTPS || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
			}

			if isHTTPS {
				next.ServeHTTP(w, r)
				return
			}

			host := r.Host
			if trustProxy {
				if forwardedHost := strings.TrimSpace(r.Header.Get("X-Forwarded-Host")); forwardedHost != "" {
					host = forwardedHost
				}
			}

			target := "https://" + host + r.URL.Path
			if r.URL.RawQuery != "" {
				target += "?" + r.URL.RawQuery
			}

			status := http.StatusMovedPermanently
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				status = http.StatusPermanentRedirect
			}

			http.Redirect(w, r, target, status)
		})
	}
}
