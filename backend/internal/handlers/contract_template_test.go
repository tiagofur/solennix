package handlers

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// ---------------------------------------------------------------------------
// TestNormalizeContractTemplateToken
// ---------------------------------------------------------------------------

func TestNormalizeContractTemplateToken(t *testing.T) {
	t.Run("lowercase", func(t *testing.T) {
		assert.Equal(t, "hello world", normalizeContractTemplateToken("Hello World"))
	})

	t.Run("diacritics removal", func(t *testing.T) {
		// á→a, é→e, í→i, ó→o, ú→u, ñ→n, ü→u
		assert.Equal(t, "a e i o u n u", normalizeContractTemplateToken("á é í ó ú ñ ü"))
	})

	t.Run("underscores to spaces", func(t *testing.T) {
		assert.Equal(t, "provider name", normalizeContractTemplateToken("provider_name"))
	})

	t.Run("extra whitespace collapse", func(t *testing.T) {
		assert.Equal(t, "hello world", normalizeContractTemplateToken("  hello   world  "))
	})

	t.Run("trim", func(t *testing.T) {
		assert.Equal(t, "test", normalizeContractTemplateToken("  test  "))
	})

	t.Run("combined diacritics and underscores", func(t *testing.T) {
		assert.Equal(t, "numero de personas", normalizeContractTemplateToken("Número_de_Personas"))
	})

	t.Run("empty string", func(t *testing.T) {
		assert.Equal(t, "", normalizeContractTemplateToken(""))
	})

	t.Run("only whitespace", func(t *testing.T) {
		assert.Equal(t, "", normalizeContractTemplateToken("   \t  "))
	})

	t.Run("only underscores", func(t *testing.T) {
		assert.Equal(t, "", normalizeContractTemplateToken("___"))
	})

	t.Run("mixed underscores and spaces", func(t *testing.T) {
		assert.Equal(t, "hello world", normalizeContractTemplateToken("hello_ _world"))
	})

	t.Run("tabs and newlines treated as whitespace", func(t *testing.T) {
		assert.Equal(t, "a b", normalizeContractTemplateToken("  a \t b  "))
	})

	t.Run("multiple consecutive diacritics", func(t *testing.T) {
		assert.Equal(t, "aeiou", normalizeContractTemplateToken("áéíóú"))
	})

	t.Run("uppercase diacritics", func(t *testing.T) {
		// strings.ToLower converts upper-case letters, but the diacritics
		// replacer only handles lowercase diacritics. So we verify that
		// ToLower is applied first and then the replacer works.
		assert.Equal(t, "direccion del cliente", normalizeContractTemplateToken("Dirección del Cliente"))
	})
}

// ---------------------------------------------------------------------------
// TestResolveContractTemplateToken
// ---------------------------------------------------------------------------

func TestResolveContractTemplateToken(t *testing.T) {
	t.Run("direct English token", func(t *testing.T) {
		assert.Equal(t, "provider_name", resolveContractTemplateToken("provider_name"))
	})

	t.Run("Spanish alias", func(t *testing.T) {
		assert.Equal(t, "provider_name", resolveContractTemplateToken("nombre del proveedor"))
	})

	t.Run("unknown token returns empty", func(t *testing.T) {
		assert.Equal(t, "", resolveContractTemplateToken("something_unknown"))
	})

	t.Run("diacritics in alias", func(t *testing.T) {
		// "número de personas" normalizes to "numero de personas" which is in the alias map
		assert.Equal(t, "event_num_people", resolveContractTemplateToken("número de personas"))
	})

	t.Run("event_date English token", func(t *testing.T) {
		assert.Equal(t, "event_date", resolveContractTemplateToken("event_date"))
	})

	t.Run("Spanish alias fecha del evento", func(t *testing.T) {
		assert.Equal(t, "event_date", resolveContractTemplateToken("fecha del evento"))
	})

	t.Run("Spanish alias with uppercase", func(t *testing.T) {
		assert.Equal(t, "client_name", resolveContractTemplateToken("Nombre del Cliente"))
	})

	t.Run("empty token returns empty", func(t *testing.T) {
		assert.Equal(t, "", resolveContractTemplateToken(""))
	})

	t.Run("whitespace-only token returns empty", func(t *testing.T) {
		assert.Equal(t, "", resolveContractTemplateToken("   "))
	})

	t.Run("token with extra whitespace resolves", func(t *testing.T) {
		assert.Equal(t, "client_name", resolveContractTemplateToken("  client_name  "))
	})

	t.Run("token with mixed case resolves English", func(t *testing.T) {
		assert.Equal(t, "event_total_amount", resolveContractTemplateToken("Event_Total_Amount"))
	})

	t.Run("all English tokens resolve", func(t *testing.T) {
		for token := range allowedContractTemplateTokens {
			result := resolveContractTemplateToken(token)
			assert.Equal(t, token, result, "English token %q should resolve to itself", token)
		}
	})

	t.Run("all Spanish aliases resolve", func(t *testing.T) {
		for alias, expected := range contractTemplateTokenAliases {
			result := resolveContractTemplateToken(alias)
			assert.Equal(t, expected, result, "Spanish alias %q should resolve to %q", alias, expected)
		}
	})

	t.Run("Spanish alias dirección del cliente with diacritics", func(t *testing.T) {
		assert.Equal(t, "client_address", resolveContractTemplateToken("dirección del cliente"))
	})

	t.Run("Spanish alias teléfono del cliente with diacritics", func(t *testing.T) {
		assert.Equal(t, "client_phone", resolveContractTemplateToken("teléfono del cliente"))
	})

	t.Run("Spanish alias días de cancelación with diacritics", func(t *testing.T) {
		assert.Equal(t, "event_cancellation_days", resolveContractTemplateToken("días de cancelación"))
	})

	t.Run("provider_business_name with underscores and caps", func(t *testing.T) {
		assert.Equal(t, "provider_business_name", resolveContractTemplateToken("PROVIDER_BUSINESS_NAME"))
	})

	t.Run("contract_city via English", func(t *testing.T) {
		assert.Equal(t, "contract_city", resolveContractTemplateToken("contract_city"))
	})

	t.Run("contract_city via Spanish alias", func(t *testing.T) {
		assert.Equal(t, "contract_city", resolveContractTemplateToken("ciudad del contrato"))
	})
}

// ---------------------------------------------------------------------------
// TestValidateContractTemplate
// ---------------------------------------------------------------------------

func TestValidateContractTemplate(t *testing.T) {
	t.Run("valid template with tokens", func(t *testing.T) {
		template := "Contrato entre [provider_name] y [client_name] para evento del [event_date]."
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("too long template", func(t *testing.T) {
		template := strings.Repeat("a", 20001)
		err := validateContractTemplate(template)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "20000 characters or fewer")
	})

	t.Run("unsupported token", func(t *testing.T) {
		template := "Contrato con [invalid_token_xyz]"
		err := validateContractTemplate(template)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported token")
		assert.Contains(t, err.Error(), "invalid_token_xyz")
	})

	t.Run("valid Spanish aliases", func(t *testing.T) {
		template := "Contrato entre [nombre del proveedor] y [nombre del cliente] el [fecha del evento]."
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("empty template", func(t *testing.T) {
		err := validateContractTemplate("")
		assert.NoError(t, err)
	})

	t.Run("template with no tokens", func(t *testing.T) {
		template := "Este es un contrato simple sin tokens."
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("valid template at exact max length", func(t *testing.T) {
		template := strings.Repeat("a", 20000)
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("template with Spanish alias with diacritics", func(t *testing.T) {
		template := "Personas: [número de personas]"
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("mix of valid and invalid tokens errors on invalid", func(t *testing.T) {
		template := "Contrato para [client_name] con [invalid_field] y [event_date]."
		err := validateContractTemplate(template)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported token")
		assert.Contains(t, err.Error(), "invalid_field")
	})

	t.Run("error is ValidationError type", func(t *testing.T) {
		template := "Contrato con [not_real]"
		err := validateContractTemplate(template)
		assert.Error(t, err)
		validationErr, ok := err.(ValidationError)
		assert.True(t, ok, "error should be a ValidationError")
		assert.Equal(t, "contract_template", validationErr.Field)
	})

	t.Run("too long template returns ValidationError", func(t *testing.T) {
		template := strings.Repeat("x", contractTemplateMaxLength+1)
		err := validateContractTemplate(template)
		assert.Error(t, err)
		validationErr, ok := err.(ValidationError)
		assert.True(t, ok, "error should be a ValidationError")
		assert.Equal(t, "contract_template", validationErr.Field)
	})

	t.Run("all allowed English tokens in one template", func(t *testing.T) {
		var parts []string
		for token := range allowedContractTemplateTokens {
			parts = append(parts, "["+token+"]")
		}
		template := strings.Join(parts, " ")
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("valid template with mixed English and Spanish tokens", func(t *testing.T) {
		template := "Contrato entre [provider_name] y [nombre del cliente] el [fecha del evento] en [event_city]."
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("template with diacritics-bearing Spanish alias resolves", func(t *testing.T) {
		template := "Dirección: [dirección del cliente]. Teléfono: [teléfono del cliente]."
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("template with uppercase English tokens resolves", func(t *testing.T) {
		template := "Name: [CLIENT_NAME], City: [EVENT_CITY]"
		err := validateContractTemplate(template)
		assert.NoError(t, err)
	})

	t.Run("nested brackets are not tokens", func(t *testing.T) {
		// The regex [^\[\]]+ means brackets inside brackets won't match.
		// "[[nested]]" should match "nested" (the inner brackets are the token delimiters).
		template := "Test [[client_name]]"
		err := validateContractTemplate(template)
		// The regex finds "client_name" as one match; the outer [] are extra text.
		assert.NoError(t, err)
	})

	t.Run("token with only whitespace is unsupported", func(t *testing.T) {
		template := "Contrato [   ] fin."
		err := validateContractTemplate(template)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "unsupported token")
	})
}
