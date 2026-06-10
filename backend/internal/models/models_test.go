package models

import (
	"encoding/json"
	"strings"
	"testing"
)

// B2: Provider IDs must not appear in JSON output.
func TestUser_ProviderIDsHiddenFromJSON(t *testing.T) {
	strp := "cus_test123"
	goog := "google-uid-456"
	appl := "apple-uid-789"

	u := &User{
		StripeCustomerID: &strp,
		GoogleUserID:     &goog,
		AppleUserID:      &appl,
	}

	b, err := json.Marshal(u)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	s := string(b)

	if strings.Contains(s, "stripe_customer_id") {
		t.Errorf("stripe_customer_id must not appear in JSON, got: %s", s)
	}
	if strings.Contains(s, "google_user_id") {
		t.Errorf("google_user_id must not appear in JSON, got: %s", s)
	}
	if strings.Contains(s, "apple_user_id") {
		t.Errorf("apple_user_id must not appear in JSON, got: %s", s)
	}
	if strings.Contains(s, strp) {
		t.Errorf("StripeCustomerID value %q must not appear in JSON, got: %s", strp, s)
	}
	if strings.Contains(s, goog) {
		t.Errorf("GoogleUserID value %q must not appear in JSON, got: %s", goog, s)
	}
	if strings.Contains(s, appl) {
		t.Errorf("AppleUserID value %q must not appear in JSON, got: %s", appl, s)
	}
}
