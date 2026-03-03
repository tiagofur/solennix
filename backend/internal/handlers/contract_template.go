package handlers

import (
	"fmt"
	"regexp"
	"strings"
)

const contractTemplateMaxLength = 20000

var contractTemplateTokenRegex = regexp.MustCompile(`\[([^\[\]]+)\]`)

var allowedContractTemplateTokens = map[string]struct{}{
	"provider_name":             {},
	"provider_business_name":    {},
	"provider_email":            {},
	"current_date":              {},
	"event_date":                {},
	"event_start_time":          {},
	"event_end_time":            {},
	"event_time_range":          {},
	"event_service_type":        {},
	"event_num_people":          {},
	"event_location":            {},
	"event_city":                {},
	"event_total_amount":        {},
	"event_deposit_percent":     {},
	"event_refund_percent":      {},
	"event_cancellation_days":   {},
	"client_name":               {},
	"client_phone":              {},
	"client_email":              {},
	"client_address":            {},
	"client_city":               {},
	"contract_city":             {},
}

var contractTemplateTokenAliases = map[string]string{
	"nombre del proveedor":                 "provider_name",
	"nombre comercial del proveedor":       "provider_business_name",
	"email del proveedor":                  "provider_email",
	"fecha actual":                         "current_date",
	"fecha del evento":                     "event_date",
	"hora de inicio":                       "event_start_time",
	"hora de fin":                          "event_end_time",
	"horario del evento":                   "event_time_range",
	"tipo de servicio":                     "event_service_type",
	"numero de personas":                   "event_num_people",
	"lugar del evento":                     "event_location",
	"ciudad del evento":                    "event_city",
	"monto total del evento":               "event_total_amount",
	"porcentaje de anticipo":               "event_deposit_percent",
	"porcentaje de reembolso":              "event_refund_percent",
	"dias de cancelacion":                  "event_cancellation_days",
	"nombre del cliente":                   "client_name",
	"telefono del cliente":                 "client_phone",
	"email del cliente":                    "client_email",
	"direccion del cliente":                "client_address",
	"ciudad del cliente":                   "client_city",
	"ciudad del contrato":                  "contract_city",
}

var contractTemplateDiacriticsReplacer = strings.NewReplacer(
	"á", "a",
	"é", "e",
	"í", "i",
	"ó", "o",
	"ú", "u",
	"ü", "u",
	"ñ", "n",
)

func normalizeContractTemplateToken(token string) string {
	normalized := strings.TrimSpace(strings.ToLower(token))
	normalized = contractTemplateDiacriticsReplacer.Replace(normalized)
	normalized = strings.ReplaceAll(normalized, "_", " ")
	normalized = strings.Join(strings.Fields(normalized), " ")
	return normalized
}

func resolveContractTemplateToken(token string) string {
	normalized := normalizeContractTemplateToken(token)

	if _, ok := allowedContractTemplateTokens[strings.ReplaceAll(normalized, " ", "_")]; ok {
		return strings.ReplaceAll(normalized, " ", "_")
	}

	if canonical, ok := contractTemplateTokenAliases[normalized]; ok {
		return canonical
	}

	return ""
}

func validateContractTemplate(template string) error {
	if len(template) > contractTemplateMaxLength {
		return ValidationError{Field: "contract_template", Message: fmt.Sprintf("must be %d characters or fewer", contractTemplateMaxLength)}
	}

	matches := contractTemplateTokenRegex.FindAllStringSubmatch(template, -1)
	for _, match := range matches {
		token := strings.TrimSpace(match[1])
		canonical := resolveContractTemplateToken(token)
		if canonical == "" {
			return ValidationError{Field: "contract_template", Message: fmt.Sprintf("contains unsupported token [%s]", token)}
		}
		token = canonical
		if _, ok := allowedContractTemplateTokens[token]; !ok {
			return ValidationError{Field: "contract_template", Message: fmt.Sprintf("contains unsupported token [%s]", token)}
		}
	}

	return nil
}
