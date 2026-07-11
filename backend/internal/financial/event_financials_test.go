package financial

import (
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func TestPassThroughExtrasExcludedFromMarginDenominator(t *testing.T) {
	productID := uuid.New()
	costs := map[string]float64{productID.String(): 300}

	result := ComputeEventFinancials(
		models.Event{DiscountType: "fixed"},
		[]models.EventProduct{{ProductID: productID, Quantity: 1, UnitPrice: 1000}},
		[]models.EventExtra{
			{Price: 500, Cost: 100, ExcludeUtility: false},
			{Price: 200, Cost: 0, ExcludeUtility: true},
		},
		nil,
		costs,
	)

	if result.DiscountableBase != 1500 {
		t.Fatalf("discountableBase = %v, want 1500", result.DiscountableBase)
	}
	if result.PassThroughExtrasSubtotal != 200 {
		t.Fatalf("passThrough = %v, want 200", result.PassThroughExtrasSubtotal)
	}
	if result.Total != 1700 {
		t.Fatalf("total = %v, want 1700", result.Total)
	}
	if result.AdjustedRevenue != 1500 {
		t.Fatalf("adjustedRevenue = %v, want 1500", result.AdjustedRevenue)
	}
	if result.TotalCost != 400 {
		t.Fatalf("totalCost = %v, want 400", result.TotalCost)
	}
	wantMargin := 1300.0 / 1500.0 * 100
	if diff := result.ProfitMargin - wantMargin; diff > 0.01 || diff < -0.01 {
		t.Fatalf("profitMargin = %v, want ~%v", result.ProfitMargin, wantMargin)
	}
}

func TestIngredientAndSupplyCostsBothCounted(t *testing.T) {
	ingType := "ingredient"
	supType := "supply"
	equipType := "equipment"

	cost := ProductUnitCost([]models.ProductIngredient{
		{Type: &ingType, UnitCost: float64Ptr(10), QuantityRequired: 5},
		{Type: &supType, UnitCost: float64Ptr(3), QuantityRequired: 2},
		{Type: &equipType, UnitCost: float64Ptr(100), QuantityRequired: 1},
	})
	if cost != 56 {
		t.Fatalf("product unit cost = %v, want 56", cost)
	}

	productID := uuid.New()
	result := ComputeEventFinancials(
		models.Event{DiscountType: "fixed"},
		[]models.EventProduct{{ProductID: productID, Quantity: 2, UnitPrice: 500}},
		[]models.EventExtra{{Price: 200, Cost: 50}},
		[]models.EventSupply{{Quantity: 3, UnitCost: 20}},
		map[string]float64{productID.String(): 150},
	)

	if result.ProductCost != 300 {
		t.Fatalf("productCost = %v, want 300", result.ProductCost)
	}
	if result.ExtrasCost != 50 {
		t.Fatalf("extrasCost = %v, want 50", result.ExtrasCost)
	}
	if result.SuppliesCost != 60 {
		t.Fatalf("suppliesCost = %v, want 60", result.SuppliesCost)
	}
	if result.TotalCost != 410 {
		t.Fatalf("totalCost = %v, want 410", result.TotalCost)
	}
}

func TestExcludeCostSupplyIgnored(t *testing.T) {
	result := ComputeEventFinancials(
		models.Event{DiscountType: "fixed"},
		nil,
		nil,
		[]models.EventSupply{
			{Quantity: 5, UnitCost: 100, ExcludeCost: false},
			{Quantity: 5, UnitCost: 100, ExcludeCost: true},
		},
		nil,
	)
	if result.SuppliesCost != 500 {
		t.Fatalf("suppliesCost = %v, want 500", result.SuppliesCost)
	}
}

func TestPercentDiscountOver100ClampsTo100(t *testing.T) {
	productID := uuid.New()
	result := ComputeEventFinancials(
		models.Event{DiscountType: "percent", Discount: 150},
		[]models.EventProduct{{ProductID: productID, Quantity: 1, UnitPrice: 1000}},
		nil,
		nil,
		map[string]float64{productID.String(): 0},
	)
	if result.DiscountAmount != 1000 {
		t.Fatalf("discountAmount = %v, want 1000", result.DiscountAmount)
	}
	if result.Total != 0 {
		t.Fatalf("total = %v, want 0", result.Total)
	}
}

func float64Ptr(v float64) *float64 { return &v }