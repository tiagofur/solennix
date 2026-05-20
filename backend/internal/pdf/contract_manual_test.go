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

func TestGenerateContract_UsesDefaultTemplateWhenProfileHasNoTemplate(t *testing.T) {
	userID := uuid.New()
	client := &models.Client{
		ID:     uuid.New(),
		Name:   "Cliente Demo",
		UserID: userID,
	}
	event := models.Event{
		ID:          uuid.New(),
		UserID:      userID,
		ClientID:    client.ID,
		ServiceType: "Boda",
		NumPeople:   80,
		TotalAmount: 25000,
	}
	profile := &models.User{
		ID:   userID,
		Name: "Organizador Demo",
		Plan: "basic",
	}

	result, err := GenerateContract(ContractData{
		Event:   event,
		Client:  client,
		Profile: profile,
	})

	assert.NoError(t, err)
	assert.NotEmpty(t, result)
}

func TestEffectiveContractTemplate(t *testing.T) {
	customTemplate := "Contrato custom para [client_name]"

	tests := []struct {
		name    string
		profile *models.User
		want    string
	}{
		{
			name:    "nil profile uses default",
			profile: nil,
			want:    DefaultContractTemplate,
		},
		{
			name:    "basic without template uses default",
			profile: &models.User{Plan: "basic"},
			want:    DefaultContractTemplate,
		},
		{
			name:    "basic with custom template still uses default",
			profile: &models.User{Plan: "basic", ContractTemplate: &customTemplate},
			want:    DefaultContractTemplate,
		},
		{
			name:    "free alias with custom template uses default",
			profile: &models.User{Plan: "free", ContractTemplate: &customTemplate},
			want:    DefaultContractTemplate,
		},
		{
			name:    "pro with custom template uses custom",
			profile: &models.User{Plan: "pro", ContractTemplate: &customTemplate},
			want:    customTemplate,
		},
		{
			name:    "business with custom template uses custom",
			profile: &models.User{Plan: "business", ContractTemplate: &customTemplate},
			want:    customTemplate,
		},
		{
			name:    "pro with blank template uses default",
			profile: &models.User{Plan: "pro", ContractTemplate: ptr("   ")},
			want:    DefaultContractTemplate,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, effectiveContractTemplate(tt.profile))
		})
	}
}

func TestStripLegacySignatureSection(t *testing.T) {
	text := "Clausula 1\n\nFirmas:\nProveedor: Demo\nCliente: Demo"
	assert.Equal(t, "Clausula 1", stripLegacySignatureSection(text))
}

func TestStripLegacySignatureSection_WithoutMarker(t *testing.T) {
	text := "Clausula 1\n\nClausula 2"
	assert.Equal(t, text, stripLegacySignatureSection(text))
}
