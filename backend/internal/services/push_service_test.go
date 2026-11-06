package services

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/config"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// NewPushService
// ---------------------------------------------------------------------------

func TestNewPushService_GivenEmptyConfig_WhenCreated_ThenReturnsDisabledService(t *testing.T) {
	cfg := &config.Config{}
	ps := NewPushService(cfg)

	require.NotNil(t, ps)
	assert.False(t, ps.IsEnabled())
	assert.Nil(t, ps.fcmClient)
	assert.Nil(t, ps.apnsClient)
}

func TestNewPushService_GivenInvalidFCMCredentials_WhenCreated_ThenReturnsDisabledService(t *testing.T) {
	cfg := &config.Config{
		FCMCredentialsJSON: "not-valid-json",
	}
	ps := NewPushService(cfg)

	require.NotNil(t, ps)
	assert.False(t, ps.IsEnabled())
	assert.Nil(t, ps.fcmClient)
}

func TestNewPushService_GivenInvalidAPNsKeyPath_WhenCreated_ThenReturnsDisabledService(t *testing.T) {
	cfg := &config.Config{
		APNsKeyPath:  "/nonexistent/path/key.p8",
		APNsKeyID:    "KEY123",
		APNsTeamID:   "TEAM456",
		APNsBundleID: "com.test.app",
	}
	ps := NewPushService(cfg)

	require.NotNil(t, ps)
	assert.False(t, ps.IsEnabled())
	assert.Nil(t, ps.apnsClient)
}

func TestNewPushService_GivenPartialAPNsConfig_WhenCreated_ThenSkipsAPNs(t *testing.T) {
	// Only key path set, but missing key ID and team ID
	cfg := &config.Config{
		APNsKeyPath: "/some/path.p8",
		// APNsKeyID and APNsTeamID are empty
	}
	ps := NewPushService(cfg)

	require.NotNil(t, ps)
	assert.False(t, ps.IsEnabled())
	assert.Nil(t, ps.apnsClient)
}

func TestNewPushService_GivenBundleID_WhenCreated_ThenStoresBundleID(t *testing.T) {
	cfg := &config.Config{
		APNsBundleID: "com.creapolis.solennix",
	}
	ps := NewPushService(cfg)

	require.NotNil(t, ps)
	assert.Equal(t, "com.creapolis.solennix", ps.apnsTopic)
}

// ---------------------------------------------------------------------------
// IsEnabled
// ---------------------------------------------------------------------------

func TestIsEnabled_GivenNoCredentials_WhenChecked_ThenReturnsFalse(t *testing.T) {
	ps := &PushService{enabled: false}
	assert.False(t, ps.IsEnabled())
}

func TestIsEnabled_GivenEnabled_WhenChecked_ThenReturnsTrue(t *testing.T) {
	ps := &PushService{enabled: true}
	assert.True(t, ps.IsEnabled())
}

// ---------------------------------------------------------------------------
// SendToTokens
// ---------------------------------------------------------------------------

func TestSendToTokens_GivenDisabledService_WhenSending_ThenReturnsNil(t *testing.T) {
	ps := &PushService{enabled: false}

	tokens := []models.DeviceToken{
		{ID: uuid.New(), Token: "tok-1", Platform: "ios"},
		{ID: uuid.New(), Token: "tok-2", Platform: "android"},
	}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test message",
	}

	failed := ps.SendToTokens(context.Background(), tokens, msg)
	assert.Nil(t, failed)
}

func TestSendToTokens_GivenEmptyTokenList_WhenSending_ThenReturnsNil(t *testing.T) {
	ps := &PushService{enabled: true}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test message",
	}

	failed := ps.SendToTokens(context.Background(), nil, msg)
	assert.Nil(t, failed)
}

func TestSendToTokens_GivenNoTokens_WhenDisabled_ThenSkipsSilently(t *testing.T) {
	ps := &PushService{enabled: false}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
		Data:  map[string]string{"type": "test"},
	}

	failed := ps.SendToTokens(context.Background(), []models.DeviceToken{}, msg)
	assert.Nil(t, failed)
}

func TestSendToTokens_GivenUnknownPlatform_WhenEnabled_ThenSkipsToken(t *testing.T) {
	// Create a push service that is "enabled" but has no actual clients
	ps := &PushService{enabled: true}

	tokens := []models.DeviceToken{
		{ID: uuid.New(), Token: "tok-unknown", Platform: "windows"},
	}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
	}

	// Should not panic even with unknown platform and nil clients
	failed := ps.SendToTokens(context.Background(), tokens, msg)
	// Unknown platform is logged but not sent; no failure recorded
	assert.Empty(t, failed)
}

func TestSendToTokens_GivenIOSTokens_WhenAPNsClientNil_ThenRecordsFailure(t *testing.T) {
	// enabled=true but apnsClient=nil
	ps := &PushService{enabled: true, apnsClient: nil}

	tokens := []models.DeviceToken{
		{ID: uuid.New(), Token: "ios-tok-1", Platform: "ios"},
	}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
	}

	failed := ps.SendToTokens(context.Background(), tokens, msg)
	require.Len(t, failed, 1)
	assert.Equal(t, "ios-tok-1", failed[0].Token)
	assert.Equal(t, "ios", failed[0].Platform)
	assert.Contains(t, failed[0].Reason, "APNs client not initialized")
}

func TestSendToTokens_GivenAndroidTokens_WhenFCMClientNil_ThenSkipsFCM(t *testing.T) {
	// enabled=true but fcmClient=nil — the code checks `s.fcmClient != nil`
	ps := &PushService{enabled: true, fcmClient: nil}

	tokens := []models.DeviceToken{
		{ID: uuid.New(), Token: "android-tok-1", Platform: "android"},
	}

	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
	}

	// FCM tokens are skipped when fcmClient is nil (no error recorded)
	failed := ps.SendToTokens(context.Background(), tokens, msg)
	assert.Empty(t, failed)
}

func TestSendToTokens_GivenMixedPlatformTokens_WhenBothClientsNil_ThenHandlesGracefully(t *testing.T) {
	ps := &PushService{enabled: true}

	tokens := []models.DeviceToken{
		{ID: uuid.New(), Token: "ios-1", Platform: "ios"},
		{ID: uuid.New(), Token: "android-1", Platform: "android"},
		{ID: uuid.New(), Token: "web-1", Platform: "web"},
		{ID: uuid.New(), Token: "unknown-1", Platform: "macos"},
	}

	msg := PushMessage{
		Title: "Mixed test",
		Body:  "Testing all platforms",
		Data:  map[string]string{"key": "value"},
	}

	failed := ps.SendToTokens(context.Background(), tokens, msg)
	// Only iOS tokens should fail (APNs not initialized)
	// Android/web tokens are skipped when FCM client is nil
	iosFailures := 0
	for _, f := range failed {
		if f.Platform == "ios" {
			iosFailures++
		}
	}
	assert.Equal(t, 1, iosFailures)
}

// ---------------------------------------------------------------------------
// sendAPNs — nil client
// ---------------------------------------------------------------------------

func TestSendAPNs_GivenNilClient_WhenSending_ThenReturnsError(t *testing.T) {
	ps := &PushService{apnsClient: nil}

	err := ps.sendAPNs(context.Background(), "device-token", PushMessage{
		Title: "Test",
		Body:  "Test body",
	})

	require.Error(t, err)
	assert.Contains(t, err.Error(), "APNs client not initialized")
}

// ---------------------------------------------------------------------------
// PushMessage — Badge field
// ---------------------------------------------------------------------------

func TestPushMessage_GivenBadge_WhenCreated_ThenBadgeIsSet(t *testing.T) {
	badge := 5
	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
		Badge: &badge,
	}

	assert.NotNil(t, msg.Badge)
	assert.Equal(t, 5, *msg.Badge)
}

func TestPushMessage_GivenNoBadge_WhenCreated_ThenBadgeIsNil(t *testing.T) {
	msg := PushMessage{
		Title: "Test",
		Body:  "Test body",
	}

	assert.Nil(t, msg.Badge)
}

// ---------------------------------------------------------------------------
// NotificationLogEntry.MarshalJSON
// ---------------------------------------------------------------------------

func TestNotificationLogEntry_MarshalJSON_GivenEntry_WhenMarshalled_ThenProducesValidJSON(t *testing.T) {
	entry := NotificationLogEntry{
		EventID:          "evt-123",
		NotificationType: "payment_received",
	}

	data, err := entry.MarshalJSON()
	require.NoError(t, err)

	var parsed map[string]string
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)

	assert.Equal(t, "evt-123", parsed["event_id"])
	assert.Equal(t, "payment_received", parsed["notification_type"])
}

func TestNotificationLogEntry_MarshalJSON_GivenEmptyEntry_WhenMarshalled_ThenProducesValidJSON(t *testing.T) {
	entry := NotificationLogEntry{}

	data, err := entry.MarshalJSON()
	require.NoError(t, err)

	var parsed map[string]string
	err = json.Unmarshal(data, &parsed)
	require.NoError(t, err)

	assert.Equal(t, "", parsed["event_id"])
	assert.Equal(t, "", parsed["notification_type"])
}

// ---------------------------------------------------------------------------
// FailedToken struct
// ---------------------------------------------------------------------------

func TestFailedToken_GivenValues_WhenCreated_ThenFieldsAreCorrect(t *testing.T) {
	ft := FailedToken{
		Token:    "tok-abc",
		Platform: "ios",
		Reason:   "BadDeviceToken",
	}

	assert.Equal(t, "tok-abc", ft.Token)
	assert.Equal(t, "ios", ft.Platform)
	assert.Equal(t, "BadDeviceToken", ft.Reason)
}
