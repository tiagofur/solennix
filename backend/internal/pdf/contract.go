package pdf

import (
	"fmt"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// ContractData holds all data needed to generate a Contract PDF.
type ContractData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Products  []models.EventProduct
	Payments  []models.Payment
	LogoBytes []byte
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

	doc, err := NewPDFDoc(brandColor, businessName, showName, data.LogoBytes)
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

	providerName := data.Profile.Name
	if data.Profile.BusinessName != nil && *data.Profile.BusinessName != "" {
		providerName = *data.Profile.BusinessName
	}
	clientName := "EL CLIENTE"
	if data.Client != nil && data.Client.Name != "" {
		clientName = data.Client.Name
	}

	// ── Render contract body ──
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()
	lineH := 5.0
	paragraphs := strings.Split(resolvedText, "\n\n")
	for _, paragraph := range paragraphs {
		trimmed := strings.TrimSpace(paragraph)
		if trimmed == "" {
			continue
		}

		approxHeight := float64(strings.Count(trimmed, "\n")+1) * lineH
		if y+approxHeight > PageHeight-60 {
			doc.AddPage()
			y = MarginTop
		}

		doc.SetXY(MarginLeft, y)
		doc.MultiCell(ContentWidth, lineH, trimmed, "", "L", false)
		y = doc.GetY() + 2
	}

	signY := y + 20
	minSignY := PageHeight - 40
	if signY < minSignY {
		signY = minSignY
	}
	if signY > PageHeight-15 {
		doc.AddPage()
		signY = 40
	}

	leftStartX := 20.0
	leftEndX := 80.0
	rightStartX := 130.0
	rightEndX := 190.0
	leftCenterX := (leftStartX + leftEndX) / 2
	rightCenterX := (rightStartX + rightEndX) / 2

	doc.SetDrawColor(180, 180, 180)
	doc.SetLineWidth(0.3)
	doc.Line(leftStartX, signY, leftEndX, signY)
	doc.Line(rightStartX, signY, rightEndX, signY)

	doc.SetFont(FontDejaVuSans, "", 8)
	doc.SetTextColorDefault()
	providerRoleW := doc.GetStringWidth("EL PROVEEDOR")
	clientRoleW := doc.GetStringWidth("EL CLIENTE")
	doc.Text(leftCenterX-providerRoleW/2, signY+5, "EL PROVEEDOR")
	doc.Text(rightCenterX-clientRoleW/2, signY+5, "EL CLIENTE")

	doc.SetXY(leftStartX, signY+8)
	doc.MultiCell(leftEndX-leftStartX, 4, providerName, "", "C", false)
	doc.SetXY(rightStartX, signY+8)
	doc.MultiCell(rightEndX-rightStartX, 4, clientName, "", "C", false)

	return doc.Output()
}
