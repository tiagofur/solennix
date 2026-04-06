package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCSRF(t *testing.T) {
	tests := []struct {
		name           string
		method         string
		authHeader     string
		path           string
		cookieValue    string // csrf_token cookie
		headerToken    string // X-CSRF-Token header
		authCookie     bool   // whether to include auth_token cookie (simulates web session)
		wantStatus     int
		wantNextCalled bool
		wantCookie     bool // expect csrf_token cookie in response
	}{
		{
			name:           "GivenGETRequest_WhenNoCookie_ThenPassAndSetCookie",
			method:         http.MethodGet,
			path:           "/api/v1/events",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     true,
		},
		{
			name:           "GivenGETRequest_WhenCookieExists_ThenPassWithoutNewCookie",
			method:         http.MethodGet,
			path:           "/api/v1/events",
			cookieValue:    "existing-token",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithBearerAuth_WhenNoCSRFToken_ThenSkipCheck",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			authHeader:     "Bearer some-jwt-token",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithValidCSRF_WhenCookieMatchesHeader_ThenPass",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			authCookie:     true,
			cookieValue:    "valid-csrf-token",
			headerToken:    "valid-csrf-token",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithNoCookie_WhenNoCSRFToken_ThenReturn403",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			authCookie:     true,
			wantStatus:     http.StatusForbidden,
			wantNextCalled: false,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithMismatchedCSRF_WhenHeaderDiffers_ThenReturn403",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			authCookie:     true,
			cookieValue:    "real-token",
			headerToken:    "wrong-token",
			wantStatus:     http.StatusForbidden,
			wantNextCalled: false,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithCookieButNoHeader_WhenHeaderEmpty_ThenReturn403",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			authCookie:     true,
			cookieValue:    "real-token",
			headerToken:    "",
			wantStatus:     http.StatusForbidden,
			wantNextCalled: false,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTWithNoSession_WhenNoAuthCookie_ThenSkipCSRF",
			method:         http.MethodPost,
			path:           "/api/v1/events",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenPOSTToWebhook_WhenNoCSRFToken_ThenSkipCheck",
			method:         http.MethodPost,
			path:           "/api/v1/subscriptions/webhook/stripe",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenDELETEWithValidCSRF_WhenCookieMatchesHeader_ThenPass",
			method:         http.MethodDelete,
			path:           "/api/v1/events/123",
			authCookie:     true,
			cookieValue:    "delete-token",
			headerToken:    "delete-token",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     false,
		},
		{
			name:           "GivenPUTWithNoCSRF_WhenSessionExists_ThenReturn403",
			method:         http.MethodPut,
			path:           "/api/v1/events/123",
			authCookie:     true,
			wantStatus:     http.StatusForbidden,
			wantNextCalled: false,
			wantCookie:     false,
		},
		{
			name:           "GivenHEADRequest_WhenNoCookie_ThenPassAndSetCookie",
			method:         http.MethodHead,
			path:           "/api/v1/events",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     true,
		},
		{
			name:           "GivenOPTIONSRequest_WhenNoCookie_ThenPassAndSetCookie",
			method:         http.MethodOptions,
			path:           "/api/v1/events",
			wantStatus:     http.StatusAccepted,
			wantNextCalled: true,
			wantCookie:     true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusAccepted)
			})
			handler := CSRF(next)

			req := httptest.NewRequest(tc.method, tc.path, nil)

			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			if tc.authCookie {
				req.AddCookie(&http.Cookie{Name: "auth_token", Value: "some-jwt"})
			}
			if tc.cookieValue != "" {
				req.AddCookie(&http.Cookie{Name: "csrf_token", Value: tc.cookieValue})
			}
			if tc.headerToken != "" {
				req.Header.Set("X-CSRF-Token", tc.headerToken)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rr.Code, tc.wantStatus)
			}
			if nextCalled != tc.wantNextCalled {
				t.Fatalf("nextCalled = %v, want %v", nextCalled, tc.wantNextCalled)
			}

			// Check if csrf_token cookie was set in response
			var foundCookie bool
			for _, c := range rr.Result().Cookies() {
				if c.Name == "csrf_token" {
					foundCookie = true
					if c.HttpOnly {
						t.Fatal("csrf_token cookie must NOT be HttpOnly")
					}
					if c.SameSite != http.SameSiteStrictMode {
						t.Fatalf("csrf_token SameSite = %v, want Strict", c.SameSite)
					}
					if len(c.Value) != 64 {
						t.Fatalf("csrf_token length = %d, want 64 hex chars", len(c.Value))
					}
				}
			}
			if foundCookie != tc.wantCookie {
				t.Fatalf("csrf_token cookie set = %v, want %v", foundCookie, tc.wantCookie)
			}
		})
	}
}

func TestIsWebhookPath(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/api/v1/subscriptions/webhook/stripe", true},
		{"/api/v1/subscriptions/webhook/revenuecat", true},
		{"/api/v1/events", false},
		{"/api/v1/clients", false},
	}

	for _, tc := range tests {
		if got := isWebhookPath(tc.path); got != tc.want {
			t.Errorf("isWebhookPath(%q) = %v, want %v", tc.path, got, tc.want)
		}
	}
}

func TestGenerateCSRFToken(t *testing.T) {
	token1 := generateCSRFToken()
	token2 := generateCSRFToken()

	if len(token1) != 64 {
		t.Fatalf("token length = %d, want 64", len(token1))
	}
	if token1 == token2 {
		t.Fatal("two generated tokens should not be identical")
	}
}
