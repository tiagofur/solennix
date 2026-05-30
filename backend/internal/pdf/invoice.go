package pdf

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// InvoiceData holds all data needed to generate an Invoice PDF.
type InvoiceData struct {
	Event    models.Event
	Client   *models.Client
	Profile  *models.User
	Products []models.EventProduct
	Extras   []models.EventExtra
}

// GenerateInvoice creates a Factura PDF and returns the raw bytes.
func GenerateInvoice(data InvoiceData) ([]byte, error) {
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
	y := doc.DrawHeader("Factura")

	// ── Invoice Number & Date (right-aligned) ──
	eventID := uuid.UUID{}.String()
	if data.Event.ID != uuid.Nil {
		eventID = data.Event.ID.String()
	}
	invoiceNumber := "INV-" + strings.ToUpper(eventID[:8])
	invoiceDate := FormatDate(time.Now().Format("2006-01-02"))

	doc.SetFont(FontDejaVuSansBold, "", 9)
	doc.SetTextColorDefault()
	labelX := PageWidth - MarginRight - 65
	valueX := PageWidth - MarginRight

	doc.Text(labelX, y, "No. Factura:")
	doc.SetFont(FontDejaVuSans, "", 9)
	w := doc.GetStringWidth(invoiceNumber)
	doc.Text(valueX-w, y, invoiceNumber)
	y += 6

	doc.SetFont(FontDejaVuSansBold, "", 9)
	doc.Text(labelX, y, "Fecha Emisión:")
	doc.SetFont(FontDejaVuSans, "", 9)
	w = doc.GetStringWidth(invoiceDate)
	doc.Text(valueX-w, y, invoiceDate)
	y += 12

	// ── Emisor ──
	y = doc.DrawSectionHeader(y, "DATOS DEL EMISOR")
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()

	emisorName := data.Profile.Name
	if data.Profile.BusinessName != nil && *data.Profile.BusinessName != "" {
		emisorName = *data.Profile.BusinessName
	}
	doc.Text(MarginLeft, y, "Razón Social: "+emisorName)
	y += 5
	doc.Text(MarginLeft, y, "Email: "+data.Profile.Email)
	y += 5
	doc.Text(MarginLeft, y, "RFC: [Pendiente de configurar en ajustes]")
	y += 5
	doc.Text(MarginLeft, y, "Régimen Fiscal: [Pendiente de configurar en ajustes]")
	y += 10

	// ── Receptor ──
	y = doc.DrawSectionHeader(y, "DATOS DEL RECEPTOR")
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()

	if data.Client != nil {
		doc.Text(MarginLeft, y, "Cliente: "+data.Client.Name)
		y += 5
		doc.Text(MarginLeft, y, "Teléfono: "+data.Client.Phone)
		y += 5
		if data.Client.Email != nil {
			doc.Text(MarginLeft, y, "Email: "+*data.Client.Email)
			y += 5
		}
		if data.Client.Address != nil {
			doc.Text(MarginLeft, y, "Dirección: "+*data.Client.Address)
			y += 5
		}
	}
	y += 10

	// ── Event Details ──
	y = doc.DrawSectionHeader(y, "DETALLES DEL EVENTO")
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()

	doc.Text(MarginLeft, y, "Fecha del Evento: "+FormatDate(data.Event.EventDate))
	y += 5
	doc.Text(MarginLeft, y, "Servicio: "+data.Event.ServiceType)
	y += 5
	doc.Text(MarginLeft, y, fmt.Sprintf("Personas: %d", data.Event.NumPeople))
	y += 5
	if data.Event.Location != nil {
		doc.Text(MarginLeft, y, "Ubicación: "+*data.Event.Location)
		y += 5
	}
	y += 10

	// ── Concepts Table ──
	y = doc.DrawSectionHeader(y, "CONCEPTOS")

	// 5 columns: Description | Qty | Unit Price | Discount | Subtotal
	colWidths := []float64{ContentWidth * 0.35, ContentWidth * 0.10, ContentWidth * 0.18, ContentWidth * 0.17, ContentWidth * 0.20}
	headers := []string{"Descripción", "Cant.", "Precio Unit.", "Desc.", "Subtotal"}
	y = drawTableHeader(doc, y, headers, colWidths)

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
		subtotal := (unitPrice - discount) * qty

		y = doc.EnsureSpace(y, 8)
		drawTableRow(doc, y, []string{
			name,
			fmt.Sprintf("%.0f", qty),
			FormatCurrency(unitPrice),
			FormatCurrency(discount),
			FormatCurrency(subtotal),
		}, colWidths)
		rowCount++
	}

	for _, e := range data.Extras {
		y = doc.EnsureSpace(y, 8)
		drawTableRow(doc, y, []string{
			e.Description,
			"1",
			FormatCurrency(e.Price),
			"$0.00",
			FormatCurrency(e.Price),
		}, colWidths)
		rowCount++
	}

	if rowCount == 0 {
		doc.SetFont(FontDejaVuSans, "", 9)
		doc.SetTextColorSecondary()
		doc.Text(MarginLeft, y, "No hay conceptos registrados.")
		y += 8
	}
	y += 10

	// ── Financial Summary ──
	fs := ComputeFinancialSummaryFromItems(data.Event, data.Products, data.Extras, 0)
	y = doc.DrawFinancialSummary(y, fs)

	// Payment method note
	y += 5
	doc.SetFont(FontDejaVuSans, "", 9)
	doc.SetTextColorDefault()
	summaryX := PageWidth - MarginRight - 70
	doc.Text(summaryX, y, "Forma de Pago: Pendiente de liquidar")

	// ── Footer ──
	doc.SetFont(FontDejaVuSansOblique, "", 7)
	doc.SetTextColorSecondary()
	footerText := "Este documento es una factura simplificada. Para factura fiscal completa, solicitar con RFC y datos fiscales."
	fw := doc.GetStringWidth(footerText)
	doc.Text((PageWidth-fw)/2, PageHeight-15, footerText)

	genText := "Generado el " + invoiceDate
	gw := doc.GetStringWidth(genText)
	doc.Text((PageWidth-gw)/2, PageHeight-10, genText)

	return doc.Output()
}
