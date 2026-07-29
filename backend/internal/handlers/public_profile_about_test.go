package handlers

import (
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestMergeProfile_AboutFields(t *testing.T) {
	userID := uuid.New()
	def := &models.OrganizerPublicProfile{
		UserID:    userID,
		IsEnabled: false,
	}

	aboutText := "We organize luxury weddings and corporate events across Mexico."
	minGuests := 20
	maxGuests := 400
	respTime := "Responde en menos de 2 horas"

	req := &upsertRequest{
		About:        &aboutText,
		ServiceAreas: []string{"Guadalajara", "Zapopan", "Puerto Vallarta"},
		MinGuests:    &minGuests,
		MaxGuests:    &maxGuests,
		EventTypes:   []string{"wedding", "corporate", "birthday"},
		ResponseTime: &respTime,
		Languages:    []string{"es", "en"},
	}

	merged := mergeProfile(nil, def, req, userID)

	if merged.About == nil || *merged.About != aboutText {
		t.Errorf("expected About %q, got %v", aboutText, merged.About)
	}
	if len(merged.ServiceAreas) != 3 || merged.ServiceAreas[0] != "Guadalajara" {
		t.Errorf("unexpected ServiceAreas: %v", merged.ServiceAreas)
	}
	if merged.MinGuests == nil || *merged.MinGuests != 20 {
		t.Errorf("expected MinGuests 20, got %v", merged.MinGuests)
	}
	if merged.MaxGuests == nil || *merged.MaxGuests != 400 {
		t.Errorf("expected MaxGuests 400, got %v", merged.MaxGuests)
	}
	if len(merged.EventTypes) != 3 || merged.EventTypes[0] != "wedding" {
		t.Errorf("unexpected EventTypes: %v", merged.EventTypes)
	}
	if merged.ResponseTime == nil || *merged.ResponseTime != respTime {
		t.Errorf("expected ResponseTime %q, got %v", respTime, merged.ResponseTime)
	}
	if len(merged.Languages) != 2 || merged.Languages[0] != "es" {
		t.Errorf("unexpected Languages: %v", merged.Languages)
	}
}
