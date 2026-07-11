package financial

import (
	"math"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// EventFinancialResult is the canonical margin/cost breakdown for an event.
// Mirrors iOS EventFinancials.Result and web EventFinancials.compute().
type EventFinancialResult struct {
	ProductsSubtotal          float64 `json:"products_subtotal"`
	NormalExtrasSubtotal      float64 `json:"normal_extras_subtotal"`
	PassThroughExtrasSubtotal float64 `json:"pass_through_extras_subtotal"`
	DiscountableBase          float64 `json:"discountable_base"`
	DiscountAmount            float64 `json:"discount_amount"`
	AfterDiscount             float64 `json:"after_discount"`
	TaxAmount                 float64 `json:"tax_amount"`
	Total                     float64 `json:"total"`
	ProductCost               float64 `json:"product_cost"`
	ExtrasCost                float64 `json:"extras_cost"`
	SuppliesCost              float64 `json:"supplies_cost"`
	TotalCost                 float64 `json:"total_cost"`
	Revenue                   float64 `json:"revenue"`
	NetProfit                 float64 `json:"net_profit"`
	AdjustedRevenue           float64 `json:"adjusted_revenue"`
	ProfitMargin              float64 `json:"profit_margin"`
}

// ProductUnitCost sums ingredient/supply recipe costs for one product.
// Matches iOS EventDetailViewModel.loadProductUnitCosts and Android EventFormViewModel.
func ProductUnitCost(ingredients []models.ProductIngredient) float64 {
	cost := 0.0
	for _, ing := range ingredients {
		if ing.Type != nil {
			t := *ing.Type
			if t != "ingredient" && t != "supply" {
				continue
			}
		}
		unitCost := 0.0
		if ing.UnitCost != nil {
			unitCost = *ing.UnitCost
		}
		cost += unitCost * ing.QuantityRequired
	}
	return cost
}

// ComputeEventFinancials calculates revenue, costs, and margin for an event.
func ComputeEventFinancials(
	event models.Event,
	products []models.EventProduct,
	extras []models.EventExtra,
	supplies []models.EventSupply,
	productUnitCosts map[string]float64,
) EventFinancialResult {
	productsSubtotal := 0.0
	productCost := 0.0
	for _, product := range products {
		qty := product.Quantity
		if qty == 0 {
			qty = 1
		}
		productsSubtotal += (product.UnitPrice - product.Discount) * qty
		unitCost := productUnitCosts[product.ProductID.String()]
		productCost += unitCost * qty
	}

	normalExtrasSubtotal := 0.0
	passThroughExtrasSubtotal := 0.0
	extrasCost := 0.0
	for _, extra := range extras {
		extrasCost += extra.Cost
		if extra.ExcludeUtility {
			passThroughExtrasSubtotal += extra.Price
		} else {
			normalExtrasSubtotal += extra.Price
		}
	}

	discountableBase := productsSubtotal + normalExtrasSubtotal
	rawDiscount := event.Discount
	discountAmount := rawDiscount
	if event.DiscountType == "percent" {
		clamped := math.Max(0, math.Min(100, rawDiscount))
		discountAmount = discountableBase * clamped / 100
	} else if discountAmount > discountableBase {
		discountAmount = discountableBase
	} else if discountAmount < 0 {
		discountAmount = 0
	}

	afterDiscount := math.Max(0, discountableBase-discountAmount)
	baseTotal := afterDiscount + passThroughExtrasSubtotal
	taxAmount := 0.0
	if event.RequiresInvoice {
		taxAmount = baseTotal * event.TaxRate / 100
	}
	total := baseTotal + taxAmount

	suppliesCost := 0.0
	for _, supply := range supplies {
		if supply.ExcludeCost {
			continue
		}
		suppliesCost += supply.Quantity * supply.UnitCost
	}
	totalCost := productCost + extrasCost + suppliesCost

	revenue := total
	if event.RequiresInvoice {
		revenue -= taxAmount
	}
	netProfit := revenue - totalCost
	adjustedRevenue := revenue - passThroughExtrasSubtotal
	profitMargin := 0.0
	if adjustedRevenue > 0 {
		profitMargin = (netProfit / adjustedRevenue) * 100
	}

	return EventFinancialResult{
		ProductsSubtotal:          round2(productsSubtotal),
		NormalExtrasSubtotal:      round2(normalExtrasSubtotal),
		PassThroughExtrasSubtotal: round2(passThroughExtrasSubtotal),
		DiscountableBase:          round2(discountableBase),
		DiscountAmount:            round2(discountAmount),
		AfterDiscount:             round2(afterDiscount),
		TaxAmount:                 round2(taxAmount),
		Total:                     round2(total),
		ProductCost:               round2(productCost),
		ExtrasCost:                round2(extrasCost),
		SuppliesCost:              round2(suppliesCost),
		TotalCost:                 round2(totalCost),
		Revenue:                   round2(revenue),
		NetProfit:                 round2(netProfit),
		AdjustedRevenue:           round2(adjustedRevenue),
		ProfitMargin:              profitMargin,
	}
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}