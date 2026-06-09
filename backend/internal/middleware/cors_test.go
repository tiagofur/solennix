package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	tests := []struct {
		name            string
		origin          string
		method          string
		wantStatus      int
		wantAllowOrigin string
		wantNextCalled  bool
		wantVaryOrigin  bool // expect Vary: Origin when a dynamic origin is echoed
	}{
		{
			name:            "GivenAllowedOrigin_WhenGet_ThenSetAllowOrigin",
			origin:          "http://allowed.com",
			method:          http.MethodGet,
			wantStatus:      http.StatusAccepted,
			wantAllowOrigin: "http://allowed.com",
			wantNextCalled:  true,
			wantVaryOrigin:  true,
		},
		{
			name:            "GivenDisallowedOrigin_WhenGet_ThenDoNotSetAllowOrigin",
			origin:          "http://blocked.com",
			method:          http.MethodGet,
			wantStatus:      http.StatusAccepted,
			wantAllowOrigin: "",
			wantNextCalled:  true,
			wantVaryOrigin:  false,
		},
		{
			name:            "GivenOptionsRequest_WhenRequest_ThenReturnNoContent",
			origin:          "http://allowed.com",
			method:          http.MethodOptions,
			wantStatus:      http.StatusNoContent,
			wantAllowOrigin: "http://allowed.com",
			wantNextCalled:  false,
			wantVaryOrigin:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusAccepted)
			})
			handler := CORS([]string{"http://allowed.com"})(next)

			req := httptest.NewRequest(tc.method, "/api/test", nil)
			req.Header.Set("Origin", tc.origin)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", rr.Code, tc.wantStatus)
			}
			if got := rr.Header().Get("Access-Control-Allow-Origin"); got != tc.wantAllowOrigin {
				t.Fatalf("Access-Control-Allow-Origin = %q, want %q", got, tc.wantAllowOrigin)
			}
			if got := rr.Header().Get("Access-Control-Allow-Methods"); got == "" {
				t.Fatalf("Access-Control-Allow-Methods should be set")
			}
			if nextCalled != tc.wantNextCalled {
				t.Fatalf("nextCalled = %v, want %v", nextCalled, tc.wantNextCalled)
			}

			// M6: Vary: Origin must be present whenever a dynamic origin is echoed.
			vary := rr.Header().Get("Vary")
			hasVaryOrigin := vary == "Origin" || len(vary) > 0 && containsVaryOrigin(vary)
			if hasVaryOrigin != tc.wantVaryOrigin {
				t.Fatalf("Vary: Origin present = %v, want %v (Vary header: %q)", hasVaryOrigin, tc.wantVaryOrigin, vary)
			}
		})
	}
}

// containsVaryOrigin reports whether a Vary header value includes "Origin".
func containsVaryOrigin(vary string) bool {
	for _, v := range splitVary(vary) {
		if v == "Origin" {
			return true
		}
	}
	return false
}

func splitVary(vary string) []string {
	var parts []string
	for _, p := range splitComma(vary) {
		if t := trimSpace(p); t != "" {
			parts = append(parts, t)
		}
	}
	return parts
}

func splitComma(s string) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

func trimSpace(s string) string {
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
