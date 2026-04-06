package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/sideshow/apns2"
	"github.com/sideshow/apns2/payload"
	"github.com/sideshow/apns2/token"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/models"
	"google.golang.org/api/option"
)

// PushMessage represents a notification to send across platforms.
type PushMessage struct {
	Title string
	Body  string
	Data  map[string]string // Custom payload (event_id, type, etc.)
	Badge *int
}

// FailedToken records a token that failed to send.
type FailedToken struct {
	Token    string
	Platform string
	Reason   string
}

// PushService handles low-level push notification sending to FCM and APNs.
type PushService struct {
	fcmClient  *messaging.Client
	apnsClient *apns2.Client
	apnsTopic  string
	enabled    bool
}

// NewPushService creates a PushService. If credentials are not configured,
// returns a disabled service that logs instead of sending.
func NewPushService(cfg *config.Config) *PushService {
	ps := &PushService{apnsTopic: cfg.APNsBundleID}

	// Initialize FCM
	if cfg.FCMCredentialsJSON != "" {
		app, err := firebase.NewApp(context.Background(), nil,
			option.WithCredentialsJSON([]byte(cfg.FCMCredentialsJSON)))
		if err != nil {
			slog.Error("Failed to initialize Firebase app", "error", err)
		} else {
			client, err := app.Messaging(context.Background())
			if err != nil {
				slog.Error("Failed to initialize FCM client", "error", err)
			} else {
				ps.fcmClient = client
				slog.Info("FCM push service initialized")
			}
		}
	}

	// Initialize APNs
	if cfg.APNsKeyPath != "" && cfg.APNsKeyID != "" && cfg.APNsTeamID != "" {
		authKey, err := token.AuthKeyFromFile(cfg.APNsKeyPath)
		if err != nil {
			slog.Error("Failed to load APNs auth key", "error", err)
		} else {
			apnsToken := &token.Token{
				AuthKey: authKey,
				KeyID:   cfg.APNsKeyID,
				TeamID:  cfg.APNsTeamID,
			}
			if cfg.APNsProduction {
				ps.apnsClient = apns2.NewTokenClient(apnsToken).Production()
			} else {
				ps.apnsClient = apns2.NewTokenClient(apnsToken).Development()
			}
			slog.Info("APNs push service initialized", "production", cfg.APNsProduction)
		}
	}

	ps.enabled = ps.fcmClient != nil || ps.apnsClient != nil
	if !ps.enabled {
		slog.Warn("Push service disabled: no FCM or APNs credentials configured")
	}

	return ps
}

// IsEnabled returns whether at least one push provider is configured.
func (s *PushService) IsEnabled() bool {
	return s.enabled
}

// SendToTokens sends a message to the given device tokens, routing by platform.
// Returns a list of tokens that failed (for cleanup).
func (s *PushService) SendToTokens(ctx context.Context, tokens []models.DeviceToken, msg PushMessage) []FailedToken {
	if !s.enabled {
		slog.Info("Push send skipped (disabled)", "title", msg.Title, "tokens", len(tokens))
		return nil
	}

	var failed []FailedToken

	// Group by platform
	var fcmTokens []models.DeviceToken
	var apnsTokens []models.DeviceToken
	for _, t := range tokens {
		switch t.Platform {
		case "ios":
			apnsTokens = append(apnsTokens, t)
		case "android", "web":
			fcmTokens = append(fcmTokens, t)
		default:
			slog.Warn("Unknown device platform", "platform", t.Platform, "token_id", t.ID)
		}
	}

	// Send FCM (Android + Web)
	if len(fcmTokens) > 0 && s.fcmClient != nil {
		failed = append(failed, s.sendFCMBatch(ctx, fcmTokens, msg)...)
	}

	// Send APNs (iOS)
	for _, t := range apnsTokens {
		if err := s.sendAPNs(ctx, t.Token, msg); err != nil {
			slog.Warn("APNs send failed", "token_id", t.ID, "error", err)
			failed = append(failed, FailedToken{Token: t.Token, Platform: "ios", Reason: err.Error()})
		}
	}

	slog.Info("Push send completed",
		"title", msg.Title,
		"total", len(tokens),
		"failed", len(failed),
	)
	return failed
}

func (s *PushService) sendFCMBatch(ctx context.Context, tokens []models.DeviceToken, msg PushMessage) []FailedToken {
	var failed []FailedToken

	// Build FCM messages for batch
	var messages []*messaging.Message
	for _, t := range tokens {
		m := &messaging.Message{
			Token: t.Token,
			Notification: &messaging.Notification{
				Title: msg.Title,
				Body:  msg.Body,
			},
			Data: msg.Data,
		}
		if t.Platform == "web" {
			m.Webpush = &messaging.WebpushConfig{
				Notification: &messaging.WebpushNotification{
					Title: msg.Title,
					Body:  msg.Body,
					Icon:  "/icons/icon-192x192.png",
				},
			}
		}
		messages = append(messages, m)
	}

	// Send in batches of 500 (FCM limit)
	for i := 0; i < len(messages); i += 500 {
		end := i + 500
		if end > len(messages) {
			end = len(messages)
		}
		batch := messages[i:end]
		resp, err := s.fcmClient.SendEach(ctx, batch)
		if err != nil {
			slog.Error("FCM batch send error", "error", err)
			for _, t := range tokens[i:end] {
				failed = append(failed, FailedToken{Token: t.Token, Platform: t.Platform, Reason: err.Error()})
			}
			continue
		}
		for j, sr := range resp.Responses {
			if sr.Error != nil {
				idx := i + j
				failed = append(failed, FailedToken{
					Token:    tokens[idx].Token,
					Platform: tokens[idx].Platform,
					Reason:   sr.Error.Error(),
				})
			}
		}
	}
	return failed
}

func (s *PushService) sendAPNs(_ context.Context, deviceToken string, msg PushMessage) error {
	if s.apnsClient == nil {
		return fmt.Errorf("APNs client not initialized")
	}

	p := payload.NewPayload().
		AlertTitle(msg.Title).
		AlertBody(msg.Body).
		Sound("default")

	if msg.Badge != nil {
		p.Badge(*msg.Badge)
	}

	// Add custom data
	for k, v := range msg.Data {
		p.Custom(k, v)
	}

	notification := &apns2.Notification{
		DeviceToken: deviceToken,
		Topic:       s.apnsTopic,
		Payload:     p,
	}

	res, err := s.apnsClient.Push(notification)
	if err != nil {
		return fmt.Errorf("APNs push error: %w", err)
	}
	if !res.Sent() {
		return fmt.Errorf("APNs rejected: %s (status %d)", res.Reason, res.StatusCode)
	}
	return nil
}

// NotificationLogEntry tracks sent notifications to prevent duplicates.
type NotificationLogEntry struct {
	EventID          string
	NotificationType string
}

func (e NotificationLogEntry) MarshalJSON() ([]byte, error) {
	return json.Marshal(struct {
		EventID          string `json:"event_id"`
		NotificationType string `json:"notification_type"`
	}{e.EventID, e.NotificationType})
}
