package middleware

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// errBlacklist is a TokenBlacklist that always returns an error from IsRevoked.
type errBlacklist struct{}

func (e *errBlacklist) IsRevoked(_ context.Context, _ string) (bool, error) {
	return false, errors.New("db connection refused")
}

func (e *errBlacklist) Revoke(_ context.Context, _ string, _ time.Time) error {
	return nil
}

func TestAuthMiddleware(t *testing.T) {
	authService := services.NewAuthService("test-secret", 1)
	userID := uuid.New()
	email := "auth@test.dev"
	tokens, err := authService.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	tests := []struct {
		name           string
		authHeader     string
		wantStatusCode int
		wantBody       string
	}{
		{
			name:           "GivenNoHeader_WhenRequest_ThenUnauthorized",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Authentication required",
		},
		{
			name:           "GivenInvalidFormat_WhenRequest_ThenUnauthorized",
			authHeader:     "Token abc",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Authentication required",
		},
		{
			name:           "GivenInvalidToken_WhenRequest_ThenUnauthorized",
			authHeader:     "Bearer invalid-token",
			wantStatusCode: http.StatusUnauthorized,
			wantBody:       "Invalid or expired token",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusNoContent)
			})

			handler := Auth(authService)(next)
			req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tc.wantStatusCode {
				t.Fatalf("status = %d, want %d", rr.Code, tc.wantStatusCode)
			}
			if !strings.Contains(rr.Body.String(), tc.wantBody) {
				t.Fatalf("body = %q, expected to contain %q", rr.Body.String(), tc.wantBody)
			}
			if got := rr.Header().Get("Content-Type"); got != "application/json" {
				t.Fatalf("Content-Type = %q, want %q", got, "application/json")
			}
			var payload map[string]string
			if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
				t.Fatalf("response must be valid JSON error payload: %v", err)
			}
			if payload["error"] == "" {
				t.Fatalf("response must contain non-empty error field: %s", rr.Body.String())
			}
			if nextCalled {
				t.Fatalf("next handler should not be called on unauthorized request")
			}
		})
	}

	t.Run("GivenValidToken_WhenRequest_ThenContextContainsUserData", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if gotID := GetUserID(r.Context()); gotID != userID {
				t.Fatalf("GetUserID() = %v, want %v", gotID, userID)
			}
			if gotEmail := GetUserEmail(r.Context()); gotEmail != email {
				t.Fatalf("GetUserEmail() = %q, want %q", gotEmail, email)
			}
			w.WriteHeader(http.StatusNoContent)
		})

		handler := Auth(authService)(next)
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNoContent)
		}
	})

	t.Run("GivenValidCookie_WhenRequest_ThenContextContainsUserData", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if gotID := GetUserID(r.Context()); gotID != userID {
				t.Fatalf("GetUserID() = %v, want %v", gotID, userID)
			}
			w.WriteHeader(http.StatusNoContent)
		})

		handler := Auth(authService)(next)
		req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
		req.AddCookie(&http.Cookie{Name: "auth_token", Value: tokens.AccessToken})
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusNoContent {
			t.Fatalf("status = %d, want %d", rr.Code, http.StatusNoContent)
		}
	})
}

func TestSetTokenBlacklist_GivenCustomBlacklist_WhenSet_ThenGetReturnsIt(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original) // restore after test

	custom := &inMemoryBlacklist{}
	SetTokenBlacklist(custom)

	got := GetTokenBlacklist()
	if got != custom {
		t.Fatal("GetTokenBlacklist() did not return the custom blacklist set via SetTokenBlacklist()")
	}
}

func TestInMemoryBlacklist_Revoke_GivenToken_WhenRevoked_ThenIsRevokedReturnsTrue(t *testing.T) {
	bl := &inMemoryBlacklist{}
	ctx := context.Background()
	tokenHash := "abc123hash"

	revoked, rErr := bl.IsRevoked(ctx, tokenHash)
	if rErr != nil {
		t.Fatalf("IsRevoked() unexpected error = %v", rErr)
	}
	if revoked {
		t.Fatal("token should not be revoked before calling Revoke()")
	}

	err := bl.Revoke(ctx, tokenHash, time.Now().Add(time.Hour))
	if err != nil {
		t.Fatalf("Revoke() error = %v", err)
	}

	revoked2, rErr2 := bl.IsRevoked(ctx, tokenHash)
	if rErr2 != nil {
		t.Fatalf("IsRevoked() unexpected error after Revoke = %v", rErr2)
	}
	if !revoked2 {
		t.Fatal("token should be revoked after calling Revoke()")
	}
}

func TestInMemoryBlacklist_IsRevoked_GivenUnknownToken_ThenReturnsFalse(t *testing.T) {
	bl := &inMemoryBlacklist{}
	revoked, err := bl.IsRevoked(context.Background(), "never-revoked")
	if err != nil {
		t.Fatalf("IsRevoked() unexpected error = %v", err)
	}
	if revoked {
		t.Fatal("unknown token should not be revoked")
	}
}

func TestAuthMiddleware_GivenRevokedToken_WhenRequest_ThenUnauthorized(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-revoke", 1)
	userID := uuid.New()
	email := "revoked@test.dev"
	tokens, err := authService.GenerateTokenPair(userID, email)
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	// Revoke the token
	bl := &inMemoryBlacklist{}
	tokenHash := sha256Hex(tokens.AccessToken)
	_ = bl.Revoke(context.Background(), tokenHash, time.Now().Add(time.Hour))
	SetTokenBlacklist(bl)

	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler should not be called for revoked token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", rr.Code, http.StatusUnauthorized)
	}
	if !strings.Contains(rr.Body.String(), "Token has been revoked") {
		t.Fatalf("body = %q, expected to contain 'Token has been revoked'", rr.Body.String())
	}
}

func TestContextGettersWithMissingValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	if got := GetUserID(req.Context()); got != uuid.Nil {
		t.Fatalf("GetUserID() = %v, want uuid.Nil", got)
	}
	if got := GetUserEmail(req.Context()); got != "" {
		t.Fatalf("GetUserEmail() = %q, want empty string", got)
	}
}

// A3: blacklist returns error → middleware must respond 503, not forward.
func TestAuthMiddleware_GivenBlacklistError_WhenRequest_Then503(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-err", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "err@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	SetTokenBlacklist(&errBlacklist{})

	nextCalled := false
	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d (503)", rr.Code, http.StatusServiceUnavailable)
	}
	if nextCalled {
		t.Fatal("next handler must not be called when blacklist returns error")
	}
	var payload map[string]string
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("response must be valid JSON: %v", err)
	}
	if payload["error"] == "" {
		t.Fatal("response must contain non-empty error field")
	}
}

// A3: blacklist returns (true, nil) → 401 as before.
func TestAuthMiddleware_GivenRevokedToken_WhenBlacklistReturnsTrue_Then401(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-revoked2", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "revoked2@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	bl := &inMemoryBlacklist{}
	_ = bl.Revoke(context.Background(), sha256Hex(tokens.AccessToken), time.Now().Add(time.Hour))
	SetTokenBlacklist(bl)

	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("next handler must not be called for revoked token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
}

// A3: blacklist returns (false, nil) → request passes through.
func TestAuthMiddleware_GivenValidToken_WhenBlacklistReturnsFalse_ThenForwards(t *testing.T) {
	original := GetTokenBlacklist()
	defer SetTokenBlacklist(original)

	authService := services.NewAuthService("test-secret-pass", 1)
	userID := uuid.New()
	tokens, err := authService.GenerateTokenPair(userID, "pass@test.dev")
	if err != nil {
		t.Fatalf("GenerateTokenPair() error = %v", err)
	}

	SetTokenBlacklist(&inMemoryBlacklist{}) // fresh, no entries

	nextCalled := false
	handler := Auth(authService)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rr.Code)
	}
	if !nextCalled {
		t.Fatal("next handler must be called for valid non-revoked token")
	}
}

func TestParsePlatform(t *testing.T) {
	tests := []struct {
		name       string
		headers    map[string]string
		userAgent  string
		expected   string
	}{
		{
			name:     "GivenXPlatformHeaderWeb_ThenWeb",
			headers:  map[string]string{"X-Client-Platform": "web"},
			expected: "web",
		},
		{
			name:     "GivenXPlatformHeaderIOS_ThenIOS",
			headers:  map[string]string{"X-Client-Platform": "ios"},
			expected: "ios",
		},
		{
			name:     "GivenXPlatformHeaderAndroid_ThenAndroid",
			headers:  map[string]string{"X-Client-Platform": "android"},
			expected: "android",
		},
		{
			name:     "GivenXPlatformHeaderUppercase_ThenLowercase",
			headers:  map[string]string{"X-Client-Platform": "iOS"},
			expected: "ios",
		},
		{
			name:     "GivenXPlatformHeaderInvalid_ThenUnknown",
			headers:  map[string]string{"X-Client-Platform": "nintendo-switch"},
			expected: "unknown",
		},
		{
			name:      "GivenUserAgentIPhone_ThenIOS",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
			expected:  "ios",
		},
		{
			name:      "GivenUserAgentAndroidPhone_ThenAndroid",
			userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
			expected:  "android",
		},
		{
			name:      "GivenUserAgentDartIOS_ThenIOS",
			userAgent: "Dart/3.0 (dart:io) - iOS Client",
			expected:  "ios",
		},
		{
			name:      "GivenUserAgentDartAndroid_ThenAndroid",
			userAgent: "Dart/3.0 (dart:io) - Android Client",
			expected:  "android",
		},
		{
			name:      "GivenUserAgentWebMozilla_ThenWeb",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
			expected:  "web",
		},
		{
			name:      "GivenUserAgentUnknown_ThenUnknown",
			userAgent: "MyCustomAppBot/1.0",
			expected:  "unknown",
		},
		{
			name:     "GivenNoHeadersOrUA_ThenUnknown",
			expected: "unknown",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodGet, "/api/test", nil)
			if err != nil {
				t.Fatalf("failed to create request: %v", err)
			}
			for k, v := range tc.headers {
				req.Header.Set(k, v)
			}
			if tc.userAgent != "" {
				req.Header.Set("User-Agent", tc.userAgent)
			}

			got := ParsePlatform(req)
			if got != tc.expected {
				t.Errorf("ParsePlatform() = %q, want %q", got, tc.expected)
			}
		})
	}
}

func TestActivityBufferConcurrency(t *testing.T) {
	buf := &ActivityBuffer{
		data: make(map[uuid.UUID]map[string]int),
	}

	userID := uuid.New()
	userID2 := uuid.New()
	platforms := []string{"web", "ios", "android"}

	const goroutines = 50
	const incrementsPerGoroutine = 100

	var wg sync.WaitGroup
	wg.Add(goroutines)

	for i := 0; i < goroutines; i++ {
		go func(gIdx int) {
			defer wg.Done()
			u := userID
			if gIdx%2 == 0 {
				u = userID2
			}
			plat := platforms[gIdx%len(platforms)]

			for j := 0; j < incrementsPerGoroutine; j++ {
				buf.Increment(u, plat)
			}
		}(i)
	}

	wg.Wait()

	buf.mu.Lock()
	defer buf.mu.Unlock()

	totalRecorded := 0
	for _, plats := range buf.data {
		for _, count := range plats {
			totalRecorded += count
		}
	}

	expectedTotal := goroutines * incrementsPerGoroutine
	if totalRecorded != expectedTotal {
		t.Fatalf("concurrency count mismatch: recorded %d, want %d", totalRecorded, expectedTotal)
	}
}

type mockPlatformRepo struct {
	records []models.UserPlatform
	mu      sync.Mutex
}

func (m *mockPlatformRepo) UpsertUserPlatforms(ctx context.Context, records []models.UserPlatform) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.records = append(m.records, records...)
	return nil
}

func TestActivityWorkerFlush(t *testing.T) {
	buf := &ActivityBuffer{
		data: make(map[uuid.UUID]map[string]int),
	}

	userID := uuid.New()
	buf.Increment(userID, "ios")
	buf.Increment(userID, "ios")
	buf.Increment(userID, "web")

	repo := &mockPlatformRepo{}

	dataToFlush := buf.Flush()
	if len(dataToFlush) != 1 {
		t.Fatalf("expected 1 user in swap data, got %d", len(dataToFlush))
	}

	var records []models.UserPlatform
	for uID, plats := range dataToFlush {
		for plat, count := range plats {
			records = append(records, models.UserPlatform{
				UserID:           uID,
				Platform:         plat,
				InteractionCount: count,
				LastUsedAt:       time.Now(),
			})
		}
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 records (ios and web), got %d", len(records))
	}

	err := repo.UpsertUserPlatforms(context.Background(), records)
	if err != nil {
		t.Fatalf("failed to upsert: %v", err)
	}

	if len(repo.records) != 2 {
		t.Fatalf("expected 2 records flushed to database, got %d", len(repo.records))
	}

	var iosCount, webCount int
	for _, r := range repo.records {
		if r.Platform == "ios" {
			iosCount = r.InteractionCount
		} else if r.Platform == "web" {
			webCount = r.InteractionCount
		}
	}

	if iosCount != 2 || webCount != 1 {
		t.Fatalf("counts mismatch: ios=%d (want 2), web=%d (want 1)", iosCount, webCount)
	}
}

