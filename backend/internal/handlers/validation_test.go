package handlers

import (
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// Helper functions
func float64Ptr(f float64) *float64 { return &f }
func testStringPtr(s string) *string { return &s }
func boolPtr(b bool) *bool          { return &b }

func TestValidateEvent(t *testing.T) {
	tests := []struct {
		name    string
		event   *models.Event
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid event",
			event: &models.Event{
				NumPeople:   10,
				Discount:    10.0,
				TaxRate:     16.0,
				TotalAmount: 1000.0,
				Status:      "quoted",
			},
			wantErr: false,
		},
		{
			name: "num_people less than 1",
			event: &models.Event{
				NumPeople:   0,
				Discount:    0,
				TaxRate:     0,
				TotalAmount: 100,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "num_people: must be at least 1",
		},
		{
			name: "discount below 0",
			event: &models.Event{
				NumPeople:   1,
				Discount:    -10.0,
				TaxRate:     0,
				TotalAmount: 100,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "discount: must be between 0 and 100",
		},
		{
			name: "discount above 100",
			event: &models.Event{
				NumPeople:   1,
				Discount:    150.0,
				TaxRate:     0,
				TotalAmount: 100,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "discount: must be between 0 and 100",
		},
		{
			name: "tax_rate below 0",
			event: &models.Event{
				NumPeople:   1,
				Discount:    0,
				TaxRate:     -10.0,
				TotalAmount: 100,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "tax_rate: must be between 0 and 100",
		},
		{
			name: "tax_rate above 100",
			event: &models.Event{
				NumPeople:   1,
				Discount:    0,
				TaxRate:     150.0,
				TotalAmount: 100,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "tax_rate: must be between 0 and 100",
		},
		{
			name: "total_amount negative",
			event: &models.Event{
				NumPeople:   1,
				Discount:    0,
				TaxRate:     0,
				TotalAmount: -100.0,
				Status:      "quoted",
			},
			wantErr: true,
			errMsg:  "total_amount: must be greater than or equal to 0",
		},
		{
			name: "deposit_percent below 0",
			event: &models.Event{
				NumPeople:      1,
				Discount:       0,
				TaxRate:        0,
				TotalAmount:    100,
				Status:         "quoted",
				DepositPercent: float64Ptr(-10),
			},
			wantErr: true,
			errMsg:  "deposit_percent: must be between 0 and 100",
		},
		{
			name: "deposit_percent above 100",
			event: &models.Event{
				NumPeople:      1,
				Discount:       0,
				TaxRate:        0,
				TotalAmount:    100,
				Status:         "quoted",
				DepositPercent: float64Ptr(150),
			},
			wantErr: true,
			errMsg:  "deposit_percent: must be between 0 and 100",
		},
		{
			name: "refund_percent below 0",
			event: &models.Event{
				NumPeople:     1,
				Discount:      0,
				TaxRate:       0,
				TotalAmount:   100,
				Status:        "quoted",
				RefundPercent: float64Ptr(-10),
			},
			wantErr: true,
			errMsg:  "refund_percent: must be between 0 and 100",
		},
		{
			name: "cancellation_days negative",
			event: &models.Event{
				NumPeople:        1,
				Discount:         0,
				TaxRate:          0,
				TotalAmount:      100,
				Status:           "quoted",
				CancellationDays: float64Ptr(-5),
			},
			wantErr: true,
			errMsg:  "cancellation_days: must be greater than or equal to 0",
		},
		{
			name: "invalid status",
			event: &models.Event{
				NumPeople:   1,
				Discount:    0,
				TaxRate:     0,
				TotalAmount: 100,
				Status:      "invalid_status",
			},
			wantErr: true,
			errMsg:  "status: must be one of: quoted, confirmed, completed, cancelled",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEvent(tt.event)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEvent() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateEvent() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidatePayment(t *testing.T) {
	tests := []struct {
		name    string
		payment *models.Payment
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid payment",
			payment: &models.Payment{
				Amount:        100.0,
				PaymentMethod: "cash",
			},
			wantErr: false,
		},
		{
			name: "amount zero",
			payment: &models.Payment{
				Amount:        0,
				PaymentMethod: "cash",
			},
			wantErr: true,
			errMsg:  "amount: must be greater than 0",
		},
		{
			name: "amount negative",
			payment: &models.Payment{
				Amount:        -50.0,
				PaymentMethod: "cash",
			},
			wantErr: true,
			errMsg:  "amount: must be greater than 0",
		},
		{
			name: "empty payment_method",
			payment: &models.Payment{
				Amount:        100.0,
				PaymentMethod: "",
			},
			wantErr: true,
			errMsg:  "payment_method: is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePayment(tt.payment)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidatePayment() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidatePayment() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidateEventProduct(t *testing.T) {
	tests := []struct {
		name    string
		product *models.EventProduct
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid event product",
			product: &models.EventProduct{
				Quantity:  5.0,
				UnitPrice: 100.0,
				Discount:  10.0,
			},
			wantErr: false,
		},
		{
			name: "quantity zero",
			product: &models.EventProduct{
				Quantity:  0,
				UnitPrice: 100.0,
				Discount:  0,
			},
			wantErr: true,
			errMsg:  "quantity: must be greater than 0",
		},
		{
			name: "unit_price negative",
			product: &models.EventProduct{
				Quantity:  1,
				UnitPrice: -100.0,
				Discount:  0,
			},
			wantErr: true,
			errMsg:  "unit_price: must be greater than or equal to 0",
		},
		{
			name: "discount above 100",
			product: &models.EventProduct{
				Quantity:  1,
				UnitPrice: 100.0,
				Discount:  150.0,
			},
			wantErr: true,
			errMsg:  "discount: must be between 0 and 100",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEventProduct(tt.product)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEventProduct() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateEventProduct() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidateEventExtra(t *testing.T) {
	tests := []struct {
		name    string
		extra   *models.EventExtra
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid event extra",
			extra: &models.EventExtra{
				Description: "Extra service",
				Cost:        50.0,
				Price:       100.0,
			},
			wantErr: false,
		},
		{
			name: "empty description",
			extra: &models.EventExtra{
				Description: "",
				Cost:        50.0,
				Price:       100.0,
			},
			wantErr: true,
			errMsg:  "description: is required",
		},
		{
			name: "cost negative",
			extra: &models.EventExtra{
				Description: "Extra",
				Cost:        -50.0,
				Price:       100.0,
			},
			wantErr: true,
			errMsg:  "cost: must be greater than or equal to 0",
		},
		{
			name: "price negative",
			extra: &models.EventExtra{
				Description: "Extra",
				Cost:        50.0,
				Price:       -100.0,
			},
			wantErr: true,
			errMsg:  "price: must be greater than or equal to 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEventExtra(tt.extra)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEventExtra() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateEventExtra() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidateProduct(t *testing.T) {
	tests := []struct {
		name    string
		product *models.Product
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid product",
			product: &models.Product{
				Name:      "Pasta Carbonara",
				Category:  "Entradas",
				BasePrice: 150.0,
			},
			wantErr: false,
		},
		{
			name: "empty name",
			product: &models.Product{
				Name:      "",
				Category:  "Entradas",
				BasePrice: 150.0,
			},
			wantErr: true,
			errMsg:  "name: is required",
		},
		{
			name: "empty category",
			product: &models.Product{
				Name:      "Pasta",
				Category:  "",
				BasePrice: 150.0,
			},
			wantErr: true,
			errMsg:  "category: is required",
		},
		{
			name: "negative base_price",
			product: &models.Product{
				Name:      "Pasta",
				Category:  "Entradas",
				BasePrice: -150.0,
			},
			wantErr: true,
			errMsg:  "base_price: must be greater than or equal to 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateProduct(tt.product)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateProduct() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateProduct() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidateInventoryItem(t *testing.T) {
	tests := []struct {
		name    string
		item    *models.InventoryItem
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid inventory item",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   100.0,
				MinimumStock:   10.0,
				Unit:           "kg",
				Type:           "ingredient",
			},
			wantErr: false,
		},
		{
			name: "empty ingredient_name",
			item: &models.InventoryItem{
				IngredientName: "",
				CurrentStock:   100.0,
				MinimumStock:   10.0,
				Unit:           "kg",
				Type:           "ingredient",
			},
			wantErr: true,
			errMsg:  "ingredient_name: is required",
		},
		{
			name: "negative current_stock",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   -100.0,
				MinimumStock:   10.0,
				Unit:           "kg",
				Type:           "ingredient",
			},
			wantErr: true,
			errMsg:  "current_stock: must be greater than or equal to 0",
		},
		{
			name: "negative minimum_stock",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   100.0,
				MinimumStock:   -10.0,
				Unit:           "kg",
				Type:           "ingredient",
			},
			wantErr: true,
			errMsg:  "minimum_stock: must be greater than or equal to 0",
		},
		{
			name: "empty unit",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   100.0,
				MinimumStock:   10.0,
				Unit:           "",
				Type:           "ingredient",
			},
			wantErr: true,
			errMsg:  "unit: is required",
		},
		{
			name: "negative unit_cost",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   100.0,
				MinimumStock:   10.0,
				Unit:           "kg",
				UnitCost:       float64Ptr(-50.0),
				Type:           "ingredient",
			},
			wantErr: true,
			errMsg:  "unit_cost: must be greater than or equal to 0",
		},
		{
			name: "invalid type",
			item: &models.InventoryItem{
				IngredientName: "Tomate",
				CurrentStock:   100.0,
				MinimumStock:   10.0,
				Unit:           "kg",
				Type:           "invalid",
			},
			wantErr: true,
			errMsg:  "type: must be one of: ingredient, equipment",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInventoryItem(tt.item)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateInventoryItem() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateInventoryItem() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidateInventoryItem_EquipmentType(t *testing.T) {
	item := &models.InventoryItem{
		IngredientName: "Chafing Dish",
		CurrentStock:   20.0,
		MinimumStock:   5.0,
		Unit:           "pcs",
		Type:           "equipment",
	}
	if err := ValidateInventoryItem(item); err != nil {
		t.Errorf("ValidateInventoryItem() unexpected error for equipment type: %v", err)
	}
}

func TestValidateEventEquipment(t *testing.T) {
	tests := []struct {
		name    string
		eq      *models.EventEquipment
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid equipment with quantity 1",
			eq: &models.EventEquipment{
				Quantity: 1,
			},
			wantErr: false,
		},
		{
			name: "valid equipment with quantity 10",
			eq: &models.EventEquipment{
				Quantity: 10,
			},
			wantErr: false,
		},
		{
			name: "quantity zero",
			eq: &models.EventEquipment{
				Quantity: 0,
			},
			wantErr: true,
			errMsg:  "quantity: must be at least 1",
		},
		{
			name: "quantity negative",
			eq: &models.EventEquipment{
				Quantity: -5,
			},
			wantErr: true,
			errMsg:  "quantity: must be at least 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEventEquipment(tt.eq)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEventEquipment() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateEventEquipment() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}

func TestValidationError_Error(t *testing.T) {
	ve := ValidationError{Field: "test_field", Message: "is invalid"}
	expected := "test_field: is invalid"
	if got := ve.Error(); got != expected {
		t.Errorf("ValidationError.Error() = %q, want %q", got, expected)
	}
}

func TestValidateEvent_RefundPercentAbove100(t *testing.T) {
	event := &models.Event{
		NumPeople:     1,
		Discount:      0,
		TaxRate:       0,
		TotalAmount:   100,
		Status:        "quoted",
		RefundPercent: float64Ptr(150),
	}
	err := ValidateEvent(event)
	if err == nil {
		t.Fatal("ValidateEvent() expected error for refund_percent above 100")
	}
	expected := "refund_percent: must be between 0 and 100"
	if err.Error() != expected {
		t.Errorf("ValidateEvent() error = %q, want %q", err.Error(), expected)
	}
}

func TestValidateEvent_AllValidStatuses(t *testing.T) {
	statuses := []string{"quoted", "confirmed", "completed", "cancelled"}
	for _, status := range statuses {
		t.Run(status, func(t *testing.T) {
			event := &models.Event{
				NumPeople:   1,
				Discount:    0,
				TaxRate:     0,
				TotalAmount: 0,
				Status:      status,
			}
			if err := ValidateEvent(event); err != nil {
				t.Errorf("ValidateEvent() unexpected error for status %q: %v", status, err)
			}
		})
	}
}

func TestValidateEvent_ValidWithOptionalFields(t *testing.T) {
	event := &models.Event{
		NumPeople:        10,
		Discount:         5.0,
		TaxRate:          16.0,
		TotalAmount:      500.0,
		Status:           "confirmed",
		DepositPercent:   float64Ptr(50.0),
		CancellationDays: float64Ptr(7.0),
		RefundPercent:    float64Ptr(80.0),
	}
	if err := ValidateEvent(event); err != nil {
		t.Errorf("ValidateEvent() unexpected error with all optional fields: %v", err)
	}
}

func TestValidateEventProduct_DiscountBelowZero(t *testing.T) {
	ep := &models.EventProduct{
		Quantity:  1,
		UnitPrice: 100.0,
		Discount:  -10.0,
	}
	err := ValidateEventProduct(ep)
	if err == nil {
		t.Fatal("ValidateEventProduct() expected error for discount below 0")
	}
	expected := "discount: must be between 0 and 100"
	if err.Error() != expected {
		t.Errorf("ValidateEventProduct() error = %q, want %q", err.Error(), expected)
	}
}

func TestValidateProductIngredient(t *testing.T) {
	tests := []struct {
		name       string
		ingredient *models.ProductIngredient
		wantErr    bool
		errMsg     string
	}{
		{
			name: "valid product ingredient",
			ingredient: &models.ProductIngredient{
				ProductID:        uuid.New(),
				InventoryID:      uuid.New(),
				QuantityRequired: 2.5,
			},
			wantErr: false,
		},
		{
			name: "quantity_required zero",
			ingredient: &models.ProductIngredient{
				ProductID:        uuid.New(),
				InventoryID:      uuid.New(),
				QuantityRequired: 0,
			},
			wantErr: true,
			errMsg:  "quantity_required: must be greater than 0",
		},
		{
			name: "quantity_required negative",
			ingredient: &models.ProductIngredient{
				ProductID:        uuid.New(),
				InventoryID:      uuid.New(),
				QuantityRequired: -5.0,
			},
			wantErr: true,
			errMsg:  "quantity_required: must be greater than 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateProductIngredient(tt.ingredient)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateProductIngredient() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr && err.Error() != tt.errMsg {
				t.Errorf("ValidateProductIngredient() error message = %v, want %v", err.Error(), tt.errMsg)
			}
		})
	}
}
