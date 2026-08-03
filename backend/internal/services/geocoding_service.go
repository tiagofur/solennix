package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// GeocodingService resolves a (city, country) string into approximate
// latitude/longitude via the Nominatim/OpenStreetMap public API (free, no key).
// Used by the public-profile upsert handler (#1127) to populate the geo columns
// that power directory geo-search (#1128).
//
// Policies honored:
//   - Nominatim usage policy requires an identifiable User-Agent.
//   - Rate limit ~1 req/s is respected via an in-memory cache (TTL 24h): the
//     same city/country query returns cached coords without a new request.
//   - Failures (timeout, 429, 5xx, parse) are graceful: the caller receives
//     (0, 0, nil) and a warning log — the profile save MUST NOT fail because
//     of an external free service.
type GeocodingService struct {
	client  *http.Client
	baseURL string
	// User-Agent per OSM Nominatim usage policy.
	userAgent string

	mu    sync.RWMutex
	cache map[string]cacheEntry
}

type cacheEntry struct {
	lat, lng float64
	expires  time.Time
}

const (
	nominatimDefaultURL   = "https://nominatim.openstreetmap.org"
	nominatimTimeout      = 3 * time.Second
	nominatimCacheTTL     = 24 * time.Hour
	nominatimDefaultAgent = "Solennix/1.0 (contact@solennix.app)"
)

// NewGeocodingService builds a service pointing at Nominatim (or a test double).
func NewGeocodingService(baseURL, userAgent string) *GeocodingService {
	if baseURL == "" {
		baseURL = nominatimDefaultURL
	}
	if userAgent == "" {
		userAgent = nominatimDefaultAgent
	}
	return &GeocodingService{
		client:    &http.Client{Timeout: nominatimTimeout},
		baseURL:   baseURL,
		userAgent: userAgent,
		cache:     make(map[string]cacheEntry),
	}
}

// Geocode resolves the approximate coordinates for a city+country.
// Returns (0, 0, nil) on any failure — callers should treat zero coords as
// "unknown" and persist nil lat/lng (the profile save continues).
func (g *GeocodingService) Geocode(ctx context.Context, city, country string) (lat, lng float64, err error) {
	q := normalizeQuery(city, country)
	if q == "" {
		return 0, 0, nil
	}

	// Cache hit?
	if entry, ok := g.cacheGet(q); ok {
		return entry.lat, entry.lng, nil
	}

	// Build Nominatim search request.
	params := url.Values{}
	params.Set("q", q)
	params.Set("format", "json")
	params.Set("limit", "1")
	reqURL := g.baseURL + "/search?" + params.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		slog.Warn("geocoding: build request failed", "query", q, "error", err)
		return 0, 0, nil // graceful
	}
	req.Header.Set("User-Agent", g.userAgent)
	req.Header.Set("Accept", "application/json")

	resp, err := g.client.Do(req)
	if err != nil {
		slog.Warn("geocoding: request failed (graceful skip)", "query", q, "error", err)
		return 0, 0, nil
	}
	defer resp.Body.Close()

	// 429 (rate limited) or 5xx → graceful skip, but DO NOT cache (retry next time).
	if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
		slog.Warn("geocoding: upstream rate-limited/error (graceful skip)",
			"query", q, "status", resp.StatusCode)
		return 0, 0, nil
	}
	if resp.StatusCode != http.StatusOK {
		slog.Warn("geocoding: unexpected status (graceful skip)",
			"query", q, "status", resp.StatusCode)
		return 0, 0, nil
	}

	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		slog.Warn("geocoding: decode failed (graceful skip)", "query", q, "error", err)
		return 0, 0, nil
	}
	if len(results) == 0 {
		// No match — cache the "not found" so we don't hammer Nominatim.
		g.cacheSet(q, 0, 0)
		return 0, 0, nil
	}

	lat, lng, perr := parseFloatPair(results[0].Lat, results[0].Lon)
	if perr != nil {
		slog.Warn("geocoding: parse coords failed (graceful skip)", "query", q, "error", perr)
		return 0, 0, nil
	}

	g.cacheSet(q, lat, lng)
	return lat, lng, nil
}

// --- cache helpers ---

func (g *GeocodingService) cacheKey(city, country string) string {
	return normalizeQuery(city, country)
}

func (g *GeocodingService) cacheGet(key string) (cacheEntry, bool) {
	g.mu.RLock()
	defer g.mu.RUnlock()
	e, ok := g.cache[key]
	if !ok || time.Now().After(e.expires) {
		return cacheEntry{}, false
	}
	return e, true
}

func (g *GeocodingService) cacheSet(key string, lat, lng float64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.cache[key] = cacheEntry{lat: lat, lng: lng, expires: time.Now().Add(nominatimCacheTTL)}
}

// --- helpers ---

func normalizeQuery(city, country string) string {
	c := trimAndLower(city)
	co := trimAndLower(country)
	switch {
	case c != "" && co != "":
		return c + ", " + co
	case c != "":
		return c
	case co != "":
		return co
	default:
		return ""
	}
}

func trimAndLower(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == ',') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == ',') {
		s = s[:len(s)-1]
	}
	// minimal ASCII lowercase (avoid unicode.ToLower for common input)
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 'a' - 'A'
		}
		b[i] = c
	}
	return string(b)
}

func parseFloatPair(latStr, lonStr string) (float64, float64, error) {
	lat, err := parseFloat(latStr)
	if err != nil {
		return 0, 0, fmt.Errorf("parse lat %q: %w", latStr, err)
	}
	lng, err := parseFloat(lonStr)
	if err != nil {
		return 0, 0, fmt.Errorf("parse lon %q: %w", lonStr, err)
	}
	if lat == 0 && lng == 0 {
		return 0, 0, fmt.Errorf("zero coords")
	}
	return lat, lng, nil
}

// parseFloat wraps strconv.ParseFloat to avoid importing strconv at the top
// if we want to keep the import list minimal (single use).
func parseFloat(s string) (float64, error) {
	var n float64
	var neg bool
	i := 0
	if i < len(s) && (s[i] == '-' || s[i] == '+') {
		neg = s[i] == '-'
		i++
	}
	digitsBeforeDot := -1
	for ; i < len(s); i++ {
		c := s[i]
		if c == '.' {
			if digitsBeforeDot >= 0 {
				return 0, fmt.Errorf("multiple dots")
			}
			digitsBeforeDot = 0
			continue
		}
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid char %q", c)
		}
		n = n*10 + float64(c-'0')
		if digitsBeforeDot >= 0 {
			digitsBeforeDot++
		}
	}
	for d := digitsBeforeDot; d > 0; d-- {
		n /= 10
	}
	if neg {
		n = -n
	}
	return n, nil
}
