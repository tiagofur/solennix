package services

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestGeocode_HappyPath_ParsesCoords(t *testing.T) {
	var ua string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua = r.Header.Get("User-Agent")
		q := r.URL.Query().Get("q")
		if q != "mexico city, mexico" {
			t.Fatalf("query = %q, want 'mexico city, mexico'", q)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"lat":"19.4326","lon":"-99.1332"}]`))
	}))
	defer srv.Close()

	svc := NewGeocodingService(srv.URL, "TestAgent/1.0")
	lat, lng, err := svc.Geocode(context.Background(), "Mexico City", "Mexico")
	if err != nil {
		t.Fatalf("Geocode error = %v", err)
	}
	if lat < 19.43 || lat > 19.44 {
		t.Fatalf("lat = %v, want ~19.4326", lat)
	}
	if lng < -99.14 || lng > -99.13 {
		t.Fatalf("lng = %v, want ~-99.1332", lng)
	}
	if ua != "TestAgent/1.0" {
		t.Fatalf("User-Agent = %q, want TestAgent/1.0", ua)
	}
}

func TestGeocode_CacheHit_NoSecondRequest(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[{"lat":"19.4326","lon":"-99.1332"}]`))
	}))
	defer srv.Close()

	svc := NewGeocodingService(srv.URL, "TestAgent/1.0")
	_, _, _ = svc.Geocode(context.Background(), "Mexico City", "Mexico")
	_, _, _ = svc.Geocode(context.Background(), "Mexico City", "Mexico")

	if n := atomic.LoadInt32(&calls); n != 1 {
		t.Fatalf("HTTP calls = %d, want 1 (cache hit on second)", n)
	}
}

func TestGeocode_Timeout_GracefulNil(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second) // exceeds timeout
		_, _ = w.Write([]byte(`[{"lat":"1","lon":"1"}]`))
	}))
	defer srv.Close()

	svc := NewGeocodingService(srv.URL, "TestAgent/1.0")
	// Override timeout to 100ms for fast test.
	svc.client = &http.Client{Timeout: 100 * time.Millisecond}

	lat, lng, err := svc.Geocode(context.Background(), "Slow City", "Slowland")
	if err != nil {
		t.Fatalf("timeout should return nil error, got %v", err)
	}
	if lat != 0 || lng != 0 {
		t.Fatalf("timeout coords = (%v,%v), want (0,0)", lat, lng)
	}
}

func TestGeocode_429_GracefulNil(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	svc := NewGeocodingService(srv.URL, "TestAgent/1.0")
	lat, lng, err := svc.Geocode(context.Background(), "Mexico City", "Mexico")
	if err != nil {
		t.Fatalf("429 should return nil error, got %v", err)
	}
	if lat != 0 || lng != 0 {
		t.Fatalf("429 coords = (%v,%v), want (0,0)", lat, lng)
	}
}

func TestGeocode_EmptyQuery_ReturnsZero(t *testing.T) {
	svc := NewGeocodingService("http://unused", "TestAgent/1.0")
	lat, lng, err := svc.Geocode(context.Background(), "", "")
	if err != nil || lat != 0 || lng != 0 {
		t.Fatalf("empty query should return (0,0,nil), got (%v,%v,%v)", lat, lng, err)
	}
}

func TestGeocode_NoResults_CachesNotFound(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`[]`))
	}))
	defer srv.Close()

	svc := NewGeocodingService(srv.URL, "TestAgent/1.0")
	_, _, _ = svc.Geocode(context.Background(), "Ghost Town", "Nowhere")
	_, _, _ = svc.Geocode(context.Background(), "Ghost Town", "Nowhere")

	if n := atomic.LoadInt32(&calls); n != 1 {
		t.Fatalf("no-result should cache; calls = %d, want 1", n)
	}
}

func TestNormalizeQuery(t *testing.T) {
	cases := []struct {
		city, country, want string
	}{
		{"Mexico City", "Mexico", "mexico city, mexico"},
		{"  Paris ", "", "paris"},
		{"", "Brazil", "brazil"},
		{"", "", ""},
	}
	for _, tc := range cases {
		got := normalizeQuery(tc.city, tc.country)
		if got != tc.want {
			t.Errorf("normalizeQuery(%q,%q) = %q, want %q", tc.city, tc.country, got, tc.want)
		}
	}
}
