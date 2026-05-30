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
// This is the legacy fallback for documents that do not have item rows loaded.
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

	return financialSummaryFromAmounts(event, preDiscountSubtotal, discountAmount, discountLabel, taxAmount, event.TotalAmount)
}

// ComputeFinancialSummaryFromItems recalculates the customer-facing document
// totals from the exact product and extra rows rendered in the PDF.
//
// Products and normal extras are discountable. Pass-through extras
// (exclude_utility=true) are still charged to the client, but are not discounted.
// This MUST match the event and quick quote frontend calculations.
func ComputeFinancialSummaryFromItems(event models.Event, products []models.EventProduct, extras []models.EventExtra, totalPaid float64) FinancialSummary {
	if len(products) == 0 && len(extras) == 0 {
		return ComputeFinancialSummary(event, totalPaid)
	}

	productsSubtotal := 0.0
	for _, product := range products {
		qty := product.Quantity
		if qty == 0 {
			qty = 1
		}
		productsSubtotal += (product.UnitPrice - product.Discount) * qty
	}

	normalExtrasTotal := 0.0
	passThroughExtrasTotal := 0.0
	for _, extra := range extras {
		if extra.ExcludeUtility {
			passThroughExtrasTotal += extra.Price
		} else {
			normalExtrasTotal += extra.Price
		}
	}

	rawDiscount := event.Discount
	discountableBase := productsSubtotal + normalExtrasTotal
	discountAmount := rawDiscount
	discountLabel := "Descuento"
	if event.DiscountType == "percent" {
		discountAmount = discountableBase * rawDiscount / 100
		discountLabel = fmt.Sprintf("Descuento (%.0f%%)", rawDiscount)
	} else if discountAmount > discountableBase {
		discountAmount = discountableBase
	}

	baseTotal := (discountableBase - discountAmount) + passThroughExtrasTotal
	taxAmount := 0.0
	if event.RequiresInvoice {
		taxAmount = baseTotal * event.TaxRate / 100
	}
	totalAmount := baseTotal + taxAmount
	preDiscountSubtotal := discountableBase + passThroughExtrasTotal

	return financialSummaryFromAmounts(event, preDiscountSubtotal, discountAmount, discountLabel, taxAmount, totalAmount)
}

func financialSummaryFromAmounts(event models.Event, preDiscountSubtotal, discountAmount float64, discountLabel string, taxAmount, totalAmount float64) FinancialSummary {
	var depositPercent float64
	if event.DepositPercent != nil {
		depositPercent = *event.DepositPercent
	}

	return FinancialSummary{
		PreDiscountSubtotal: preDiscountSubtotal,
		DiscountAmount:      discountAmount,
		DiscountLabel:       discountLabel,
		HasDiscount:         event.Discount > 0,
		TaxAmount:           taxAmount,
		TaxRate:             event.TaxRate,
		ShowTax:             event.RequiresInvoice || taxAmount > 0,
		TotalAmount:         totalAmount,
		DepositPercent:      depositPercent,
		DepositAmount:       totalAmount * depositPercent / 100,
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

// EstimateFinancialSummaryHeight returns the vertical space required for the
// summary block plus the optional deposit note.
func (d *PDFDoc) EstimateFinancialSummaryHeight(fs FinancialSummary) float64 {
	height := 7.0 + 6.0
	if fs.HasDiscount {
		height += 6.0
	}
	if fs.ShowTax {
		height += 6.0
	}
	height += 10.0
	if fs.HasDeposit {
		text := fmt.Sprintf("Se requiere un anticipo del %.0f%% (%s) para confirmar la reserva.", fs.DepositPercent, FormatCurrency(fs.DepositAmount))
		height += float64(len(d.SplitText(text, ContentWidth)))*4.0 + 3.0
	}
	return height
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
