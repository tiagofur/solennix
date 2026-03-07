package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type visitor struct {
	count       int
	windowStart time.Time
}

var RateLimitCleanupInterval = 5 * time.Minute

// RateLimitStopFunc holds the function to stop the background loop of the latest created RateLimit.
var RateLimitStopFunc func()

// TrustProxy controls whether X-Forwarded-For is used for client IP extraction.
// Set to true only when behind a trusted reverse proxy.
var TrustProxy bool

// RateLimit creates a middleware that limits requests per IP address.
// maxRequests is the maximum number of requests allowed within the given window duration.
// The cleanup goroutine stops when the returned stop function is called.
func RateLimit(maxRequests int, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := make(map[string]*visitor)
	done := make(chan struct{})

	RateLimitStopFunc = func() { close(done) }

	// Background cleanup of stale entries
	go func() {
		ticker := time.NewTicker(RateLimitCleanupInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				mu.Lock()
				now := time.Now()
				for ip, v := range visitors {
					if now.Sub(v.windowStart) > window {
						delete(visitors, ip)
					}
				}
				mu.Unlock()
			}
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := extractIP(r)

			mu.Lock()
			v, exists := visitors[ip]
			now := time.Now()

			if !exists || now.Sub(v.windowStart) > window {
				visitors[ip] = &visitor{count: 1, windowStart: now}
				mu.Unlock()
				next.ServeHTTP(w, r)
				return
			}

			v.count++
			if v.count > maxRequests {
				mu.Unlock()
				w.Header().Set("Retry-After", time.Until(v.windowStart.Add(window)).String())
				writeAuthError(w, http.StatusTooManyRequests, "Too many requests. Please try again later.")
				return
			}
			mu.Unlock()

			next.ServeHTTP(w, r)
		})
	}
}

// extractIP returns the client IP. Only trusts X-Forwarded-For when TrustProxy is true.
func extractIP(r *http.Request) string {
	if TrustProxy {
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			// Take only the first IP (original client)
			ip := strings.SplitN(forwarded, ",", 2)[0]
			return strings.TrimSpace(ip)
		}
	}
	// Strip port from RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
