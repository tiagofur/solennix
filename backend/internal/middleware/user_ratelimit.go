package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/google/uuid"
)

type userVisitor struct {
	count       int
	windowStart time.Time
}

// PlanLimits defines rate limits per subscription plan (requests per window).
var PlanLimits = map[string]int{
	"basic":   60,  // 60 requests per minute
	"pro":     200, // 200 requests per minute
	"premium": 500, // 500 requests per minute
}

// UserRateLimit creates middleware that limits requests per authenticated user.
// It requires the Auth middleware to have run first (userID in context).
// Plan is fetched from the given PlanResolver.
func UserRateLimit(resolver PlanResolver, window time.Duration) func(http.Handler) http.Handler {
	var mu sync.Mutex
	visitors := make(map[uuid.UUID]*userVisitor)
	done := make(chan struct{})

	// Register cleanup stop function
	stopThis := func() { close(done) }
	allStopFuncs = append(allStopFuncs, stopThis)
	RateLimitStopFunc = func() {
		for _, fn := range allStopFuncs {
			fn()
		}
		allStopFuncs = nil
	}

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
				for uid, v := range visitors {
					if now.Sub(v.windowStart) > window {
						delete(visitors, uid)
					}
				}
				mu.Unlock()
			}
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == uuid.Nil {
				// No user context — fall through (IP rate limit still applies)
				next.ServeHTTP(w, r)
				return
			}

			// Get plan for this user
			plan := resolver.GetPlan(r.Context(), userID)
			maxRequests := PlanLimits["basic"] // default
			if limit, ok := PlanLimits[plan]; ok {
				maxRequests = limit
			}

			mu.Lock()
			v, exists := visitors[userID]
			now := time.Now()

			if !exists || now.Sub(v.windowStart) > window {
				visitors[userID] = &userVisitor{count: 1, windowStart: now}
				mu.Unlock()
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
				w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", maxRequests-1))
				next.ServeHTTP(w, r)
				return
			}

			v.count++
			if v.count > maxRequests {
				mu.Unlock()
				w.Header().Set("Retry-After", time.Until(v.windowStart.Add(window)).String())
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				writeAuthError(w, http.StatusTooManyRequests, "Rate limit exceeded for your plan. Upgrade for higher limits.")
				return
			}
			mu.Unlock()

			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", maxRequests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", maxRequests-v.count))
			next.ServeHTTP(w, r)
		})
	}
}
