package handlers

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestQuickQuotePDFRequestToPDFData_PercentDiscountAndTax(t *testing.T) {
	userID := uuid.MustParse("a1b2c3d4-e5f6-7890-abcd-ef1234567890")
	email := "cliente@ejemplo.com"
	req := quickQuotePDFRequest{
		Client: &quickQuotePDFClient{
			Name:  "María Fernanda de los Ángeles García Hernández",
			Phone: "+52 55 5555 5555",
			Email: &email,
		},
		Products: []quickQuotePDFProduct{
			{
				ProductID: "product-1",
				Name:      "Paquete premium con montaje completo y coordinación extendida",
				Quantity:  2,
				UnitPrice: 1500,
				Discount:  100,
			},
		},
		Extras: []quickQuotePDFExtra{
			{
				Description:    "Decoración floral integral",
				Cost:           500,
				Price:          1000,
				ExcludeUtility: false,
			},
			{
				Description:    "Permiso del venue",
				Cost:           300,
				Price:          300,
				ExcludeUtility: true,
			},
		},
		NumPeople:       120,
		Discount:        10,
		DiscountType:    "percent",
		RequiresInvoice: true,
		TaxRate:         16,
	}

	event, products, extras, client := req.toPDFData(userID)

	assert.NotNil(t, client)
	assert.Equal(t, req.Client.Name, client.Name)
	assert.Equal(t, req.Client.Phone, client.Phone)
	assert.Equal(t, req.Client.Email, client.Email)
	assert.Equal(t, userID, client.UserID)

	assert.Len(t, products, 1)
	assert.Len(t, extras, 2)
	assert.Equal(t, req.Products[0].Name, *products[0].ProductName)
	assert.Equal(t, 2800.0, products[0].TotalPrice)

	assert.Equal(t, "percent", event.DiscountType)
	assert.Equal(t, 10.0, event.Discount)
	assert.Equal(t, 120, event.NumPeople)
	assert.Equal(t, 595.2, event.TaxAmount)
	assert.Equal(t, 4315.2, event.TotalAmount)
	assert.Equal(t, client, event.Client)
}

func TestQuickQuotePDFRequestToPDFData_SkipsInvalidItemsAndClampsFixedDiscount(t *testing.T) {
	userID := uuid.MustParse("12345678-1234-1234-1234-1234567890ab")
	req := quickQuotePDFRequest{
		Products: []quickQuotePDFProduct{
			{Name: "", Quantity: 0, UnitPrice: 1000, Discount: 0},
			{Name: "Servicio base", Quantity: 1, UnitPrice: 500, Discount: 0},
		},
		Extras: []quickQuotePDFExtra{
			{Description: "   ", Cost: 10, Price: 50},
			{Description: "Logística externa", Cost: 100, Price: 200, ExcludeUtility: false},
		},
		NumPeople:       20,
		Discount:        5000,
		DiscountType:    "fixed",
		RequiresInvoice: false,
		TaxRate:         16,
	}

	event, products, extras, client := req.toPDFData(userID)

	assert.Nil(t, client)
	assert.Len(t, products, 1)
	assert.Len(t, extras, 1)
	assert.Equal(t, "fixed", event.DiscountType)
	assert.Equal(t, 0.0, event.TaxAmount)
	assert.Equal(t, 0.0, event.TotalAmount)
	assert.Equal(t, "quoted", event.Status)
	assert.Equal(t, userID, event.UserID)
}
