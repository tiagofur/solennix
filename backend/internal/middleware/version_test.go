package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestAPIVersion(t *testing.T) {
	handler := APIVersion("v1")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	if v := rr.Header().Get("X-API-Version"); v != "v1" {
		t.Errorf("expected X-API-Version header %q, got %q", "v1", v)
	}
}

func TestAPIVersionDifferentVersions(t *testing.T) {
	tests := []struct {
		version string
	}{
		{"v1"},
		{"v2"},
		{"v3-beta"},
	}

	for _, tt := range tests {
		t.Run(tt.version, func(t *testing.T) {
			handler := APIVersion(tt.version)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			}))

			req := httptest.NewRequest("GET", "/test", nil)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			if v := rr.Header().Get("X-API-Version"); v != tt.version {
				t.Errorf("expected X-API-Version %q, got %q", tt.version, v)
			}
		})
	}
}

func TestDeprecate(t *testing.T) {
	sunsetTime := time.Date(2026, time.September, 30, 0, 0, 0, 0, time.UTC)
	policyURL := "https://example.com/deprecation-policy"

	handler := Deprecate(sunsetTime, policyURL)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if deprecation := rr.Header().Get("Deprecation"); deprecation != "true" {
		t.Errorf("expected Deprecation header 'true', got %q", deprecation)
	}

	expectedSunset := sunsetTime.UTC().Format(time.RFC1123)
	if sunset := rr.Header().Get("Sunset"); sunset != expectedSunset {
		t.Errorf("expected Sunset header %q, got %q", expectedSunset, sunset)
	}

	expectedLink := "<https://example.com/deprecation-policy>; rel=\"deprecation\""
	if link := rr.Header().Get("Link"); link != expectedLink {
		t.Errorf("expected Link header %q, got %q", expectedLink, link)
	}
}
