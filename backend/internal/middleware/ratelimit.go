package middleware

import (
	"net/http"
	"sync"
	"time"
)

type visitor struct {
	count    int
	windowStart time.Time
}

// RateLimit creates a middleware that limits requests per IP address.
// maxRequests is the maximum number of requests allowed within the given window duration.
func RateLimit(maxRequests int, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := make(map[string]*visitor)

	// Background cleanup of stale entries every 5 minutes
	go func() {
		for {
			time.Sleep(5 * time.Minute)
			mu.Lock()
			now := time.Now()
			for ip, v := range visitors {
				if now.Sub(v.windowStart) > window {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = forwarded
			}

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
