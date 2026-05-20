package pdf

import (
	"fmt"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// DefaultContractTemplate is the server-owned fallback used for all free users
// and for paid users who have not saved a custom contract template.
const DefaultContractTemplate = `1. El Proveedor es una empresa dedicada a [Tipo de servicio], [Nombre comercial del proveedor], y cuenta con la capacidad para la prestación de dicho servicio.
2. El Cliente: [Nombre del cliente] desea contratar los servicios del Proveedor para el evento que se llevará a cabo el [Fecha del evento], en [Lugar del evento].
3. Servicio contratados: [Servicios del evento]

Por lo tanto, las partes acuerdan las siguientes cláusulas:

CLÁUSULAS:
Primera. Objeto del Contrato
El Proveedor se compromete a prestar los servicios de [Tipo de servicio] para [Número de personas] personas.

Segunda. Horarios de Servicio
El servicio será prestado en el evento en un horario de [Horario del evento].

Tercera. Costo Total/Anticipo
El costo total del servicio contratado será de [Monto total del evento] con un anticipo de [Total pagado].

Cuarta. Condiciones de Pago
El Cliente deberá cubrir un anticipo del [Porcentaje de anticipo]% para reservar la fecha. El resto deberá liquidarse antes del inicio del evento.

Quinta. Condiciones del Servicio
El Cliente se compromete a facilitar un espacio adecuado para la instalación del equipo necesario, que deberá contar con una superficie plana y conexión de luz.

Sexta. Cancelaciones y Reembolsos
En caso de cancelación por parte del Cliente con menos de [Días de cancelación] días de anticipación, no se realizará reembolso del apartado.
Cuando la cancelación se realice dentro del plazo permitido, se reembolsará el [Porcentaje de reembolso]% del apartado.

Octava. Jurisdicción
Para cualquier disputa derivada de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de [Ciudad del contrato].

Novena. Modificaciones
Cualquier modificación a este contrato deberá ser acordada por ambas partes por escrito.

Firmas:
Proveedor: [Nombre del proveedor]
Cliente: [Nombre del cliente]`

// ContractData holds all data needed to generate a Contract PDF.
type ContractData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Products  []models.EventProduct
	Payments  []models.Payment
	LogoBytes []byte
}

func stripLegacySignatureSection(text string) string {
	lower := strings.ToLower(text)
	markers := []string{
		"\n\nfirmas:",
		"\nfirmas:",
		"\n\nfirmas :",
		"\nfirmas :",
	}

	cut := len(text)
	for _, marker := range markers {
		idx := strings.Index(lower, marker)
		if idx >= 0 && idx < cut {
			cut = idx
		}
	}

	return strings.TrimSpace(text[:cut])
}

func CanUseCustomContractTemplate(plan string) bool {
	switch strings.ToLower(strings.TrimSpace(plan)) {
	case "pro", "business", "premium", "enterprise":
		return true
	default:
		return false
	}
}

func effectiveContractTemplate(profile *models.User) string {
	if profile == nil || !CanUseCustomContractTemplate(profile.Plan) || profile.ContractTemplate == nil {
		return DefaultContractTemplate
	}

	template := strings.TrimSpace(*profile.ContractTemplate)
	if template == "" {
		return DefaultContractTemplate
	}
	return template
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
	templateText := effectiveContractTemplate(data.Profile)

	tokenData := TokenData{
		Event:    data.Event,
		Client:   data.Client,
		Profile:  data.Profile,
		Products: data.Products,
		Payments: data.Payments,
	}
	resolvedText := ResolveTokens(templateText, tokenData)
	resolvedText = stripLegacySignatureSection(resolvedText)

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
