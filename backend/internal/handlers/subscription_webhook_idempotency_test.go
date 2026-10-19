package handlers

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	stripewebhook "github.com/stripe/stripe-go/v81/webhook"
	"github.com/tiagofur/solennix-backend/internal/config"
)

// fakeProcessedWebhookRepo records idempotency claims for assertions.
type fakeProcessedWebhookRepo struct {
	firstTime  bool
	tryErr     error
	deleteErr  error
	tryInserts []string
	deletes    []string
}

func (f *fakeProcessedWebhookRepo) TryInsert(_ context.Context, eventID, _, _ string) (bool, error) {
	f.tryInserts = append(f.tryInserts, eventID)
	if f.tryErr != nil {
		return false, f.tryErr
	}
	return f.firstTime, nil
}

func (f *fakeProcessedWebhookRepo) Delete(_ context.Context, eventID string) error {
	f.deletes = append(f.deletes, eventID)
	return f.deleteErr
}

// S5 (audit): when applying a webhook event fails, the idempotency claim
// must be released and the provider told to retry (5xx) — otherwise the
// retry is discarded as a duplicate and the user is stuck on the wrong plan.
func TestSubscriptionHandler_RevenueCatWebhook_ApplyFailureReleasesClaim(t *testing.T) {
	mockRepo := new(MockUserRepo)
	webhookRepo := &fakeProcessedWebhookRepo{firstTime: true}
	cfg := &config.Config{RevenueCatWebhookSecret: "rc_secret_123"}
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), nil, webhookRepo, cfg)

	userID := uuid.New()
	payload := `{"event":{"id":"evt-test-123","type":"INITIAL_PURCHASE","app_user_id":"` + userID.String() + `","product_id":"pro_monthly","store":"APP_STORE"}}`
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(fmt.Errorf("db down"))

	handler.RevenueCatWebhook(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, []string{"revenuecat:evt-test-123"}, webhookRepo.deletes)
	mockRepo.AssertExpectations(t)
}

func TestSubscriptionHandler_RevenueCatWebhook_ApplySuccessKeepsClaim(t *testing.T) {
	mockRepo := new(MockUserRepo)
	webhookRepo := &fakeProcessedWebhookRepo{firstTime: true}
	cfg := &config.Config{RevenueCatWebhookSecret: "rc_secret_123"}
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), nil, webhookRepo, cfg)

	userID := uuid.New()
	payload := `{"event":{"id":"evt-test-456","type":"INITIAL_PURCHASE","app_user_id":"` + userID.String() + `","product_id":"pro_monthly","store":"APP_STORE"}}`
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/revenuecat", bytes.NewReader([]byte(payload)))
	req.Header.Set("Authorization", "rc_secret_123")
	w := httptest.NewRecorder()

	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(nil)

	handler.RevenueCatWebhook(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, webhookRepo.deletes)
	mockRepo.AssertExpectations(t)
}

// S5 (audit): same contract for Stripe — a failed plan update must release
// the claim and return 5xx so Stripe retries instead of discarding.
func TestSubscriptionHandler_StripeWebhook_ApplyFailureReleasesClaim(t *testing.T) {
	mockRepo := new(MockUserRepo)
	webhookRepo := &fakeProcessedWebhookRepo{firstTime: true}
	secret := "whsec_test_123"
	cfg := &config.Config{StripeSecretKey: "sk_test_123", StripeWebhookSecret: secret}
	handler := NewSubscriptionHandler(mockRepo, nil, nil, nil, new(MockStripeService), nil, webhookRepo, cfg)

	userID := uuid.New()
	eventPayload := fmt.Sprintf(`{"id":"evt_test_123","object":"event","api_version":"2025-02-24.acacia","type":"checkout.session.completed","data":{"object":{"id":"cs_test_123","object":"checkout.session","client_reference_id":%q,"metadata":{"type":"subscription","plan":"pro"}}}}`, userID.String())
	signed := stripewebhook.GenerateTestSignedPayload(&stripewebhook.UnsignedPayload{Payload: []byte(eventPayload), Secret: secret})
	req := httptest.NewRequest("POST", "/api/subscriptions/webhook/stripe", bytes.NewReader([]byte(eventPayload)))
	req.Header.Set("Stripe-Signature", signed.Header)
	w := httptest.NewRecorder()

	mockRepo.On("UpdatePlanAndStripeID", mock.Anything, userID, "pro", (*string)(nil)).Return(fmt.Errorf("db down"))

	handler.StripeWebhook(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Equal(t, []string{"evt_test_123"}, webhookRepo.deletes)
	mockRepo.AssertExpectations(t)
}
