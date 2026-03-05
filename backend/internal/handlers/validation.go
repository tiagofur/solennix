package handlers

import (
	"fmt"

	"github.com/tiagofur/eventosapp-backend/internal/models"
)

// ValidationError represents a business logic validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidateEvent validates all business rules for an event
func ValidateEvent(event *models.Event) error {
	// Validate num_people (must be at least 1)
	if event.NumPeople < 1 {
		return ValidationError{Field: "num_people", Message: "must be at least 1"}
	}

	// Validate discount (0-100%)
	if event.Discount < 0 || event.Discount > 100 {
		return ValidationError{Field: "discount", Message: "must be between 0 and 100"}
	}

	// Validate tax_rate (0-100%)
	if event.TaxRate < 0 || event.TaxRate > 100 {
		return ValidationError{Field: "tax_rate", Message: "must be between 0 and 100"}
	}

	// Validate total_amount (must be positive)
	if event.TotalAmount < 0 {
		return ValidationError{Field: "total_amount", Message: "must be greater than or equal to 0"}
	}

	// Validate deposit_percent (0-100%) if provided
	if event.DepositPercent != nil {
		if *event.DepositPercent < 0 || *event.DepositPercent > 100 {
			return ValidationError{Field: "deposit_percent", Message: "must be between 0 and 100"}
		}
	}

	// Validate cancellation_days (must be non-negative) if provided
	if event.CancellationDays != nil {
		if *event.CancellationDays < 0 {
			return ValidationError{Field: "cancellation_days", Message: "must be greater than or equal to 0"}
		}
	}

	// Validate refund_percent (0-100%) if provided
	if event.RefundPercent != nil {
		if *event.RefundPercent < 0 || *event.RefundPercent > 100 {
			return ValidationError{Field: "refund_percent", Message: "must be between 0 and 100"}
		}
	}

	// Validate status is one of the allowed values
	validStatuses := map[string]bool{
		"quoted":    true,
		"confirmed": true,
		"completed": true,
		"cancelled": true,
	}
	if !validStatuses[event.Status] {
		return ValidationError{Field: "status", Message: "must be one of: quoted, confirmed, completed, cancelled"}
	}

	return nil
}

// ValidatePayment validates all business rules for a payment
func ValidatePayment(payment *models.Payment) error {
	// Validate amount (must be positive)
	if payment.Amount <= 0 {
		return ValidationError{Field: "amount", Message: "must be greater than 0"}
	}

	// Validate payment_method is not empty
	if payment.PaymentMethod == "" {
		return ValidationError{Field: "payment_method", Message: "is required"}
	}

	return nil
}

// ValidateEventProduct validates event product line items
func ValidateEventProduct(ep *models.EventProduct) error {
	// Validate quantity (must be positive)
	if ep.Quantity <= 0 {
		return ValidationError{Field: "quantity", Message: "must be greater than 0"}
	}

	// Validate unit_price (must be non-negative)
	if ep.UnitPrice < 0 {
		return ValidationError{Field: "unit_price", Message: "must be greater than or equal to 0"}
	}

	// Validate discount (0-100%)
	if ep.Discount < 0 || ep.Discount > 100 {
		return ValidationError{Field: "discount", Message: "must be between 0 and 100"}
	}

	return nil
}

// ValidateEventExtra validates event extra line items
func ValidateEventExtra(ee *models.EventExtra) error {
	// Validate cost (must be non-negative)
	if ee.Cost < 0 {
		return ValidationError{Field: "cost", Message: "must be greater than or equal to 0"}
	}

	// Validate price (must be non-negative)
	if ee.Price < 0 {
		return ValidationError{Field: "price", Message: "must be greater than or equal to 0"}
	}

	// Validate description is not empty
	if ee.Description == "" {
		return ValidationError{Field: "description", Message: "is required"}
	}

	return nil
}

// ValidateProduct validates product business rules
func ValidateProduct(product *models.Product) error {
	// Validate name is not empty
	if product.Name == "" {
		return ValidationError{Field: "name", Message: "is required"}
	}

	// Validate category is not empty
	if product.Category == "" {
		return ValidationError{Field: "category", Message: "is required"}
	}

	// Validate base_price (must be non-negative)
	if product.BasePrice < 0 {
		return ValidationError{Field: "base_price", Message: "must be greater than or equal to 0"}
	}

	return nil
}

// ValidateInventoryItem validates inventory item business rules
func ValidateInventoryItem(item *models.InventoryItem) error {
	// Validate ingredient_name is not empty
	if item.IngredientName == "" {
		return ValidationError{Field: "ingredient_name", Message: "is required"}
	}

	// Validate current_stock (must be non-negative)
	if item.CurrentStock < 0 {
		return ValidationError{Field: "current_stock", Message: "must be greater than or equal to 0"}
	}

	// Validate minimum_stock (must be non-negative)
	if item.MinimumStock < 0 {
		return ValidationError{Field: "minimum_stock", Message: "must be greater than or equal to 0"}
	}

	// Validate unit is not empty
	if item.Unit == "" {
		return ValidationError{Field: "unit", Message: "is required"}
	}

	// Validate unit_cost (must be non-negative) if provided
	if item.UnitCost != nil {
		if *item.UnitCost < 0 {
			return ValidationError{Field: "unit_cost", Message: "must be greater than or equal to 0"}
		}
	}

	// Validate type is one of the allowed values
	validTypes := map[string]bool{
		"ingredient": true,
		"equipment":  true,
	}
	if !validTypes[item.Type] {
		return ValidationError{Field: "type", Message: "must be one of: ingredient, equipment"}
	}

	return nil
}

// ValidateEventEquipment validates event equipment assignments
func ValidateEventEquipment(eq *models.EventEquipment) error {
	if eq.Quantity < 1 {
		return ValidationError{Field: "quantity", Message: "must be at least 1"}
	}
	return nil
}

// ValidateProductIngredient validates product ingredient relationships
func ValidateProductIngredient(pi *models.ProductIngredient) error {
	// Validate quantity_required (must be positive)
	if pi.QuantityRequired <= 0 {
		return ValidationError{Field: "quantity_required", Message: "must be greater than 0"}
	}

	// Validate capacity (must be positive when set)
	if pi.Capacity != nil && *pi.Capacity <= 0 {
		return ValidationError{Field: "capacity", Message: "must be greater than 0 when specified"}
	}

	return nil
}
