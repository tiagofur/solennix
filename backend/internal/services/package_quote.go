package services

import (
	"math"
	"sort"
)

// PricingUnit is how a package line multiplies.
type PricingUnit string

const (
	PricingUnitPerGuest PricingUnit = "per_guest"
	PricingUnitPerEvent PricingUnit = "per_event"
)

// PackageQuoteLineInput is one catalog line for quote calculation.
type PackageQuoteLineInput struct {
	ProductID   string
	Name        string
	UnitPrice   float64
	PricingUnit PricingUnit
}

// PackageDiscountTierInput is a guest-count % tier.
type PackageDiscountTierInput struct {
	FromGuests      int
	DiscountPercent float64
}

// PackageQuoteLine is one computed line in a quote.
type PackageQuoteLine struct {
	ProductID   string  `json:"product_id"`
	Name        string  `json:"name"`
	UnitPrice   float64 `json:"unit_price"`
	PricingUnit string  `json:"pricing_unit"`
	Quantity    int     `json:"quantity"`
	LineTotal   float64 `json:"line_total"`
}

// PackageQuote is the full computed (or snapshotted) package quote.
type PackageQuote struct {
	PackageID         string             `json:"package_id"`
	PackageTitle      string             `json:"package_title"`
	GuestCount        int                `json:"guest_count"`
	MinGuests         *int               `json:"min_guests,omitempty"`
	Lines             []PackageQuoteLine `json:"lines"`
	Subtotal          float64            `json:"subtotal"`
	DiscountPercent   float64            `json:"discount_percent"`
	DiscountAmount    float64            `json:"discount_amount"`
	Total             float64            `json:"total"`
	AppliedFromGuests *int               `json:"applied_from_guests,omitempty"`
	Currency          string             `json:"currency"`
}

// MaxPackageDiscountTiers is the product cap for discount tiers.
const MaxPackageDiscountTiers = 3

// CalculatePackageQuote builds a quote for guests using live unit prices.
// Returns ok=false when guests are below min_guests (when set).
func CalculatePackageQuote(
	packageID, packageTitle, currency string,
	guests int,
	minGuests *int,
	lines []PackageQuoteLineInput,
	tiers []PackageDiscountTierInput,
) (PackageQuote, bool) {
	if guests < 1 {
		guests = 1
	}
	if minGuests != nil && *minGuests > 0 && guests < *minGuests {
		return PackageQuote{}, false
	}

	outLines := make([]PackageQuoteLine, 0, len(lines))
	var subtotal float64
	for _, ln := range lines {
		unit := ln.PricingUnit
		if unit != PricingUnitPerGuest && unit != PricingUnitPerEvent {
			unit = PricingUnitPerEvent
		}
		qty := 1
		if unit == PricingUnitPerGuest {
			qty = guests
		}
		lineTotal := roundMoney(ln.UnitPrice * float64(qty))
		subtotal += lineTotal
		outLines = append(outLines, PackageQuoteLine{
			ProductID:   ln.ProductID,
			Name:        ln.Name,
			UnitPrice:   roundMoney(ln.UnitPrice),
			PricingUnit: string(unit),
			Quantity:    qty,
			LineTotal:   lineTotal,
		})
	}
	subtotal = roundMoney(subtotal)

	// Highest from_guests tier that guests still satisfy.
	sorted := append([]PackageDiscountTierInput(nil), tiers...)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].FromGuests > sorted[j].FromGuests
	})
	var discPct float64
	var appliedFrom *int
	for _, t := range sorted {
		if t.FromGuests <= guests {
			discPct = t.DiscountPercent
			if discPct < 0 {
				discPct = 0
			}
			if discPct > 100 {
				discPct = 100
			}
			fg := t.FromGuests
			appliedFrom = &fg
			break
		}
	}

	discAmt := roundMoney(subtotal * discPct / 100)
	total := roundMoney(subtotal - discAmt)
	if total < 0 {
		total = 0
	}
	if currency == "" {
		currency = "MXN"
	}

	return PackageQuote{
		PackageID:         packageID,
		PackageTitle:      packageTitle,
		GuestCount:        guests,
		MinGuests:         minGuests,
		Lines:             outLines,
		Subtotal:          subtotal,
		DiscountPercent:   discPct,
		DiscountAmount:    discAmt,
		Total:             total,
		AppliedFromGuests: appliedFrom,
		Currency:          currency,
	}, true
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}
