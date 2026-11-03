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

func TestComputeAttendanceSummary(t *testing.T) {
	statusConfirmed := "confirmed"
	statusPending := "pending"
	statusDeclined := "declined"
	statusCancelled := "cancelled"

	staff := []EventStaff{
		{Status: &statusConfirmed},
		{Status: &statusConfirmed},
		{Status: &statusPending},
		{Status: &statusDeclined},
		{Status: &statusCancelled},
		{Status: nil}, // should count as pending
	}

	summary := ComputeAttendanceSummary(staff)
	if summary.Total != 6 {
		t.Errorf("expected total 6, got %d", summary.Total)
	}
	if summary.Confirmed != 2 {
		t.Errorf("expected confirmed 2, got %d", summary.Confirmed)
	}
	if summary.Pending != 2 {
		t.Errorf("expected pending 2, got %d", summary.Pending)
	}
	if summary.Declined != 1 {
		t.Errorf("expected declined 1, got %d", summary.Declined)
	}
	if summary.Cancelled != 1 {
		t.Errorf("expected cancelled 1, got %d", summary.Cancelled)
	}
}
