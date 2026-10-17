package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// turnstileVerifyURL is a package var (not const) so tests can point it at a
// local httptest server.
var turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type turnstileVerifyResponse struct {
	Success bool `json:"success"`
}

// verifyTurnstileToken validates a Cloudflare Turnstile client token against
// the siteverify API. An empty secret means verification is skipped (dev
// mode: no TURNSTILE_SECRET_KEY configured). A configured secret requires a
// non-empty token that Cloudflare accepts; anything else is an error.
func verifyTurnstileToken(ctx context.Context, secret, token, remoteIP string) error {
	if strings.TrimSpace(secret) == "" {
		return nil
	}
	if strings.TrimSpace(token) == "" {
		return fmt.Errorf("turnstile token required")
	}

	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", token)
	if strings.TrimSpace(remoteIP) != "" {
		form.Set("remoteip", strings.TrimSpace(remoteIP))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, turnstileVerifyURL, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("turnstile request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("turnstile verify: %w", err)
	}
	defer resp.Body.Close()

	var out turnstileVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return fmt.Errorf("turnstile response: %w", err)
	}
	if !out.Success {
		return fmt.Errorf("turnstile verification failed")
	}
	return nil
}
