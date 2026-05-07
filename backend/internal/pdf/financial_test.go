package pdf

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

func sampleEvent() models.Event {
	return models.Event{
		ID:               uuid.MustParse("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
		EventDate:        "2026-06-15",
		StartTime:        strPtr("14:00"),
		EndTime:          strPtr("22:00"),
		ServiceType:      "Banquete",
		NumPeople:        150,
		TotalAmount:      45000,
		Discount:         10,
		DiscountType:     "percent",
		RequiresInvoice:  true,
		TaxRate:          16,
		TaxAmount:        0, // will be computed
		Location:         strPtr("Salón Los Arcos"),
		City:             strPtr("Ciudad de México"),
		DepositPercent:   floatPtr(50),
		CancellationDays: floatPtr(15),
		RefundPercent:    floatPtr(80),
	}
}

func sampleClient() *models.Client {
	return &models.Client{
		Name:    "María García López",
		Phone:   "555-123-4567",
		Email:   strPtr("maria@ejemplo.com"),
		Address: strPtr("Av. Reforma 123"),
		City:    strPtr("CDMX"),
	}
}

func sampleProfile() *models.User {
	return &models.User{
		Name:         "Juan Eventos",
		BusinessName: strPtr("Mi Empresa de Eventos"),
		Email:        "info@mieventos.com",
	}
}

func sampleProducts() []models.EventProduct {
	return []models.EventProduct{
		{Quantity: 1, UnitPrice: 20000, Discount: 0, ProductName: strPtr("Paquete Premium")},
		{Quantity: 2, UnitPrice: 5000, Discount: 500, ProductName: strPtr("Iluminación")},
	}
}

func sampleExtras() []models.EventExtra {
	return []models.EventExtra{
		{Description: "Decoración floral", Cost: 3000, Price: 5000},
	}
}

func samplePayments() []models.Payment {
	return []models.Payment{
		{Amount: 15000, PaymentDate: "2026-05-01", PaymentMethod: "transfer", Notes: strPtr("Anticipo")},
		{Amount: 7500, PaymentDate: "2026-05-15", PaymentMethod: "cash", Notes: strPtr("Segundo pago")},
	}
}

// ---------------------------------------------------------------------------
// FinancialSummary
// ---------------------------------------------------------------------------

func TestComputeFinancialSummary_NoDiscount(t *testing.T) {
	event := models.Event{TotalAmount: 10000, Discount: 0, DiscountType: "fixed", TaxAmount: 0}
	fs := ComputeFinancialSummary(event, 0)

	assert.Equal(t, 10000.0, fs.PreDiscountSubtotal)
	assert.False(t, fs.HasDiscount)
	assert.Equal(t, 10000.0, fs.TotalAmount)
}

func TestComputeFinancialSummary_PercentDiscount(t *testing.T) {
	event := models.Event{
		TotalAmount:     44000, // total after discount + tax
		Discount:        10,
		DiscountType:    "percent",
		TaxAmount:       0,
		RequiresInvoice: false,
	}
	fs := ComputeFinancialSummary(event, 0)

	// discountAmount = 44000 * 10/100 = 4400
	assert.Equal(t, 4400.0, fs.DiscountAmount)
	assert.Equal(t, 48400.0, fs.PreDiscountSubtotal)
	assert.Contains(t, fs.DiscountLabel, "10%")
}

func TestComputeFinancialSummary_FixedDiscount(t *testing.T) {
	event := models.Event{
		TotalAmount:  10000,
		Discount:     500,
		DiscountType: "fixed",
		TaxAmount:    0,
	}
	fs := ComputeFinancialSummary(event, 0)

	assert.Equal(t, 500.0, fs.DiscountAmount)
	assert.Equal(t, "Descuento", fs.DiscountLabel)
	assert.Equal(t, 10500.0, fs.PreDiscountSubtotal)
}

func TestComputeFinancialSummary_WithTax(t *testing.T) {
	event := models.Event{
		TotalAmount:     11600,
		Discount:        0,
		DiscountType:    "fixed",
		TaxAmount:       1600,
		TaxRate:         16,
		RequiresInvoice: true,
	}
	fs := ComputeFinancialSummary(event, 0)

	assert.True(t, fs.ShowTax)
	assert.Equal(t, 1600.0, fs.TaxAmount)
	assert.Equal(t, 16.0, fs.TaxRate)
	assert.Equal(t, 10000.0, fs.PreDiscountSubtotal)
}

func TestComputeFinancialSummary_Deposit(t *testing.T) {
	event := models.Event{
		TotalAmount:    10000,
		DepositPercent: floatPtr(50),
	}
	fs := ComputeFinancialSummary(event, 0)

	assert.True(t, fs.HasDeposit)
	assert.Equal(t, 50.0, fs.DepositPercent)
	assert.Equal(t, 5000.0, fs.DepositAmount)
}

// ---------------------------------------------------------------------------
// PaymentMethodLabel
// ---------------------------------------------------------------------------

func TestPaymentMethodLabel(t *testing.T) {
	tests := []struct {
		method   string
		expected string
	}{
		{"cash", "Efectivo"},
		{"transfer", "Transferencia"},
		{"card", "Tarjeta"},
		{"check", "Cheque"},
		{"other", "Otro"},
		{"unknown", "unknown"},
	}
	for _, tt := range tests {
		assert.Equal(t, tt.expected, PaymentMethodLabel(tt.method))
	}
}

// ---------------------------------------------------------------------------
// GenerateBudget
// ---------------------------------------------------------------------------

func TestGenerateBudget_BasicOutput(t *testing.T) {
	data := BudgetData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)

	// Should be a valid PDF
	assert.True(t, strings.HasPrefix(string(pdfBytes[:5]), "%PDF-"))
}

func TestGenerateBudget_NoClient(t *testing.T) {
	data := BudgetData{
		Event:    sampleEvent(),
		Client:   nil,
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   nil,
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateBudget_NoProducts(t *testing.T) {
	data := BudgetData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: nil,
		Extras:   nil,
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateBudget_WithDiscount(t *testing.T) {
	event := sampleEvent()
	event.Discount = 15
	event.DiscountType = "percent"

	data := BudgetData{
		Event:    event,
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

// ---------------------------------------------------------------------------
// GenerateInvoice
// ---------------------------------------------------------------------------

func TestGenerateInvoice_BasicOutput(t *testing.T) {
	data := InvoiceData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateInvoice(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)

	// Should be a valid PDF
	assert.True(t, strings.HasPrefix(string(pdfBytes[:5]), "%PDF-"))
}

func TestGenerateInvoice_NoClient(t *testing.T) {
	data := InvoiceData{
		Event:    sampleEvent(),
		Client:   nil,
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   nil,
	}

	pdfBytes, err := GenerateInvoice(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateInvoice_NoProducts(t *testing.T) {
	data := InvoiceData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: nil,
		Extras:   nil,
	}

	pdfBytes, err := GenerateInvoice(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

// ---------------------------------------------------------------------------
// GeneratePaymentReport
// ---------------------------------------------------------------------------

func TestGeneratePaymentReport_BasicOutput(t *testing.T) {
	data := PaymentReportData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Payments: samplePayments(),
	}

	pdfBytes, err := GeneratePaymentReport(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)

	assert.True(t, strings.HasPrefix(string(pdfBytes[:5]), "%PDF-"))
}

func TestGeneratePaymentReport_NoPayments(t *testing.T) {
	data := PaymentReportData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Payments: nil,
	}

	pdfBytes, err := GeneratePaymentReport(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGeneratePaymentReport_BalancePositive(t *testing.T) {
	event := sampleEvent()
	event.TotalAmount = 50000 // more than payments

	data := PaymentReportData{
		Event:    event,
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Payments: samplePayments(), // 15000 + 7500 = 22500
	}

	pdfBytes, err := GeneratePaymentReport(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGeneratePaymentReport_FullyPaid(t *testing.T) {
	event := sampleEvent()
	event.TotalAmount = 22500 // exactly matches payments

	data := PaymentReportData{
		Event:    event,
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Payments: samplePayments(),
	}

	pdfBytes, err := GeneratePaymentReport(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

func TestGenerateBudget_UnicodeChars(t *testing.T) {
	// Test that Spanish characters render correctly
	client := &models.Client{
		Name:  "José María Ñoño Güemes",
		Phone: "+52 55 1234 5678",
		Email: strPtr("josé@ejemplo.com"),
	}
	event := sampleEvent()
	event.Location = strPtr("Estadio Azteca, México D.F.")
	event.ServiceType = "XV Años"

	data := BudgetData{
		Event:    event,
		Client:   client,
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateBudget_EmojiInSharedHeaderText(t *testing.T) {
	profile := sampleProfile()
	profile.BusinessName = strPtr("Solennix Eventos ✨")

	event := sampleEvent()
	event.ServiceType = "Boda 💍"

	client := sampleClient()
	client.Name = "María 💖 López"

	data := BudgetData{
		Event:    event,
		Client:   client,
		Profile:  profile,
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateBudget_FixedDiscount(t *testing.T) {
	event := sampleEvent()
	event.Discount = 2000
	event.DiscountType = "fixed"

	data := BudgetData{
		Event:    event,
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   sampleExtras(),
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGeneratePaymentReport_MultiplePayments(t *testing.T) {
	payments := []models.Payment{
		{Amount: 10000, PaymentDate: "2026-04-01", PaymentMethod: "transfer", Notes: strPtr("Anticipo")},
		{Amount: 10000, PaymentDate: "2026-04-15", PaymentMethod: "cash"},
		{Amount: 10000, PaymentDate: "2026-05-01", PaymentMethod: "card", Notes: strPtr("Segundo pago")},
		{Amount: 10000, PaymentDate: "2026-05-15", PaymentMethod: "check", Notes: strPtr("Tercer pago")},
		{Amount: 5000, PaymentDate: "2026-06-01", PaymentMethod: "transfer"},
	}

	data := PaymentReportData{
		Event:    sampleEvent(),
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Payments: payments,
	}

	pdfBytes, err := GeneratePaymentReport(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}

func TestGenerateBudget_NoDeposit(t *testing.T) {
	event := sampleEvent()
	event.DepositPercent = nil

	data := BudgetData{
		Event:    event,
		Client:   sampleClient(),
		Profile:  sampleProfile(),
		Products: sampleProducts(),
		Extras:   nil,
	}

	pdfBytes, err := GenerateBudget(data)
	assert.NoError(t, err)
	assert.NotEmpty(t, pdfBytes)
}
