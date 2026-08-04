package services

import (
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// CatalogEntry identifies how the visitor reached the request form.
type CatalogEntry string

const (
	CatalogEntryPublicProfile CatalogEntry = "public_profile"
	CatalogEntrySharedLink    CatalogEntry = "shared_link"
)

// ServiceSelection is a visitor-chosen product with quantity.
type ServiceSelection struct {
	ProductID uuid.UUID
	Qty       int
}

// IsRequestLinkUsable reports whether a shared request link accepts submissions.
// Usable iff: status=active AND (no expiry OR expires_at > now) AND
// (unlimited uses OR use_count < max_uses).
func IsRequestLinkUsable(link *models.PublicRequestLink, now time.Time) bool {
	if link == nil {
		return false
	}
	if link.Status != models.PublicRequestLinkActive {
		return false
	}
	if link.ExpiresAt != nil && !link.ExpiresAt.After(now) {
		return false
	}
	if link.MaxUses != nil && link.UseCount >= *link.MaxUses {
		return false
	}
	return true
}

// FilterCatalogByEntry applies design D4 catalog rules to an already-loaded product set.
// profileEnabled is ignored for shared_link when building from pre-split lists —
// callers pass the correct product list for the entry (public vs all active).
// This pure helper validates selected IDs against the allowed catalog.
func BuildServicesSnapshotFromCatalog(
	catalog []models.Product,
	selections []ServiceSelection,
) ([]models.PublicRequestServiceSnapshot, error) {
	if len(selections) == 0 {
		return []models.PublicRequestServiceSnapshot{}, nil
	}
	byID := make(map[string]models.Product, len(catalog))
	for _, p := range catalog {
		byID[p.ID.String()] = p
	}
	out := make([]models.PublicRequestServiceSnapshot, 0, len(selections))
	for _, sel := range selections {
		p, ok := byID[sel.ProductID.String()]
		if !ok {
			return nil, ErrInvalidServices
		}
		qty := sel.Qty
		if qty <= 0 {
			qty = 1
		}
		var price *float64
		if p.BasePrice > 0 {
			bp := p.BasePrice
			price = &bp
		}
		out = append(out, models.PublicRequestServiceSnapshot{
			ProductID:  p.ID,
			Name:       p.Name,
			Price:      price,
			Qty:        qty,
			IsFeatured: p.IsFeatured,
		})
	}
	return out, nil
}

// SumSnapshotQuote totals qty * unit_price for auto_quote.
func SumSnapshotQuote(services []models.PublicRequestServiceSnapshot) float64 {
	var total float64
	for _, s := range services {
		price := 0.0
		if s.Price != nil {
			price = *s.Price
		}
		total += float64(s.SnapshotQty()) * price
	}
	return total
}

// SnapshotInclusionNames returns service names for PublicResponse.inclusions.
func SnapshotInclusionNames(services []models.PublicRequestServiceSnapshot) []string {
	if len(services) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(services))
	for _, s := range services {
		if s.Name != "" {
			out = append(out, s.Name)
		}
	}
	return out
}

// ValidateAutoEventFields enforces EFL-parity required fields for auto_event.
// Returns a short field error message or "" if valid.
func ValidateAutoEventFields(name, phone *string, eventDate, eventType *string, guestCount *int) string {
	if name == nil || trimSpace(*name) == "" {
		return "contact_name is required for auto_event"
	}
	if phone == nil || trimSpace(*phone) == "" {
		return "contact_phone is required for auto_event"
	}
	if eventDate == nil || trimSpace(*eventDate) == "" {
		return "event_date is required for auto_event"
	}
	if eventType == nil || trimSpace(*eventType) == "" {
		return "event_type is required for auto_event"
	}
	if guestCount == nil || *guestCount < 1 {
		return "guest_count must be at least 1 for auto_event"
	}
	return ""
}

// ValidateContactRule: at least one of email or phone required.
func ValidateContactRule(email string, phone *string) string {
	hasEmail := trimSpace(email) != ""
	hasPhone := phone != nil && trimSpace(*phone) != ""
	if !hasEmail && !hasPhone {
		return "contact_email or contact_phone is required"
	}
	return ""
}

func trimSpace(s string) string {
	// local copy to avoid importing strings in pure helpers package surface
	start, end := 0, len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

// ConvertNotes builds CRM notes including request source.
func ConvertNotes(source models.RequestSource, message *string) string {
	base := "Creado desde solicitud de cotización"
	switch source {
	case models.RequestSourceSharedLink:
		base = "Creado desde link de solicitud compartido"
	case models.RequestSourcePublicProfile:
		base = "Creado desde perfil público (solicitud)"
	}
	if message != nil && trimSpace(*message) != "" {
		return *message + "\n\n— " + base
	}
	return base
}
