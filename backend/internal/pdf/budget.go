package pdf

import (
	"fmt"
	"strings"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// BudgetData holds all data needed to generate a Budget PDF.
type BudgetData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Products  []models.EventProduct
	Extras    []models.EventExtra
	LogoBytes []byte // optional — fetched by handler from profile.logo_url
}

// GenerateBudget creates a Presupuesto PDF and returns the raw bytes.
func GenerateBudget(data BudgetData) ([]byte, error) {
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
	y := doc.DrawHeader("Presupuesto")

	// ── Client + Event Info Grid ──
	clientName := "N/A"
	clientPhone := "N/A"
	clientEmail := "N/A"
	if data.Client != nil {
		clientName = data.Client.Name
		clientPhone = data.Client.Phone
		if data.Client.Email != nil {
			clientEmail = *data.Client.Email
		}
	}

	eventDate := FormatDate(data.Event.EventDate)
	startTime := "Por definir"
	if data.Event.StartTime != nil {
		startTime = *data.Event.StartTime
	}
	endTime := "Por definir"
	if data.Event.EndTime != nil {
		endTime = *data.Event.EndTime
	}
	schedule := startTime + " - " + endTime

	leftItems := [][2]string{
		{"Cliente", clientName},
		{"Teléfono", clientPhone},
		{"Email", clientEmail},
	}
	rightItems := [][2]string{
		{"Fecha", eventDate},
		{"Horario", schedule},
		{"Personas", fmt.Sprintf("%d", data.Event.NumPeople)},
	}
	y = doc.DrawInfoGrid(y, leftItems, rightItems)
	y += 5

	// ── Products & Services Table ──
	y = doc.DrawSectionHeader(y, "Productos y Servicios")

	// Column widths: Description | Qty | Unit Price | Total
	colWidths := []float64{ContentWidth * 0.40, ContentWidth * 0.15, ContentWidth * 0.22, ContentWidth * 0.23}
	headers := []string{"Descripción", "Cant.", "Precio Unit.", "Total"}

	// Draw table header
	y = drawTableHeader(doc, y, headers, colWidths)

	// Draw rows
	rowCount := 0
	for _, p := range data.Products {
		name := "Producto"
		if p.ProductName != nil {
			name = *p.ProductName
		}
		qty := p.Quantity
		if qty == 0 {
			qty = 1
		}
		unitPrice := p.UnitPrice
		discount := p.Discount
		lineTotal := (unitPrice - discount) * qty

		y = doc.EnsureSpace(y, 8)
		drawTableRow(doc, y, []string{
			name,
			fmt.Sprintf("%.0f", qty),
			FormatCurrency(unitPrice),
			FormatCurrency(lineTotal),
		}, colWidths)
		rowCount++
	}

	for _, e := range data.Extras {
		y = doc.EnsureSpace(y, 8)
		drawTableRow(doc, y, []string{
			e.Description,
			"1",
			FormatCurrency(e.Price),
			FormatCurrency(e.Price),
		}, colWidths)
		rowCount++
	}

	if rowCount == 0 {
		doc.SetFont(FontDejaVuSans, "", 9)
		doc.SetTextColorSecondary()
		doc.Text(MarginLeft, y, "No hay productos o servicios registrados.")
		y += 8
	}

	y += 10

	// ── Financial Summary ──
	fs := ComputeFinancialSummary(data.Event, 0)
	y = doc.DrawFinancialSummary(y, fs)

	// ── Deposit Info ──
	y = doc.DrawDepositInfo(y, fs)

	// ── Validity Note (footer) ──
	doc.SetFont(FontDejaVuSans, "", 8)
	doc.SetTextColorSecondary()
	doc.Text(MarginLeft, PageHeight-10, "Este presupuesto tiene una validez de 15 días.")

	return doc.Output()
}

// drawTableHeader draws a table header row with brand-colored text.
func drawTableHeader(doc *PDFDoc, y float64, headers []string, colWidths []float64) float64 {
	doc.SetFont(FontDejaVuSansBold, "", 8)
	doc.SetBrandColor()

	// Background
	doc.SetFillColor(245, 245, 245)
	doc.Rect(MarginLeft, y-3, ContentWidth, 7, "F")

	x := MarginLeft
	for i, h := range headers {
		doc.Text(x+2, y+1, h)
		x += colWidths[i]
	}

	// Bottom border
	doc.SetBrandColor()
	doc.SetLineWidth(0.3)
	doc.Line(MarginLeft, y+4, MarginLeft+ContentWidth, y+4)
	y += 8

	return y
}

// drawTableRow draws a single table row.
func drawTableRow(doc *PDFDoc, y float64, cells []string, colWidths []float64) {
	doc.SetFont(FontDejaVuSans, "", 8)
	doc.SetTextColorDefault()

	x := MarginLeft
	for i, cell := range cells {
		// Right-align numeric columns (index 1, 2, 3)
		align := "L"
		if i > 0 {
			align = "R"
		}

		cellX := x
		if align == "R" {
			w := doc.GetStringWidth(cell)
			cellX = x + colWidths[i] - w - 2
		} else {
			cellX = x + 2
		}
		doc.Text(cellX, y+1, cell)
		x += colWidths[i]
	}

	// Subtle row separator
	doc.SetDrawColor(230, 230, 230)
	doc.SetLineWidth(0.1)
	doc.Line(MarginLeft, y+3.5, MarginLeft+ContentWidth, y+3.5)
}

// buildProductsList returns a human-readable list of products for contracts.
func buildProductsList(products []models.EventProduct) string {
	if len(products) == 0 {
		return ""
	}
	parts := make([]string, 0, len(products))
	for _, p := range products {
		qty := p.Quantity
		if qty == 0 {
			qty = 1
		}
		name := "Producto"
		if p.ProductName != nil {
			name = *p.ProductName
		}
		parts = append(parts, fmt.Sprintf("%.0f %s", qty, name))
	}
	return strings.Join(parts, ", ")
}
