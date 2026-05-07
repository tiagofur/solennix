package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// PaymentReportData holds all data needed to generate a Payment Report PDF.
type PaymentReportData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Payments  []models.Payment
	LogoBytes []byte
}

// GeneratePaymentReport creates a Reporte de Pagos PDF and returns the raw bytes.
func GeneratePaymentReport(data PaymentReportData) ([]byte, error) {
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
	y := doc.DrawHeader("Reporte de Pagos")

	// ── Client + Event Info Grid ──
	clientName := "N/A"
	if data.Client != nil {
		clientName = data.Client.Name
	}

	eventDate := FormatDate(data.Event.EventDate)

	leftItems := [][2]string{
		{"Cliente", clientName},
		{"Evento", data.Event.ServiceType},
	}
	rightItems := [][2]string{
		{"Fecha", eventDate},
		{"Total del Evento", FormatCurrency(data.Event.TotalAmount)},
	}
	y = doc.DrawInfoGrid(y, leftItems, rightItems)
	y += 5

	// ── Payments Table ──
	// 4 columns: Date | Method | Note | Amount
	colWidths := []float64{ContentWidth * 0.20, ContentWidth * 0.25, ContentWidth * 0.30, ContentWidth * 0.25}
	headers := []string{"Fecha", "Método", "Nota", "Monto"}
	y = drawTableHeader(doc, y, headers, colWidths)

	if len(data.Payments) > 0 {
		for _, p := range data.Payments {
			y = doc.EnsureSpace(y, 8)

			note := "-"
			if p.Notes != nil && *p.Notes != "" {
				note = *p.Notes
			}

			drawTableRow(doc, y, []string{
				p.PaymentDate,
				PaymentMethodLabel(p.PaymentMethod),
				note,
				FormatCurrency(p.Amount),
			}, colWidths)
		}
	} else {
		doc.SetFont(FontDejaVuSans, "", 9)
		doc.SetTextColorSecondary()
		doc.Text(MarginLeft, y, "No hay pagos registrados.")
		y += 15
	}

	y += 12

	// ── Summary ──
	totalPaid := 0.0
	for _, p := range data.Payments {
		totalPaid += p.Amount
	}
	balance := data.Event.TotalAmount - totalPaid

	doc.SetFont(FontDejaVuSans, "", 10)
	doc.SetTextColorDefault()

	// Total Pagado (right-aligned)
	paidLabel := "Total Pagado: " + FormatCurrency(totalPaid)
	paidW := doc.GetStringWidth(paidLabel)
	doc.Text(PageWidth-MarginRight-paidW, y, paidLabel)
	y += 8

	// Balance
	doc.SetFont(FontDejaVuSansBold, "", 11)
	if balance > 0 {
		doc.SetTextColor(180, 0, 0) // red
		balLabel := "Saldo Pendiente: " + FormatCurrency(balance)
		balW := doc.GetStringWidth(balLabel)
		doc.Text(PageWidth-MarginRight-balW, y, balLabel)
	} else {
		doc.SetTextColor(0, 150, 0) // green
		balLabel := "Saldo Favor / Completado: " + FormatCurrency(-balance)
		balW := doc.GetStringWidth(balLabel)
		doc.Text(PageWidth-MarginRight-balW, y, balLabel)
	}
	doc.SetTextColorDefault()
	y += 15

	// ── Signature Line ──
	signY := PageHeight - 40
	signCenterX := PageWidth / 2

	doc.SetDrawColor(180, 180, 180)
	doc.SetLineWidth(0.3)
	doc.Line(signCenterX-35, signY, signCenterX+35, signY)

	doc.SetFont(FontDejaVuSans, "", 8)
	doc.SetTextColorSecondary()
	signLabel := "Recibido por"
	if data.Profile.BusinessName != nil && *data.Profile.BusinessName != "" {
		signLabel = *data.Profile.BusinessName
	}
	labelW := doc.GetStringWidth(signLabel)
	doc.Text(signCenterX-labelW/2, signY+5, signLabel)

	return doc.Output()
}
