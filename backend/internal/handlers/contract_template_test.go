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
}
