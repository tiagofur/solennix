package handlers

import (
	"fmt"
	"html"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

const (
	MaxNameLength        = 255
	MaxDescriptionLength = 2000
	MaxNotesLength       = 5000
	MaxAddressLength     = 500
	MaxCityLength        = 255
	MaxPhoneLength       = 50
	MaxEmailLength       = 320
	MaxCategoryLength    = 255
	MaxServiceTypeLength = 255
	MaxLocationLength    = 500
	MaxContractLength    = 50000
)

// sanitizeString strips HTML tags from user input to prevent XSS.
// Uses html.EscapeString to neutralize any HTML entities.
func sanitizeString(s string) string {
	return strings.TrimSpace(html.EscapeString(s))
}

// sanitizeOptionalString sanitizes a *string pointer, returns nil if empty after sanitization.
func sanitizeOptionalString(s *string) *string {
	if s == nil {
		return nil
	}
	sanitized := sanitizeString(*s)
	if sanitized == "" {
		return nil
	}
	return &sanitized
}

// validateStringLength checks that a string doesn't exceed max length.
func validateStringLength(field, value string, maxLen int) error {
	if len(value) > maxLen {
		return ValidationError{Field: field, Message: fmt.Sprintf("must not exceed %d characters", maxLen)}
	}
	return nil
}

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

	// Validate discount based on type
	if event.Discount < 0 {
		return ValidationError{Field: "discount", Message: "must be greater than or equal to 0"}
	}
	if event.DiscountType != "fixed" && event.Discount > 100 {
		return ValidationError{Field: "discount", Message: "must be between 0 and 100 for percentage discounts"}
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

	// String length validation
	if err := validateStringLength("service_type", event.ServiceType, MaxServiceTypeLength); err != nil {
		return err
	}
	if event.Location != nil {
		if err := validateStringLength("location", *event.Location, MaxLocationLength); err != nil {
			return err
		}
	}
	if event.City != nil {
		if err := validateStringLength("city", *event.City, MaxCityLength); err != nil {
			return err
		}
	}
	if event.Notes != nil {
		if err := validateStringLength("notes", *event.Notes, MaxNotesLength); err != nil {
			return err
		}
	}

	// Sanitize text fields
	event.ServiceType = sanitizeString(event.ServiceType)
	event.Notes = sanitizeOptionalString(event.Notes)
	event.Location = sanitizeOptionalString(event.Location)

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

	// Validate payment_method enum
	validMethods := map[string]bool{
		"cash": true, "transfer": true, "card": true, "check": true, "other": true,
	}
	if !validMethods[payment.PaymentMethod] {
		return ValidationError{Field: "payment_method", Message: "must be one of: cash, transfer, card, check, other"}
	}

	if payment.Notes != nil {
		if err := validateStringLength("notes", *payment.Notes, MaxNotesLength); err != nil {
			return err
		}
		payment.Notes = sanitizeOptionalString(payment.Notes)
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

	// Validate discount (fixed amount per unit, must be non-negative)
	if ep.Discount < 0 {
		return ValidationError{Field: "discount", Message: "must be greater than or equal to 0"}
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

// ValidateClient validates client business rules
func ValidateClient(client *models.Client) error {
	// Validate name is not empty
	if client.Name == "" {
		return ValidationError{Field: "name", Message: "is required"}
	}

	// Validate name length
	if len(client.Name) > 255 {
		return ValidationError{Field: "name", Message: "must not exceed 255 characters"}
	}

	// Validate email format if provided
	if client.Email != nil && *client.Email != "" {
		if !emailRegex.MatchString(*client.Email) {
			return ValidationError{Field: "email", Message: "invalid email format"}
		}
	}

	// String length validation
	if client.Phone != "" {
		if err := validateStringLength("phone", client.Phone, MaxPhoneLength); err != nil {
			return err
		}
	}
	if client.Email != nil {
		if err := validateStringLength("email", *client.Email, MaxEmailLength); err != nil {
			return err
		}
	}
	if client.Address != nil {
		if err := validateStringLength("address", *client.Address, MaxAddressLength); err != nil {
			return err
		}
	}
	if client.City != nil {
		if err := validateStringLength("city", *client.City, MaxCityLength); err != nil {
			return err
		}
	}
	if client.Notes != nil {
		if err := validateStringLength("notes", *client.Notes, MaxNotesLength); err != nil {
			return err
		}
	}

	// Sanitize text fields
	client.Name = sanitizeString(client.Name)
	client.Notes = sanitizeOptionalString(client.Notes)
	client.Address = sanitizeOptionalString(client.Address)

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

	// String length validation
	if err := validateStringLength("name", product.Name, MaxNameLength); err != nil {
		return err
	}
	if err := validateStringLength("category", product.Category, MaxCategoryLength); err != nil {
		return err
	}

	// Sanitize text fields
	product.Name = sanitizeString(product.Name)
	product.Category = sanitizeString(product.Category)

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
		"supply":     true,
	}
	if !validTypes[item.Type] {
		return ValidationError{Field: "type", Message: "must be one of: ingredient, equipment, supply"}
	}

	// String length validation
	if err := validateStringLength("ingredient_name", item.IngredientName, MaxNameLength); err != nil {
		return err
	}

	// Sanitize text fields
	item.IngredientName = sanitizeString(item.IngredientName)

	return nil
}

// ValidateEventEquipment validates event equipment assignments
func ValidateEventEquipment(eq *models.EventEquipment) error {
	if eq.Quantity < 1 {
		return ValidationError{Field: "quantity", Message: "must be at least 1"}
	}
	return nil
}

// ValidateStaff validates a staff catalog entry.
func ValidateStaff(s *models.Staff) error {
	if s.Name == "" {
		return ValidationError{Field: "name", Message: "is required"}
	}
	if err := validateStringLength("name", s.Name, MaxNameLength); err != nil {
		return err
	}
	if s.Email != nil && *s.Email != "" {
		if !emailRegex.MatchString(*s.Email) {
			return ValidationError{Field: "email", Message: "invalid email format"}
		}
		if err := validateStringLength("email", *s.Email, MaxEmailLength); err != nil {
			return err
		}
	}
	if s.Phone != nil {
		if err := validateStringLength("phone", *s.Phone, MaxPhoneLength); err != nil {
			return err
		}
	}
	if s.RoleLabel != nil {
		if err := validateStringLength("role_label", *s.RoleLabel, MaxNameLength); err != nil {
			return err
		}
	}
	if s.Notes != nil {
		if err := validateStringLength("notes", *s.Notes, MaxNotesLength); err != nil {
			return err
		}
	}

	s.Name = sanitizeString(s.Name)
	s.RoleLabel = sanitizeOptionalString(s.RoleLabel)
	s.Notes = sanitizeOptionalString(s.Notes)
	return nil
}

// ValidateEventStaff validates event staff assignments.
func ValidateEventStaff(es *models.EventStaff) error {
	if es.StaffID == (uuid.UUID{}) {
		return ValidationError{Field: "staff_id", Message: "is required"}
	}
	if es.FeeAmount != nil && *es.FeeAmount < 0 {
		return ValidationError{Field: "fee_amount", Message: "must be greater than or equal to 0"}
	}
	if es.RoleOverride != nil {
		if err := validateStringLength("role_override", *es.RoleOverride, MaxNameLength); err != nil {
			return err
		}
	}
	if es.Notes != nil {
		if err := validateStringLength("notes", *es.Notes, MaxNotesLength); err != nil {
			return err
		}
	}
	if es.ShiftStart != nil && es.ShiftEnd != nil && !es.ShiftEnd.After(*es.ShiftStart) {
		return ValidationError{Field: "shift_end", Message: "must be after shift_start"}
	}
	// Status is optional. Nil = keep current (UPSERT uses COALESCE). Empty string
	// from an older client is treated the same as nil for preservation semantics.
	if es.Status != nil && *es.Status != "" {
		switch *es.Status {
		case models.AssignmentStatusPending,
			models.AssignmentStatusConfirmed,
			models.AssignmentStatusDeclined,
			models.AssignmentStatusCancelled:
		default:
			return ValidationError{Field: "status", Message: "must be one of: pending, confirmed, declined, cancelled"}
		}
	}
	return nil
}

// ValidateEventSupply validates event supply assignments
func ValidateEventSupply(s *models.EventSupply) error {
	if s.Quantity <= 0 {
		return ValidationError{Field: "quantity", Message: "must be greater than 0"}
	}
	if s.UnitCost < 0 {
		return ValidationError{Field: "unit_cost", Message: "must be greater than or equal to 0"}
	}
	validSources := map[string]bool{
		"stock":    true,
		"purchase": true,
	}
	if !validSources[s.Source] {
		return ValidationError{Field: "source", Message: "must be one of: stock, purchase"}
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
