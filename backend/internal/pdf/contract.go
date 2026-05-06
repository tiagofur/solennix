package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// ContractData holds all data needed to generate a Contract PDF.
type ContractData struct {
	Event    models.Event
	Client   *models.Client
	Profile  *models.User
	Products []models.EventProduct
	Payments []models.Payment
}

// GenerateContract creates a Contrato PDF by resolving template tokens and
// rendering the filled text. Returns the raw bytes.
func GenerateContract(data ContractData) ([]byte, error) {
	showName := data.Profile.ShowBusinessNameInPdf == nil || *data.Profile.ShowBusinessNameInPdf
	businessName := ""
	if data.Profile.BusinessName != nil {
		businessName = *data.Profile.BusinessName
	}
	brandColor := ""
	if data.Profile.BrandColor != nil {
		brandColor = *data.Profile.BrandColor
	}

	doc, err := NewPDFDoc(brandColor, businessName, showName, nil)
	if err != nil {
		return nil, fmt.Errorf("create PDF: %w", err)
	}

	doc.AddPage()
	y := doc.DrawHeader("Contrato de Servicios")

	// Resolve template tokens
	templateText := ""
	if data.Profile.ContractTemplate != nil {
		templateText = *data.Profile.ContractTemplate
	}

	tokenData := TokenData{
		Event:    data.Event,
		Client:   data.Client,
		Profile:  data.Profile,
		Products: data.Products,
		Payments: data.Payments,
	}
	resolvedText := ResolveTokens(templateText, tokenData)

	if resolvedText == "" {
		resolvedText = "El organizador no ha configurado una plantilla de contrato.\n\nPor favor, configura tu plantilla de contrato en Ajustes > Contrato."
	}

	// ── Render contract body ──
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()

	// Use MultiCell for automatic line wrapping
	doc.SetXY(MarginLeft, y)
	lineH := 5.0
	doc.MultiCell(ContentWidth, lineH, resolvedText, "", "L", false)

	return doc.Output()
}
