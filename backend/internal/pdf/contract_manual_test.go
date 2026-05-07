package pdf

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func ptr[T any](v T) *T { return &v }

func TestContractGenerationManual(t *testing.T) {
	userID := uuid.New()
	clientID := uuid.New()
	eventID := uuid.New()

	profile := &models.User{
		ID:                    userID,
		Name:                  "Test Organizer",
		BusinessName:          ptr("Mi Empresa de Eventos"),
		ShowBusinessNameInPdf: ptr(true),
		BrandColor:            ptr("#C4A265"),
		ContractTemplate:      ptr("Contrato entre [provider_business_name] y [client_name].\nFecha: [event_date].\n\nServicios:\n[services_list]"),
	}

	client := &models.Client{
		ID:     clientID,
		Name:   "Juan Pérez",
		UserID: userID,
	}

	event := models.Event{
		ID:          eventID,
		UserID:      userID,
		ClientID:    clientID,
		ServiceType: "Boda",
	}

	data := ContractData{
		Event:     event,
		Client:    client,
		Profile:   profile,
		Products:  nil,
		Payments:  nil,
		LogoBytes: nil,
	}

	result, err := GenerateContract(data)
	if err != nil {
		t.Fatalf("GenerateContract failed: %v", err)
	}
	if len(result) == 0 {
		t.Fatal("Expected non-empty PDF bytes")
	}
	t.Logf("SUCCESS: %d bytes", len(result))
}

func TestStripLegacySignatureSection(t *testing.T) {
	text := "Clausula 1\n\nFirmas:\nProveedor: Demo\nCliente: Demo"
	assert.Equal(t, "Clausula 1", stripLegacySignatureSection(text))
}

func TestStripLegacySignatureSection_WithoutMarker(t *testing.T) {
	text := "Clausula 1\n\nClausula 2"
	assert.Equal(t, text, stripLegacySignatureSection(text))
}
