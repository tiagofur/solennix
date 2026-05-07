package pdf

import (
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestGenerateContract_Smoke(t *testing.T) {
	showName := true
	bizName := "Test Business"
	tmpl := "Este contrato es para [nombre_cliente]."
	id := uuid.New()
	b, err := GenerateContract(ContractData{
		Event:   models.Event{ID: id, ServiceType: "boda"},
		Profile: &models.User{ID: id, ShowBusinessNameInPdf: &showName, BusinessName: &bizName, ContractTemplate: &tmpl},
	})
	if err != nil {
		t.Fatalf("GenerateContract error: %v", err)
	}
	if len(b) == 0 {
		t.Fatal("empty PDF output")
	}
	t.Logf("OK: %d bytes", len(b))
}
