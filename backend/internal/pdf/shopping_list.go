package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// ShoppingListData holds all data needed to generate a Shopping List PDF.
// Ingredients are ProductIngredient records (with bring_to_event = true) joined
// with their inventory names and units.
type ShoppingListData struct {
	Event       models.Event
	Client      *models.Client
	Profile     *models.User
	Ingredients []models.ProductIngredient // supply/ingredient items to bring
	LogoBytes   []byte
}

// GenerateShoppingList creates a Lista de Insumos PDF and returns the raw bytes.
func GenerateShoppingList(data ShoppingListData) ([]byte, error) {
	showName := data.Profile.ShowBusinessNameInPdf == nil || *data.Profile.ShowBusinessNameInPdf
	businessName := ""
	if data.Profile.BusinessName != nil {
		businessName = *data.Profile.BusinessName
	}
	brandColor := ""
	if data.Profile.BrandColor != nil {
		brandColor = *data.Profile.BrandColor
	}

	doc, err := NewPDFDoc(brandColor, businessName, showName, data.LogoBytes)
	if err != nil {
		return nil, fmt.Errorf("create PDF: %w", err)
	}

	doc.AddPage()
	y := doc.DrawHeader("Lista de Insumos")

	// ── Event Info ──
	clientName := "N/A"
	if data.Client != nil {
		clientName = data.Client.Name
	}
	leftItems := [][2]string{
		{"Cliente", clientName},
		{"Evento", data.Event.ServiceType},
	}
	rightItems := [][2]string{
		{"Fecha", FormatDate(data.Event.EventDate)},
		{"Personas", fmt.Sprintf("%d", data.Event.NumPeople)},
	}
	y = doc.DrawInfoGrid(y, leftItems, rightItems)
	y += 5

	// ── Ingredients Table ──
	y = doc.DrawSectionHeader(y, "Insumos Requeridos")

	colWidths := []float64{ContentWidth * 0.50, ContentWidth * 0.25, ContentWidth * 0.25}
	headers := []string{"Ingrediente / Insumo", "Cantidad", "Unidad"}
	y = drawTableHeader(doc, y, headers, colWidths)

	if len(data.Ingredients) > 0 {
		for _, ing := range data.Ingredients {
			y = doc.EnsureSpace(y, 8)

			name := "—"
			if ing.IngredientName != nil {
				name = *ing.IngredientName
			}
			unit := "—"
			if ing.Unit != nil {
				unit = *ing.Unit
			}

			drawTableRow(doc, y, []string{
				name,
				fmt.Sprintf("%.2f", ing.QuantityRequired),
				unit,
			}, colWidths)
			y += 7
		}
	} else {
		doc.SetFont(FontDejaVuSans, "", 9)
		doc.SetTextColorSecondary()
		doc.Text(MarginLeft, y, "No hay insumos registrados para este evento.")
		y += 8
	}

	doc.DrawFooterText("Generado por Solennix")
	return doc.Output()
}
