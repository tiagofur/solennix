package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"
)

// Timeout wraps the request context with a deadline so that downstream SQL
// queries (which receive r.Context()) are bounded. Upload routes are skipped
// to allow large multipart bodies and image processing to take longer.
func Timeout(d time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.Contains(r.URL.Path, "/uploads/") {
				next.ServeHTTP(w, r)
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), d)
			defer cancel()
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
