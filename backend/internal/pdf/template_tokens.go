package pdf

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// TokenRegex matches [Any Token Text] in contract templates.
var tokenRegex = regexp.MustCompile(`\[([^\[\]]+)\]`)

// allowedTokens is the canonical set of supported contract template tokens.
// Must stay in sync with handlers/contract_template.go allowedContractTemplateTokens.
var allowedTokens = map[string]struct{}{
	"provider_name":           {},
	"provider_business_name":  {},
	"provider_email":          {},
	"current_date":            {},
	"event_date":              {},
	"event_start_time":        {},
	"event_end_time":          {},
	"event_time_range":        {},
	"event_service_type":      {},
	"event_num_people":        {},
	"event_location":          {},
	"event_city":              {},
	"event_total_amount":      {},
	"event_deposit_percent":   {},
	"event_refund_percent":    {},
	"event_cancellation_days": {},
	"client_name":             {},
	"client_phone":            {},
	"client_email":            {},
	"client_address":          {},
	"client_city":             {},
	"contract_city":           {},
	"event_services_list":     {},
	"event_paid_amount":       {},
}

// tokenAliases maps human-readable labels (accent-stripped, lowercased) to canonical token names.
// Must stay in sync with handlers/contract_template.go contractTemplateTokenAliases.
var tokenAliases = map[string]string{
	"nombre del proveedor":           "provider_name",
	"nombre comercial del proveedor": "provider_business_name",
	"email del proveedor":            "provider_email",
	"fecha actual":                   "current_date",
	"fecha del evento":               "event_date",
	"hora de inicio":                 "event_start_time",
	"hora de fin":                    "event_end_time",
	"horario del evento":             "event_time_range",
	"tipo de servicio":               "event_service_type",
	"numero de personas":             "event_num_people",
	"lugar del evento":               "event_location",
	"ciudad del evento":              "event_city",
	"monto total del evento":         "event_total_amount",
	"porcentaje de anticipo":         "event_deposit_percent",
	"porcentaje de reembolso":        "event_refund_percent",
	"dias de cancelacion":            "event_cancellation_days",
	"nombre del cliente":             "client_name",
	"telefono del cliente":           "client_phone",
	"email del cliente":              "client_email",
	"direccion del cliente":          "client_address",
	"ciudad del cliente":             "client_city",
	"ciudad del contrato":            "contract_city",
	"servicios del evento":           "event_services_list",
	"total pagado":                   "event_paid_amount",
}

var diacriticsReplacer = strings.NewReplacer(
	"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n",
	"Á", "a", "É", "e", "Í", "i", "Ó", "o", "Ú", "u", "Ü", "u", "Ñ", "n",
)

// normalizeToken normalizes a token for matching: lowercase, strip accents, spaces.
func normalizeToken(token string) string {
	normalized := strings.TrimSpace(strings.ToLower(token))
	normalized = diacriticsReplacer.Replace(normalized)
	normalized = strings.ReplaceAll(normalized, "_", " ")
	normalized = strings.Join(strings.Fields(normalized), " ")
	return normalized
}

// resolveCanonicalToken maps a raw token text to its canonical form.
// Accepts both "client_name" and "Nombre del cliente" styles.
func resolveCanonicalToken(token string) string {
	normalized := normalizeToken(token)

	// Direct match: token is already in canonical form (underscores → spaces for lookup)
	underscoreForm := strings.ReplaceAll(normalized, " ", "_")
	if _, ok := allowedTokens[underscoreForm]; ok {
		return underscoreForm
	}

	// Alias match: human-readable label
	if canonical, ok := tokenAliases[normalized]; ok {
		return canonical
	}

	return ""
}

// TokenData holds all the contextual data needed to resolve template tokens.
type TokenData struct {
	Event    models.Event
	Client   *models.Client
	Profile  *models.User
	Products []models.EventProduct
	Payments []models.Payment
}

// FormatCurrency formats an amount as MXN currency string.
// Produces "$25,000.00" format consistent with all frontends.
func FormatCurrency(amount float64) string {
	if amount == 0 {
		return "$0.00"
	}
	formatted := fmt.Sprintf("%.2f", amount)
	parts := strings.Split(formatted, ".")
	intPart := parts[0]
	decPart := parts[1]

	result := ""
	for i, c := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return "$" + result + "." + decPart
}

// FormatDate formats a "2006-01-02" date string to "15 de junio de 2026" (es-MX).
func FormatDate(dateStr string) string {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return dateStr
	}
	months := []string{
		"enero", "febrero", "marzo", "abril", "mayo", "junio",
		"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
	}
	return fmt.Sprintf("%d de %s de %d", t.Day(), months[t.Month()-1], t.Year())
}

func asText(s *string) string {
	if s == nil {
		return ""
	}
	return strings.TrimSpace(*s)
}

// ResolveTokens replaces all [Token] placeholders in a contract template
// with actual values from the event/client/profile data.
// Tokens can be in either canonical form [client_name] or label form [Nombre del cliente].
func ResolveTokens(template string, data TokenData) string {
	result := tokenRegex.ReplaceAllStringFunc(template, func(match string) string {
		inner := match[1 : len(match)-1]
		tokenText := strings.TrimSpace(inner)

		canonical := resolveCanonicalToken(tokenText)
		if canonical == "" {
			return match // unknown token → leave as-is
		}

		value := resolveTokenValue(canonical, data)
		if value == "" {
			return match // missing data → leave token as-is
		}
		return value
	})

	// Normalize %% → % (residual from percentage tokens like [Porcentaje de anticipo]%)
	result = strings.ReplaceAll(result, "%%", "%")

	return result
}

// resolveTokenValue returns the resolved string value for a canonical token.
func resolveTokenValue(token string, data TokenData) string {
	switch token {
	// Provider
	case "provider_name":
		return strings.TrimSpace(data.Profile.Name)
	case "provider_business_name":
		if bn := asText(data.Profile.BusinessName); bn != "" {
			return bn
		}
		return strings.TrimSpace(data.Profile.Name)
	case "provider_email":
		return data.Profile.Email

	// Event — dates & times
	case "current_date":
		return FormatDate(time.Now().Format("2006-01-02"))
	case "event_date":
		return FormatDate(data.Event.EventDate)
	case "event_start_time":
		return asText(data.Event.StartTime)
	case "event_end_time":
		return asText(data.Event.EndTime)
	case "event_time_range":
		start := asText(data.Event.StartTime)
		end := asText(data.Event.EndTime)
		if start != "" && end != "" {
			return start + " - " + end
		}
		return start + end
	case "event_service_type":
		return data.Event.ServiceType
	case "event_num_people":
		return fmt.Sprintf("%d", data.Event.NumPeople)
	case "event_location":
		return asText(data.Event.Location)
	case "event_city":
		return asText(data.Event.City)
	case "event_total_amount":
		return FormatCurrency(data.Event.TotalAmount)

	// Conditions
	case "event_deposit_percent":
		if data.Event.DepositPercent != nil {
			return fmt.Sprintf("%.0f", *data.Event.DepositPercent)
		}
		if data.Profile.DefaultDepositPercent != nil {
			return fmt.Sprintf("%.0f", *data.Profile.DefaultDepositPercent)
		}
		return ""
	case "event_refund_percent":
		if data.Event.RefundPercent != nil {
			return fmt.Sprintf("%.0f", *data.Event.RefundPercent)
		}
		if data.Profile.DefaultRefundPercent != nil {
			return fmt.Sprintf("%.0f", *data.Profile.DefaultRefundPercent)
		}
		return ""
	case "event_cancellation_days":
		if data.Event.CancellationDays != nil {
			return fmt.Sprintf("%.0f", *data.Event.CancellationDays)
		}
		if data.Profile.DefaultCancellationDays != nil {
			return fmt.Sprintf("%.0f", *data.Profile.DefaultCancellationDays)
		}
		return ""

	// Client
	case "client_name":
		if data.Client != nil {
			return data.Client.Name
		}
		return ""
	case "client_phone":
		if data.Client != nil {
			return data.Client.Phone
		}
		return ""
	case "client_email":
		if data.Client != nil {
			return asText(data.Client.Email)
		}
		return ""
	case "client_address":
		if data.Client != nil {
			return asText(data.Client.Address)
		}
		return ""
	case "client_city":
		if data.Client != nil {
			return asText(data.Client.City)
		}
		return ""

	// Contract
	case "contract_city":
		if city := asText(data.Event.City); city != "" {
			return city
		}
		if data.Client != nil {
			return asText(data.Client.City)
		}
		return ""

	// Derived
	case "event_services_list":
		if len(data.Products) == 0 {
			return ""
		}
		parts := make([]string, 0, len(data.Products))
		for _, p := range data.Products {
			qty := p.Quantity
			if qty == 0 {
				qty = 1
			}
			name := "Producto"
			if p.ProductName != nil {
				name = *p.ProductName
			}
			parts = append(parts, fmt.Sprintf("%.0f %s", qty, name))
		}
		return strings.Join(parts, ", ")

	case "event_paid_amount":
		total := 0.0
		for _, p := range data.Payments {
			total += p.Amount
		}
		return FormatCurrency(total)
	}

	return ""
}
