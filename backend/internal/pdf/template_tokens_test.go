package pdf

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func strPtr(s string) *string     { return &s }
func floatPtr(f float64) *float64 { return &f }
func boolPtr(b bool) *bool        { return &b }

func sampleTokenData() TokenData {
	profile := models.User{
		Name:         "Juan Eventos",
		BusinessName: strPtr("Mi Empresa de Eventos"),
		Email:        "info@mieventos.com",
	}
	return TokenData{
		Event: models.Event{
			EventDate:        "2026-06-15",
			StartTime:        strPtr("14:00"),
			EndTime:          strPtr("22:00"),
			ServiceType:      "Banquete",
			NumPeople:        150,
			Location:         strPtr("Salón Los Arcos"),
			City:             strPtr("Ciudad de México"),
			TotalAmount:      45000,
			Discount:         10,
			DiscountType:     "percent",
			DepositPercent:   floatPtr(50),
			CancellationDays: floatPtr(15),
			RefundPercent:    floatPtr(80),
		},
		Client: &models.Client{
			Name:    "María García López",
			Phone:   "555-123-4567",
			Email:   strPtr("maria@ejemplo.com"),
			Address: strPtr("Av. Reforma 123"),
			City:    strPtr("CDMX"),
		},
		Profile: &profile,
		Products: []models.EventProduct{
			{Quantity: 1, ProductName: strPtr("Paquete Premium")},
			{Quantity: 2, ProductName: strPtr("Iluminación")},
		},
		Payments: []models.Payment{
			{Amount: 15000},
			{Amount: 7500},
		},
	}
}

// ---------------------------------------------------------------------------
// FormatCurrency
// ---------------------------------------------------------------------------

func TestFormatCurrency(t *testing.T) {
	tests := []struct {
		amount   float64
		expected string
	}{
		{0, "$0.00"},
		{1, "$1.00"},
		{100, "$100.00"},
		{1000, "$1,000.00"},
		{25000, "$25,000.00"},
		{1234567.89, "$1,234,567.89"},
		{45000, "$45,000.00"},
	}
	for _, tt := range tests {
		result := FormatCurrency(tt.amount)
		assert.Equal(t, tt.expected, result, "FormatCurrency(%v)", tt.amount)
	}
}

// ---------------------------------------------------------------------------
// FormatDate
// ---------------------------------------------------------------------------

func TestFormatDate(t *testing.T) {
	tests := []struct {
		date     string
		expected string
	}{
		{"2026-06-15", "15 de junio de 2026"},
		{"2026-01-01", "1 de enero de 2026"},
		{"2026-12-31", "31 de diciembre de 2026"},
		{"invalid", "invalid"}, // fallback
	}
	for _, tt := range tests {
		result := FormatDate(tt.date)
		assert.Equal(t, tt.expected, result, "FormatDate(%s)", tt.date)
	}
}

// ---------------------------------------------------------------------------
// resolveCanonicalToken
// ---------------------------------------------------------------------------

func TestResolveCanonicalToken_CanonicalForm(t *testing.T) {
	token := resolveCanonicalToken("client_name")
	assert.Equal(t, "client_name", token)
}

func TestResolveCanonicalToken_LabelForm(t *testing.T) {
	token := resolveCanonicalToken("Nombre del cliente")
	assert.Equal(t, "client_name", token)
}

func TestResolveCanonicalToken_WithAccents(t *testing.T) {
	token := resolveCanonicalToken("número de personas")
	assert.Equal(t, "event_num_people", token)
}

func TestResolveCanonicalToken_CaseInsensitive(t *testing.T) {
	token := resolveCanonicalToken("NOMBRE DEL CLIENTE")
	assert.Equal(t, "client_name", token)
}

func TestResolveCanonicalToken_Unknown(t *testing.T) {
	token := resolveCanonicalToken("something unknown")
	assert.Equal(t, "", token)
}

func TestResolveCanonicalToken_AllTokens(t *testing.T) {
	// Every canonical token should resolve to itself
	for token := range allowedTokens {
		result := resolveCanonicalToken(token)
		assert.Equal(t, token, result, "canonical token %q should resolve to itself", token)
	}
}

func TestResolveCanonicalToken_AllAliases(t *testing.T) {
	// Every alias should resolve to its canonical form
	for alias, canonical := range tokenAliases {
		result := resolveCanonicalToken(alias)
		assert.Equal(t, canonical, result, "alias %q should resolve to %q", alias, canonical)
	}
}

// ---------------------------------------------------------------------------
// ResolveTokens
// ---------------------------------------------------------------------------

func TestResolveTokens_BasicReplacement(t *testing.T) {
	data := sampleTokenData()
	template := "El cliente [Nombre del cliente] tiene un evento el [Fecha del evento]."
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "María García López")
	assert.Contains(t, result, "15 de junio de 2026")
	assert.NotContains(t, result, "[Nombre del cliente]")
	assert.NotContains(t, result, "[Fecha del evento]")
}

func TestResolveTokens_AllTokens(t *testing.T) {
	data := sampleTokenData()

	// Build template with all tokens
	allAliases := []string{
		"Nombre del proveedor",
		"Nombre comercial del proveedor",
		"Email del proveedor",
		"Fecha actual",
		"Fecha del evento",
		"Hora de inicio",
		"Hora de fin",
		"Horario del evento",
		"Tipo de servicio",
		"Número de personas",
		"Lugar del evento",
		"Ciudad del evento",
		"Monto total del evento",
		"Porcentaje de anticipo",
		"Porcentaje de reembolso",
		"Días de cancelación",
		"Nombre del cliente",
		"Teléfono del cliente",
		"Email del cliente",
		"Dirección del cliente",
		"Ciudad del cliente",
		"Ciudad del contrato",
		"Servicios del evento",
		"Total pagado",
	}

	template := strings.Join(allAliases, " | ")
	template = "[" + strings.ReplaceAll(template, " | ", "] | [") + "]"

	result := ResolveTokens(template, data)

	// No tokens should remain
	assert.NotContains(t, result, "[Nombre del cliente]")
	assert.NotContains(t, result, "[Fecha del evento]")

	// Verify specific resolved values
	assert.Contains(t, result, "María García López")
	assert.Contains(t, result, "15 de junio de 2026")
	assert.Contains(t, result, "14:00 - 22:00")
	assert.Contains(t, result, "Banquete")
	assert.Contains(t, result, "150")
	assert.Contains(t, result, "Salón Los Arcos")
	assert.Contains(t, result, "Ciudad de México")
	assert.Contains(t, result, "$45,000.00")
	assert.Contains(t, result, "1 Paquete Premium")
	assert.Contains(t, result, "2 Iluminación")
	assert.Contains(t, result, "$22,500.00") // 15000 + 7500
}

func TestResolveTokens_MixedCanonicalAndLabelForms(t *testing.T) {
	data := sampleTokenData()
	template := "[client_name] - [Tipo de servicio] - [event_total_amount]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "María García López")
	assert.Contains(t, result, "Banquete")
	assert.Contains(t, result, "$45,000.00")
}

func TestResolveTokens_UnknownTokenLeftAsIs(t *testing.T) {
	data := sampleTokenData()
	template := "Hello [Token Desconocido] world"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "[Token Desconocido]")
}

func TestResolveTokens_MissingDataLeftAsIs(t *testing.T) {
	// Event without client
	data := TokenData{
		Event: models.Event{
			EventDate:   "2026-06-15",
			ServiceType: "Banquete",
			NumPeople:   100,
		},
		Client:  nil, // no client
		Profile: &models.User{Name: "Test"},
	}
	template := "Cliente: [Nombre del cliente]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "[Nombre del cliente]") // no data → stays as-is
}

func TestResolveTokens_PercentageNormalization(t *testing.T) {
	data := sampleTokenData()
	template := "Anticipo del [Porcentaje de anticipo]% del total."
	result := ResolveTokens(template, data)

	// Should NOT have %%
	assert.NotContains(t, result, "%%")
	assert.Contains(t, result, "50%")
}

func TestResolveTokens_ServicesList(t *testing.T) {
	data := sampleTokenData()
	template := "[Servicios del evento]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "1 Paquete Premium")
	assert.Contains(t, result, "2 Iluminación")
}

func TestResolveTokens_ContractCity_FallsBackToClientCity(t *testing.T) {
	data := TokenData{
		Event: models.Event{
			EventDate: "2026-06-15",
			// no event city
		},
		Client: &models.Client{
			Name: "Test",
			City: strPtr("Guadalajara"),
		},
		Profile: &models.User{Name: "Test"},
	}
	template := "[Ciudad del contrato]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "Guadalajara")
}

func TestResolveTokens_ProviderBusinessName_FallsBackToName(t *testing.T) {
	data := TokenData{
		Profile: &models.User{
			Name:         "Juan Eventos",
			BusinessName: nil, // no business name
		},
	}
	template := "[Nombre comercial del proveedor]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "Juan Eventos")
}

func TestResolveTokens_DepositPercent_FromProfile(t *testing.T) {
	data := TokenData{
		Event: models.Event{
			EventDate: "2026-06-15",
			// no event-level deposit percent
		},
		Profile: &models.User{
			Name:                  "Test",
			DefaultDepositPercent: floatPtr(30),
		},
	}
	template := "Anticipo: [Porcentaje de anticipo]%"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "30%")
}

func TestResolveTokens_TimeRange_OnlyStart(t *testing.T) {
	data := TokenData{
		Event: models.Event{
			StartTime: strPtr("18:00"),
			EndTime:   nil,
		},
		Profile: &models.User{Name: "Test"},
	}
	template := "[Horario del evento]"
	result := ResolveTokens(template, data)

	assert.Contains(t, result, "18:00")
	assert.NotContains(t, result, " - ")
}

// ---------------------------------------------------------------------------
// PDFDoc creation (smoke test)
// ---------------------------------------------------------------------------

func TestNewPDFDoc_NoLogo(t *testing.T) {
	doc, err := NewPDFDoc("#FF0000", "Test Business", true, nil)
	assert.NoError(t, err)
	assert.NotNil(t, doc)
	assert.Equal(t, "#FF0000", doc.BrandColor)
	assert.True(t, doc.ShowName)
	assert.False(t, doc.hasLogo)
}

func TestNewPDFDoc_DefaultBrandColor(t *testing.T) {
	doc, err := NewPDFDoc("", "Test", true, nil)
	assert.NoError(t, err)
	assert.Equal(t, DefaultBrandColor, doc.BrandColor)
}

func TestNewPDFDoc_GeneratesValidPDF(t *testing.T) {
	doc, err := NewPDFDoc("#336699", "Solennix Events", true, nil)
	assert.NoError(t, err)

	doc.AddPage()
	y := doc.DrawHeader("Presupuesto")
	assert.Greater(t, y, 0.0)

	doc.SetFont(FontDejaVuSans, "", 10)
	doc.SetTextColorDefault()
	doc.Text(MarginLeft, y+10, "Contenido de prueba — acentos: ñáéíóú")

	data, err := doc.Output()
	assert.NoError(t, err)
	assert.NotEmpty(t, data)
	// PDF should start with %PDF magic bytes
	assert.True(t, strings.HasPrefix(string(data[:5]), "%PDF-"), "should be valid PDF")
}

func TestNewPDFDoc_WithLogo(t *testing.T) {
	// Generate a valid 1x1 PNG using Go's image/png package
	img := image.NewRGBA(image.Rect(0, 0, 10, 10))
	// Fill with a solid color
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			img.Set(x, y, color.RGBA{R: 196, G: 162, B: 101, A: 255})
		}
	}
	var buf bytes.Buffer
	png.Encode(&buf, img)
	pngBytes := buf.Bytes()

	doc, err := NewPDFDoc("#C4A265", "Test Logo Co", true, pngBytes)
	assert.NoError(t, err)
	assert.True(t, doc.hasLogo)
	assert.Greater(t, doc.logoWidth, 0.0)
	assert.Greater(t, doc.logoHeight, 0.0)
}

func TestNewPDFDoc_WithLogo_RendersOutput(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 10, 10))
	for y := 0; y < 10; y++ {
		for x := 0; x < 10; x++ {
			img.Set(x, y, color.RGBA{R: 196, G: 162, B: 101, A: 255})
		}
	}
	var buf bytes.Buffer
	png.Encode(&buf, img)
	pngBytes := buf.Bytes()

	doc, err := NewPDFDoc("#C4A265", "Test Logo Co", true, pngBytes)
	assert.NoError(t, err)

	doc.AddPage()
	y := doc.DrawHeader("Presupuesto")
	doc.SetFont(FontDejaVuSans, "", 10)
	doc.SetTextColorDefault()
	doc.Text(MarginLeft, y+10, "Contenido con logo")

	pdfBytes, err := doc.Output()
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
	assert.True(t, strings.HasPrefix(string(pdfBytes[:5]), "%PDF-"), "should be valid PDF")
}

// ---------------------------------------------------------------------------
// hexColorToRGB
// ---------------------------------------------------------------------------

func TestHexColorToRGB(t *testing.T) {
	tests := []struct {
		hex     string
		r, g, b int
	}{
		{"#C4A265", 196, 162, 101},
		{"#FF0000", 255, 0, 0},
		{"#000000", 0, 0, 0},
		{"FFFFFF", 255, 255, 255},  // without #
		{"invalid", 196, 162, 101}, // fallback to default
	}
	for _, tt := range tests {
		r, g, b := hexColorToRGB(tt.hex)
		assert.Equal(t, tt.r, r, "R for %s", tt.hex)
		assert.Equal(t, tt.g, g, "G for %s", tt.hex)
		assert.Equal(t, tt.b, b, "B for %s", tt.hex)
	}
}

// ---------------------------------------------------------------------------
// DrawHeader variants
// ---------------------------------------------------------------------------

func TestDrawHeader_WithLogoAndName(t *testing.T) {
	doc, _ := NewPDFDoc("#336699", "Mi Empresa", true, nil)
	doc.hasLogo = false // skip actual image, test layout logic

	doc.AddPage()
	y := doc.DrawHeader("Presupuesto")
	assert.Greater(t, y, MarginTop)
}

func TestDrawHeader_NoLogoNoName(t *testing.T) {
	doc, _ := NewPDFDoc("#336699", "", false, nil)

	doc.AddPage()
	y := doc.DrawHeader("Presupuesto")
	assert.Greater(t, y, MarginTop)
}

// ---------------------------------------------------------------------------
// EnsureSpace
// ---------------------------------------------------------------------------

func TestEnsureSpace_EnoughSpace(t *testing.T) {
	doc, _ := NewPDFDoc("#000", "Test", true, nil)
	doc.AddPage()

	y := doc.EnsureSpace(50, 20)
	assert.Equal(t, 50.0, y) // no page break
}

func TestEnsureSpace_NotEnoughSpace(t *testing.T) {
	doc, _ := NewPDFDoc("#000", "Test", true, nil)
	doc.AddPage()

	y := doc.EnsureSpace(PageHeight-10, 30) // near bottom, needs 30mm
	assert.Equal(t, MarginTop, y)           // new page started
}

// ---------------------------------------------------------------------------
// Default contract template — all tokens resolve
// ---------------------------------------------------------------------------

func TestResolveTokens_DefaultContractTemplate(t *testing.T) {
	data := sampleTokenData()
	template := `1. El Proveedor es una empresa dedicada a [Tipo de servicio], [Nombre comercial del proveedor], y cuenta con la capacidad para la prestación de dicho servicio.
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
El Cliente deberá cubrir un anticipo del [Porcentaje de anticipo]% para reservar la fecha.

Quinta. Condiciones del Servicio
El Cliente se compromete a facilitar un espacio adecuado.

Sexta. Cancelaciones y Reembolsos
En caso de cancelación por parte del Cliente con menos de [Días de cancelación] días de anticipación, no se realizará reembolso del apartado.
Cuando la cancelación se realice dentro del plazo permitido, se reembolsará el [Porcentaje de reembolso]% del apartado.

Octava. Jurisdicción
Para cualquier disputa derivada de este contrato, las partes se someten a la jurisdicción de los tribunales competentes de [Ciudad del contrato].

Firmas:
Proveedor: [Nombre del proveedor]
Cliente: [Nombre del cliente]`

	result := ResolveTokens(template, data)

	// Verify all tokens are resolved (no brackets remaining except [Type of service] etc.)
	// We check that known tokens are replaced
	assert.NotContains(t, result, "[Nombre del cliente]")
	assert.NotContains(t, result, "[Fecha del evento]")
	assert.NotContains(t, result, "[Monto total del evento]")
	assert.NotContains(t, result, "[Tipo de servicio]")
	assert.NotContains(t, result, "[Horario del evento]")
	assert.NotContains(t, result, "[Número de personas]")
	assert.NotContains(t, result, "[Servicios del evento]")
	assert.NotContains(t, result, "[Total pagado]")
	assert.NotContains(t, result, "[Porcentaje de anticipo]")
	assert.NotContains(t, result, "[Días de cancelación]")
	assert.NotContains(t, result, "[Porcentaje de reembolso]")
	assert.NotContains(t, result, "[Ciudad del contrato]")
	assert.NotContains(t, result, "[Nombre del proveedor]")
	assert.NotContains(t, result, "[Nombre comercial del proveedor]")
	assert.NotContains(t, result, "[Lugar del evento]")

	// Verify resolved values
	assert.Contains(t, result, "María García López")
	assert.Contains(t, result, "15 de junio de 2026")
	assert.Contains(t, result, "$45,000.00")
	assert.Contains(t, result, "Banquete")
	assert.Contains(t, result, "14:00 - 22:00")
	assert.Contains(t, result, "150")
	assert.Contains(t, result, "$22,500.00")
	assert.Contains(t, result, "50%")
	assert.Contains(t, result, "15 días")
	assert.Contains(t, result, "80%")
	assert.Contains(t, result, "Ciudad de México")
	assert.Contains(t, result, "Juan Eventos")
	assert.Contains(t, result, "Mi Empresa de Eventos")
	assert.Contains(t, result, "Salón Los Arcos")

	// No %% artifacts
	assert.NotContains(t, result, "%%")
}

// Make sure unused imports are satisfied
var _ = uuid.Nil
