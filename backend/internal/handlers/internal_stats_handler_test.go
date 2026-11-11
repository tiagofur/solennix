package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestInternalStatsHandler(t *testing.T) {
	calls := 0
	load := func(ctx context.Context) (*InternalStats, error) {
		calls++
		s := &InternalStats{}
		s.Users.Total = 7
		return s, nil
	}
	h := NewInternalStatsHandler("secret", load)
	srv := WithInternalStats(http.NotFoundHandler(), h)

	do := func(method, auth string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/internal/stats", nil)
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, req)
		return rec
	}

	if c := do(http.MethodGet, "").Code; c != http.StatusUnauthorized {
		t.Fatalf("no token: got %d", c)
	}
	if c := do(http.MethodGet, "Bearer wrong").Code; c != http.StatusUnauthorized {
		t.Fatalf("wrong token: got %d", c)
	}
	if calls != 0 {
		t.Fatalf("loader must not run for unauthorized requests")
	}

	rec := do(http.MethodGet, "Bearer secret")
	if rec.Code != http.StatusOK {
		t.Fatalf("valid token: got %d", rec.Code)
	}
	var body map[string]map[string]int
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["users"]["total"] != 7 {
		t.Fatalf("unexpected body: %s", rec.Body.String())
	}
	for _, k := range []string{"users", "events", "clients", "products", "quotes"} {
		if _, ok := body[k]; !ok {
			t.Fatalf("missing key %q", k)
		}
	}

	do(http.MethodGet, "Bearer secret")
	if calls != 1 {
		t.Fatalf("expected cached second call, loader calls = %d", calls)
	}
	if c := do(http.MethodPost, "Bearer secret").Code; c != http.StatusMethodNotAllowed {
		t.Fatalf("POST: got %d", c)
	}
}

func TestInternalStatsHandlerDisabledWithoutToken(t *testing.T) {
	h := NewInternalStatsHandler("", func(context.Context) (*InternalStats, error) {
		t.Fatal("loader must not run")
		return nil, nil
	})
	for _, auth := range []string{"", "Bearer ", "Bearer anything"} {
		req := httptest.NewRequest(http.MethodGet, "/internal/stats", nil)
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("auth %q: got %d, want 404", auth, rec.Code)
		}
	}
}
