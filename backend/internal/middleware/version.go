package middleware

import (
	"fmt"
	"net/http"
	"time"
)

// APIVersion adds the X-API-Version header to all responses.
func APIVersion(version string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-API-Version", version)
			next.ServeHTTP(w, r)
		})
	}
}

// Deprecate adds standard deprecation headers to the response.
func Deprecate(sunsetTime time.Time, policyURL string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Deprecation", "true")
			w.Header().Set("Sunset", sunsetTime.UTC().Format(time.RFC1123))
			if policyURL != "" {
				w.Header().Set("Link", fmt.Sprintf("<%s>; rel=\"deprecation\"", policyURL))
			}
			next.ServeHTTP(w, r)
		})
	}
}
