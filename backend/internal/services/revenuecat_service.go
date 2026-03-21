package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// RevenueCatService wraps the RevenueCat REST API v1 for server-to-server calls.
// Used to sync Stripe (web) purchases to RevenueCat so mobile apps see the entitlement.
type RevenueCatService struct {
	apiKey     string
	httpClient *http.Client
}

// NewRevenueCatService creates a new RevenueCat service. If apiKey is empty,
// all methods become no-ops (graceful degradation when RC is not configured).
func NewRevenueCatService(apiKey string) *RevenueCatService {
	return &RevenueCatService{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// IsConfigured returns true if the service has a valid API key.
func (s *RevenueCatService) IsConfigured() bool {
	return s.apiKey != ""
}

// GrantPromotionalEntitlement grants a promotional entitlement to a subscriber.
// This is used to sync Stripe web purchases to RevenueCat so mobile apps see the entitlement.
// duration: "daily", "three_day", "weekly", "monthly", "two_month", "three_month",
// "six_month", "yearly", "lifetime"
func (s *RevenueCatService) GrantPromotionalEntitlement(ctx context.Context, appUserID, entitlementID, duration string) error {
	if !s.IsConfigured() {
		slog.Debug("RevenueCat not configured, skipping entitlement grant", "app_user_id", appUserID)
		return nil
	}

	url := fmt.Sprintf("https://api.revenuecat.com/v1/subscribers/%s/entitlements/%s/promotional", appUserID, entitlementID)

	body := map[string]string{
		"duration": duration,
	}
	bodyJSON, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal grant body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyJSON))
	if err != nil {
		return fmt.Errorf("create grant request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Platform", "stripe")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("grant entitlement request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		slog.Error("RevenueCat grant entitlement failed",
			"status", resp.StatusCode,
			"body", string(respBody),
			"app_user_id", appUserID,
			"entitlement", entitlementID,
		)
		return fmt.Errorf("grant entitlement failed: status %d", resp.StatusCode)
	}

	slog.Info("RevenueCat entitlement granted",
		"app_user_id", appUserID,
		"entitlement", entitlementID,
		"duration", duration,
	)
	return nil
}

// RevokePromotionalEntitlement revokes all promotional entitlements for a subscriber.
// Used when a Stripe subscription is canceled/deleted.
func (s *RevenueCatService) RevokePromotionalEntitlement(ctx context.Context, appUserID, entitlementID string) error {
	if !s.IsConfigured() {
		slog.Debug("RevenueCat not configured, skipping entitlement revoke", "app_user_id", appUserID)
		return nil
	}

	url := fmt.Sprintf("https://api.revenuecat.com/v1/subscribers/%s/entitlements/%s/revoke_promotionals", appUserID, entitlementID)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return fmt.Errorf("create revoke request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("revoke entitlement request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		slog.Error("RevenueCat revoke entitlement failed",
			"status", resp.StatusCode,
			"body", string(respBody),
			"app_user_id", appUserID,
			"entitlement", entitlementID,
		)
		return fmt.Errorf("revoke entitlement failed: status %d", resp.StatusCode)
	}

	slog.Info("RevenueCat entitlement revoked",
		"app_user_id", appUserID,
		"entitlement", entitlementID,
	)
	return nil
}
