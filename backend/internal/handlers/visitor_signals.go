package handlers

import (
	"net/http"
	"strings"
)

// ClassifyDeviceClass maps User-Agent to a coarse, privacy-safe device bucket.
// Values: ios | android | desktop | mobile | bot | unknown
func ClassifyDeviceClass(userAgent string) string {
	ua := strings.ToLower(strings.TrimSpace(userAgent))
	if ua == "" {
		return "unknown"
	}
	botHints := []string{
		"bot", "spider", "crawler", "slurp", "bingpreview", "facebookexternalhit",
		"headless", "phantom", "selenium", "curl/", "wget/", "python-requests",
	}
	for _, h := range botHints {
		if strings.Contains(ua, h) {
			return "bot"
		}
	}
	if strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad") || strings.Contains(ua, "ipod") ||
		(strings.Contains(ua, "ios") && strings.Contains(ua, "mobile")) ||
		strings.Contains(ua, "cfnetwork") {
		return "ios"
	}
	if strings.Contains(ua, "android") {
		return "android"
	}
	if strings.Contains(ua, "mobile") || strings.Contains(ua, "opera mini") {
		return "mobile"
	}
	if strings.Contains(ua, "windows") || strings.Contains(ua, "macintosh") ||
		strings.Contains(ua, "linux") || strings.Contains(ua, "x11") ||
		strings.Contains(ua, "chrome") || strings.Contains(ua, "firefox") ||
		strings.Contains(ua, "safari") {
		return "desktop"
	}
	return "unknown"
}

// CoarseCountryCode returns a 2-letter country from edge proxy headers only.
func CoarseCountryCode(r *http.Request) string {
	candidates := []string{
		r.Header.Get("CF-IPCountry"),
		r.Header.Get("CloudFront-Viewer-Country"),
		r.Header.Get("X-Country-Code"),
		r.Header.Get("X-AppEngine-Country"),
	}
	for _, c := range candidates {
		c = strings.ToUpper(strings.TrimSpace(c))
		if len(c) == 2 && c != "XX" && c != "T1" {
			if c[0] >= 'A' && c[0] <= 'Z' && c[1] >= 'A' && c[1] <= 'Z' {
				return c
			}
		}
	}
	return ""
}

// NormalizeFunnelStep maps funnel step names to the allowlist.
// Returns empty string when unknown (caller decides whether to drop the event).
func NormalizeFunnelStep(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	switch s {
	case "register_view", "registered", "email_verified", "first_login":
		return s
	default:
		return ""
	}
}

// NormalizeFunnelMethod maps registration method to a small allowlist.
func NormalizeFunnelMethod(raw string) string {
	m := strings.ToLower(strings.TrimSpace(raw))
	switch m {
	case "email", "google", "apple":
		return m
	default:
		return "unknown"
	}
}

// NormalizeMarketingPageKey maps client page keys to a small allowlist.
func NormalizeMarketingPageKey(raw string) string {
	k := strings.ToLower(strings.TrimSpace(raw))
	switch k {
	case "landing", "home", "/":
		return "landing"
	case "pricing", "price", "/pricing":
		return "pricing"
	case "about", "/about":
		return "about"
	case "proveedores", "directory", "/proveedores":
		return "directory"
	default:
		if k == "" {
			return "landing"
		}
		if len(k) > 40 {
			k = k[:40]
		}
		var b strings.Builder
		for _, r := range k {
			if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
				b.WriteRune(r)
			}
		}
		if b.Len() == 0 {
			return "other"
		}
		return b.String()
	}
}
