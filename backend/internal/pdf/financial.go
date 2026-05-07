package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// FinancialSummary holds computed financial values for an event.
type FinancialSummary struct {
	PreDiscountSubtotal float64
	DiscountAmount      float64
	DiscountLabel       string
	HasDiscount         bool
	TaxAmount           float64
	TaxRate             float64
	ShowTax             bool
	TotalAmount         float64
	DepositPercent      float64
	DepositAmount       float64
	HasDeposit          bool
}

// ComputeFinancialSummary calculates all financial values from an event,
// honoring discount_type (percent vs fixed) and tax settings.
// This logic MUST match the web's generateBudgetPDF and generateInvoicePDF.
func ComputeFinancialSummary(event models.Event, totalPaid float64) FinancialSummary {
	rawDiscount := event.Discount
	taxAmount := event.TaxAmount

	// Compute discount amount based on type
	var discountAmount float64
	var discountLabel string
	switch event.DiscountType {
	case "percent":
		// subtotalForDiscount = total - tax (discount applies before tax)
		subtotalForDiscount := event.TotalAmount - taxAmount
		discountAmount = subtotalForDiscount * rawDiscount / 100
		discountLabel = fmt.Sprintf("Descuento (%.0f%%)", rawDiscount)
	default: // "fixed"
		discountAmount = rawDiscount
		discountLabel = "Descuento"
	}

	preDiscountSubtotal := (event.TotalAmount - taxAmount) + discountAmount

	// Deposit
	var depositPercent float64
	if event.DepositPercent != nil {
		depositPercent = *event.DepositPercent
	}

	return FinancialSummary{
		PreDiscountSubtotal: preDiscountSubtotal,
		DiscountAmount:      discountAmount,
		DiscountLabel:       discountLabel,
		HasDiscount:         rawDiscount > 0,
		TaxAmount:           taxAmount,
		TaxRate:             event.TaxRate,
		ShowTax:             event.RequiresInvoice || taxAmount > 0,
		TotalAmount:         event.TotalAmount,
		DepositPercent:      depositPercent,
		DepositAmount:       event.TotalAmount * depositPercent / 100,
		HasDeposit:          depositPercent > 0,
	}
}

// PaymentMethodLabel returns the Spanish label for a payment method code.
func PaymentMethodLabel(method string) string {
	labels := map[string]string{
		"cash":     "Efectivo",
		"transfer": "Transferencia",
		"card":     "Tarjeta",
		"check":    "Cheque",
		"other":    "Otro",
		"deposit":  "Depósito",
		"credit":   "Crédito",
	}
	if label, ok := labels[method]; ok {
		return label
	}
	return method
}

// DrawFinancialSummary renders the financial summary block (subtotal, discount, IVA, total).
// Returns the Y position after the summary.
func (d *PDFDoc) DrawFinancialSummary(y float64, fs FinancialSummary) float64 {
	summaryX := PageWidth - MarginRight - 65

	// Separator line
	d.SetDrawColor(200, 200, 200)
	d.SetLineWidth(0.3)
	d.Line(summaryX, y, PageWidth-MarginRight, y)
	y += 7

	// Subtotal
	y = d.DrawSummaryRow(y, "Subtotal:", FormatCurrency(fs.PreDiscountSubtotal), false)

	// Discount
	if fs.HasDiscount {
		d.SetBrandColor()
		y = d.DrawSummaryRow(y, fs.DiscountLabel+":", "-"+FormatCurrency(fs.DiscountAmount), false)
		d.SetTextColorDefault()
	}

	// IVA
	if fs.ShowTax {
		label := fmt.Sprintf("IVA (%.0f%%):", fs.TaxRate)
		y = d.DrawSummaryRow(y, label, FormatCurrency(fs.TaxAmount), false)
	}

	// Total
	y += 2
	d.SetBrandColor()
	d.SetFont(FontDejaVuSansBold, "", 13)
	d.Text(summaryX, y, "TOTAL:")
	totalStr := FormatCurrency(fs.TotalAmount)
	valW := d.GetStringWidth(totalStr)
	d.Text(PageWidth-MarginRight-valW, y, totalStr)
	d.SetTextColorDefault()
	y += 8

	return y
}

// DrawDepositInfo renders the deposit requirement line.
func (d *PDFDoc) DrawDepositInfo(y float64, fs FinancialSummary) float64 {
	if !fs.HasDeposit {
		return y
	}
	d.SetFont(FontDejaVuSans, "", 9)
	d.SetTextColorDefault()
	text := fmt.Sprintf("Se requiere un anticipo del %.0f%% (%s) para confirmar la reserva.", fs.DepositPercent, FormatCurrency(fs.DepositAmount))
	d.SetXY(MarginLeft, y)
	d.MultiCell(ContentWidth, 4, text, "", "", false)
	y = d.GetY() + 3
	return y
}
