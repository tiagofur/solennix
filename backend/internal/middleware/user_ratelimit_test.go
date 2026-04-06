package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// mockPlanResolver returns a fixed plan for any user.
type mockPlanResolver struct {
	plan string
}

func (m *mockPlanResolver) GetPlan(_ context.Context, _ uuid.UUID) string {
	return m.plan
}

// authenticatedRequest creates a request with a userID in context.
func authenticatedRequest(userID uuid.UUID) *http.Request {
	req := httptest.NewRequest("GET", "/", nil)
	ctx := context.WithValue(req.Context(), UserIDKey, userID)
	return req.WithContext(ctx)
}

func TestUserRateLimit_BasicPlanLimit(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	handler := UserRateLimit(resolver, 1*time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()

	// Should allow up to 60 requests
	for i := 0; i < 60; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, authenticatedRequest(userID))
		if rr.Code != http.StatusOK {
			t.Fatalf("Request %d: expected OK, got %d", i+1, rr.Code)
		}
	}

	// Request 61 should be rate limited
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429, got %d", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_ProPlanLimit(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "pro"}
	handler := UserRateLimit(resolver, 1*time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()

	// Should allow up to 200 requests
	for i := 0; i < 200; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, authenticatedRequest(userID))
		if rr.Code != http.StatusOK {
			t.Fatalf("Request %d: expected OK, got %d", i+1, rr.Code)
		}
	}

	// Request 201 should be rate limited
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429, got %d", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_ExceedingLimitReturns429WithHeaders(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	handler := UserRateLimit(resolver, 50*time.Millisecond)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()

	// Exhaust the limit (basic = 60)
	for i := 0; i < 60; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, authenticatedRequest(userID))
	}

	// Next request should be 429
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429, got %d", rr.Code)
	}

	// Verify X-RateLimit headers
	if limit := rr.Header().Get("X-RateLimit-Limit"); limit != "60" {
		t.Errorf("Expected X-RateLimit-Limit=60, got %q", limit)
	}
	if remaining := rr.Header().Get("X-RateLimit-Remaining"); remaining != "0" {
		t.Errorf("Expected X-RateLimit-Remaining=0, got %q", remaining)
	}
	if retryAfter := rr.Header().Get("Retry-After"); retryAfter == "" {
		t.Error("Expected Retry-After header to be set")
	}

	// Verify error message
	if !strings.Contains(rr.Body.String(), "Rate limit exceeded") {
		t.Errorf("Expected rate limit error message, got %s", rr.Body.String())
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_WindowResetAllowsNewRequests(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 5 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	window := 20 * time.Millisecond
	handler := UserRateLimit(resolver, window)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()

	// Exhaust the limit
	for i := 0; i < 60; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, authenticatedRequest(userID))
	}

	// Verify limited
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected 429 before window reset, got %d", rr.Code)
	}

	// Wait for window to expire
	time.Sleep(30 * time.Millisecond)

	// Should be allowed again
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK after window reset, got %d", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_NoUserIDFallsThrough(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	handler := UserRateLimit(resolver, 1*time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Request without userID in context
	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected OK for unauthenticated request, got %d", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_RemainingHeaderDecreases(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	handler := UserRateLimit(resolver, 1*time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	userID := uuid.New()

	// First request: remaining should be 59
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if remaining := rr.Header().Get("X-RateLimit-Remaining"); remaining != "59" {
		t.Errorf("Expected X-RateLimit-Remaining=59 on first request, got %q", remaining)
	}

	// Second request: remaining should be 58
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(userID))
	if remaining := rr.Header().Get("X-RateLimit-Remaining"); remaining != "58" {
		t.Errorf("Expected X-RateLimit-Remaining=58 on second request, got %q", remaining)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}

func TestUserRateLimit_DifferentUsersIndependent(t *testing.T) {
	originalInterval := RateLimitCleanupInterval
	RateLimitCleanupInterval = 10 * time.Millisecond
	defer func() { RateLimitCleanupInterval = originalInterval }()

	resolver := &mockPlanResolver{plan: "basic"}
	handler := UserRateLimit(resolver, 1*time.Second)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	user1 := uuid.New()
	user2 := uuid.New()

	// Exhaust user1's limit
	for i := 0; i < 60; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, authenticatedRequest(user1))
	}

	// user1 should be limited
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(user1))
	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("Expected user1 to be rate limited, got %d", rr.Code)
	}

	// user2 should still be allowed
	rr = httptest.NewRecorder()
	handler.ServeHTTP(rr, authenticatedRequest(user2))
	if rr.Code != http.StatusOK {
		t.Errorf("Expected user2 to be OK, got %d", rr.Code)
	}

	if RateLimitStopFunc != nil {
		RateLimitStopFunc()
	}
}
