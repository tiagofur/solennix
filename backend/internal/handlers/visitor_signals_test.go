package handlers

import (
	"net/http"
	"testing"
)

func TestClassifyDeviceClass(t *testing.T) {
	cases := map[string]string{
		"": "unknown",
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)": "ios",
		"Mozilla/5.0 (Linux; Android 14) AppleWebKit":            "android",
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120":   "desktop",
		"Mozilla/5.0 (Linux; Mobile) Firefox":                    "mobile",
		"Googlebot/2.1 (+http://www.google.com/bot.html)":        "bot",
		"curl/8.0": "bot",
	}
	for ua, want := range cases {
		if got := ClassifyDeviceClass(ua); got != want {
			t.Fatalf("ClassifyDeviceClass(%q)=%q want %q", ua, got, want)
		}
	}
}

func TestCoarseCountryCode(t *testing.T) {
	req, _ := http.NewRequest(http.MethodGet, "/", nil)
	if got := CoarseCountryCode(req); got != "" {
		t.Fatalf("empty headers → %q", got)
	}
	req.Header.Set("CF-IPCountry", "mx")
	if got := CoarseCountryCode(req); got != "MX" {
		t.Fatalf("CF-IPCountry mx → %q", got)
	}
	req.Header.Set("CF-IPCountry", "XX")
	if got := CoarseCountryCode(req); got != "" {
		t.Fatalf("XX should be empty, got %q", got)
	}
}

func TestNormalizeMarketingPageKey(t *testing.T) {
	if got := NormalizeMarketingPageKey("Landing"); got != "landing" {
		t.Fatalf("got %q", got)
	}
	if got := NormalizeMarketingPageKey("/pricing"); got != "pricing" {
		t.Fatalf("got %q", got)
	}
	if got := NormalizeMarketingPageKey("!!!"); got != "other" {
		t.Fatalf("got %q", got)
	}
}
