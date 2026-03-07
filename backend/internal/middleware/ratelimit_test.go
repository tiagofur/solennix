package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestExtractIP(t *testing.T) {
	// Save and restore TrustProxy
	origTrust := TrustProxy
	defer func() { TrustProxy = origTrust }()

	t.Run("TrustProxy=true", func(t *testing.T) {
		TrustProxy = true
		tests := []struct {
			name     string
			headers  map[string]string
			remote   string
			expected string
		}{
			{"Forwarded for single", map[string]string{"X-Forwarded-For": "10.0.0.1"}, "192.168.1.1:1234", "10.0.0.1"},
			{"Forwarded for multiple", map[string]string{"X-Forwarded-For": "10.0.0.2, 192.168.1.5"}, "192.168.1.1:1234", "10.0.0.2"},
			{"RemoteAddr specific", map[string]string{}, "192.168.1.3:1234", "192.168.1.3"},
			{"RemoteAddr fallback", map[string]string{}, "invalid-format", "invalid-format"},
		}
		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				req := httptest.NewRequest("GET", "/", nil)
				for k, v := range tt.headers {
					req.Header.Set(k, v)
				}
				req.RemoteAddr = tt.remote
				ip := extractIP(req)
				if ip != tt.expected {
					t.Errorf("expected %q, got %q", tt.expected, ip)
				}
			})
		}
	})

	t.Run("TrustProxy=false ignores X-Forwarded-For", func(t *testing.T) {
		TrustProxy = false
		req := httptest.NewRequest("GET", "/", nil)
		req.Header.Set("X-Forwarded-For", "10.0.0.1")
		req.RemoteAddr = "192.168.1.1:1234"
		ip := extractIP(req)
		if ip != "192.168.1.1" {
			t.Errorf("expected %q, got %q", "192.168.1.1", ip)
		}
	})
}

func TestRateLimit(t *testing.T) {
	// Temporarily speed up the cleanup ticker
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	handler := RateLimit(2, 50*time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"

	// Req 1: OK
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK, got %v", rr.Code)
	}

	// Req 2: OK
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK, got %v", rr.Code)
	}

	// Req 3: Rate Limited
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected StatusTooManyRequests, got %v", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "Too many requests. Please try again later.") {
		t.Errorf("Expected body error, got %s", rr.Body.String())
	}
	if retryAfter := rr.Header().Get("Retry-After"); retryAfter == "" {
		t.Errorf("Expected Retry-After header")
	}

	// Wait for cleanup loop to trigger on ticker to delete the IP that expired
	// The window is 50ms, the cleanup is 10ms. Sleep 100ms.
	time.Sleep(100 * time.Millisecond)

	// Req 4: OK (after window reset and cleanup)
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK, got %v", rr.Code)
	}
}

func TestRateLimit_ResetWindowWithoutCleanup(t *testing.T) {
	// Let window be 5ms
	handler := RateLimit(1, 5*time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.2:1234"

	// Req 1: OK
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK, got %v", rr.Code)
	}

	// Sleep past the window!
	time.Sleep(10 * time.Millisecond)

	// Req 2: OK because the window reset without going to the cleanup script
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK, got %v", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
		// Sleep lightly to allow goroutine to hit the done select case
		time.Sleep(2 * time.Millisecond)
	}
}

func TestRateLimit_CleanupRoutine(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 5 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	// window is 10ms
	handler := RateLimit(1, 10*time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.3:1234"

	// Trigger creation of map entry
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Wait for window to expire AND ticker to fire, which will trigger delete()
	time.Sleep(25 * time.Millisecond)

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}
