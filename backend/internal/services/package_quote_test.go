package services

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculatePackageQuote_PerGuestAndPerEvent(t *testing.T) {
	min := 40
	q, ok := CalculatePackageQuote(
		"pkg-1", "Gold", "MXN",
		100,
		&min,
		[]PackageQuoteLineInput{
			{ProductID: "a", Name: "Menu", UnitPrice: 250, PricingUnit: PricingUnitPerGuest},
			{ProductID: "b", Name: "DJ", UnitPrice: 3000, PricingUnit: PricingUnitPerEvent},
		},
		[]PackageDiscountTierInput{
			{FromGuests: 40, DiscountPercent: 0},
			{FromGuests: 80, DiscountPercent: 5},
			{FromGuests: 120, DiscountPercent: 10},
		},
	)
	require.True(t, ok)
	// 250*100 + 3000 = 28000; 5% off = 1400; total 26600
	assert.Equal(t, 28000.0, q.Subtotal)
	assert.Equal(t, 5.0, q.DiscountPercent)
	assert.Equal(t, 1400.0, q.DiscountAmount)
	assert.Equal(t, 26600.0, q.Total)
	assert.Equal(t, 100, q.Lines[0].Quantity)
	assert.Equal(t, 1, q.Lines[1].Quantity)
	require.NotNil(t, q.AppliedFromGuests)
	assert.Equal(t, 80, *q.AppliedFromGuests)
}

func TestCalculatePackageQuote_BelowMinGuests(t *testing.T) {
	min := 50
	_, ok := CalculatePackageQuote(
		"pkg-1", "Gold", "MXN",
		30,
		&min,
		[]PackageQuoteLineInput{
			{ProductID: "a", Name: "Menu", UnitPrice: 100, PricingUnit: PricingUnitPerGuest},
		},
		nil,
	)
	assert.False(t, ok)
}

func TestCalculatePackageQuote_HighestTierWins(t *testing.T) {
	q, ok := CalculatePackageQuote(
		"pkg-1", "Gold", "MXN",
		150,
		nil,
		[]PackageQuoteLineInput{
			{ProductID: "a", Name: "Menu", UnitPrice: 100, PricingUnit: PricingUnitPerGuest},
		},
		[]PackageDiscountTierInput{
			{FromGuests: 50, DiscountPercent: 5},
			{FromGuests: 100, DiscountPercent: 10},
			{FromGuests: 150, DiscountPercent: 15},
		},
	)
	require.True(t, ok)
	assert.Equal(t, 15.0, q.DiscountPercent)
	assert.Equal(t, 15000.0, q.Subtotal)
	assert.Equal(t, 2250.0, q.DiscountAmount)
	assert.Equal(t, 12750.0, q.Total)
}
