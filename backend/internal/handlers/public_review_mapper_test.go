package handlers

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestToPublicReview_DisplayName(t *testing.T) {
	cases := []struct {
		name string
		in   *string // ClientName
		want string
	}{
		{"single name", strPtr("Ana"), "A."},
		{"two names uses first token", strPtr("María García"), "M."},
		{"leading whitespace trimmed", strPtr("  Diego Pérez"), "D."},
		{"lowercase uppercased", strPtr("beatriz"), "B."},
		{"empty string falls back", strPtr(""), "Verified client"},
		{"whitespace-only falls back", strPtr("   "), "Verified client"},
		{"nil falls back", nil, "Verified client"},
		{"non-letter first char falls back", strPtr("123abc"), "Verified client"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			er := &models.EventReview{ClientName: c.in}
			got := toPublicReview(er)
			if got.DisplayName != c.want {
				t.Fatalf("DisplayName = %q, want %q", got.DisplayName, c.want)
			}
		})
	}
}

func TestToPublicReview_CopiesSafeFields(t *testing.T) {
	comment := "Great service"
	resp := "Thanks"
	label := "Wedding · 2026-01-15"
	submitted := time.Date(2026, 1, 15, 12, 0, 0, 0, time.UTC)

	er := &models.EventReview{
		ID:                uuid.New(),
		EventID:           uuid.New(),
		UserID:            uuid.New(),
		ClientID:          uuid.New(),
		Rating:            5,
		Comment:           &comment,
		Visibility:        "public",
		OrganizerResponse: &resp,
		SubmittedAt:       submitted,
		ClientName:        strPtr("Ana López"),
		EventLabel:        &label,
	}

	got := toPublicReview(er)

	if got.Rating != 5 {
		t.Errorf("Rating = %v, want 5", got.Rating)
	}
	if got.Comment == nil || *got.Comment != comment {
		t.Errorf("Comment = %v, want %q", got.Comment, comment)
	}
	if got.OrganizerResponse == nil || *got.OrganizerResponse != resp {
		t.Errorf("OrganizerResponse = %v, want %q", got.OrganizerResponse, resp)
	}
	if !got.SubmittedAt.Equal(submitted) {
		t.Errorf("SubmittedAt = %v, want %v", got.SubmittedAt, submitted)
	}
	if got.EventLabel == nil || *got.EventLabel != label {
		t.Errorf("EventLabel = %v, want %q", got.EventLabel, label)
	}
	if got.DisplayName != "A." {
		t.Errorf("DisplayName = %q, want %q", got.DisplayName, "A.")
	}
}

func TestToPublicReview_JSONHasNoPII(t *testing.T) {
	er := &models.EventReview{
		ID:                uuid.New(),
		EventID:           uuid.New(),
		UserID:            uuid.New(),
		ClientID:          uuid.New(),
		ReviewRequestID:   ptrUUID(uuid.New()),
		Rating:            4,
		Comment:           strPtr("Ok"),
		Visibility:        "public",
		OrganizerResponse: strPtr("Ty"),
		SubmittedAt:       time.Now(),
		ClientName:        strPtr("Secret Client"),
		EventLabel:        strPtr("Birthday"),
	}

	got := toPublicReview(er)
	b, err := json.Marshal(got)
	if err != nil {
		t.Fatalf("json.Marshal: %v", err)
	}
	out := string(b)

	forbidden := []string{
		`"client_id"`,
		`"user_id"`,
		`"event_id"`,
		`"review_request_id"`,
		`"client_name"`,
		`"visibility"`,
		"Secret Client",
	}
	for _, f := range forbidden {
		if strings.Contains(out, f) {
			t.Errorf("PublicReview JSON must not contain %q; got %s", f, out)
		}
	}
}

func strPtr(s string) *string { return &s }
func ptrUUID(u uuid.UUID) *uuid.UUID { return &u }
