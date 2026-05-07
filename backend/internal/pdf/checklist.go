package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// ChecklistData holds all data needed to generate a Checklist PDF.
type ChecklistData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Products  []models.EventProduct
	Extras    []models.EventExtra
	Equipment []models.EventEquipment // items to bring (type = equipment)
	Supplies  []models.EventSupply    // consumables to prepare
	LogoBytes []byte
}

// GenerateChecklist creates a Checklist de Carga PDF and returns the raw bytes.
func GenerateChecklist(data ChecklistData) ([]byte, error) {
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
	y := doc.DrawHeader("Checklist de Carga")

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

	// ── Productos y Servicios ──
	if len(data.Products) > 0 || len(data.Extras) > 0 {
		y = doc.DrawSectionHeader(y, "Productos y Servicios")
		colW := []float64{ContentWidth * 0.07, ContentWidth * 0.63, ContentWidth * 0.30}
		headers := []string{"✓", "Descripción", "Cantidad"}
		y = drawTableHeader(doc, y, headers, colW)

		for _, p := range data.Products {
			y = doc.EnsureSpace(y, 8)
			name := "Producto"
			if p.ProductName != nil {
				name = *p.ProductName
			}
			drawTableRow(doc, y, []string{"☐", name, fmt.Sprintf("%.0f", p.Quantity)}, colW)
			y += 7
		}
		for _, e := range data.Extras {
			y = doc.EnsureSpace(y, 8)
			if e.IncludeInChecklist {
				drawTableRow(doc, y, []string{"☐", e.Description, "1"}, colW)
				y += 7
			}
		}
		y += 3
	}

	// ── Equipo ──
	if len(data.Equipment) > 0 {
		y = doc.EnsureSpace(y, 20)
		y = doc.DrawSectionHeader(y, "Equipo")
		colW := []float64{ContentWidth * 0.07, ContentWidth * 0.63, ContentWidth * 0.30}
		headers := []string{"✓", "Artículo", "Cantidad"}
		y = drawTableHeader(doc, y, headers, colW)

		for _, eq := range data.Equipment {
			y = doc.EnsureSpace(y, 8)
			name := "Equipo"
			if eq.EquipmentName != nil {
				name = *eq.EquipmentName
			}
			drawTableRow(doc, y, []string{"☐", name, fmt.Sprintf("%d", eq.Quantity)}, colW)
			y += 7
		}
		y += 3
	}

	// ── Insumos ──
	if len(data.Supplies) > 0 {
		y = doc.EnsureSpace(y, 20)
		y = doc.DrawSectionHeader(y, "Insumos")
		colW := []float64{ContentWidth * 0.07, ContentWidth * 0.63, ContentWidth * 0.30}
		headers := []string{"✓", "Insumo", "Cantidad / Unidad"}
		y = drawTableHeader(doc, y, headers, colW)

		for _, s := range data.Supplies {
			y = doc.EnsureSpace(y, 8)
			name := "Insumo"
			if s.SupplyName != nil {
				name = *s.SupplyName
			}
			unit := ""
			if s.Unit != nil {
				unit = " " + *s.Unit
			}
			drawTableRow(doc, y, []string{"☐", name, fmt.Sprintf("%.2f%s", s.Quantity, unit)}, colW)
			y += 7
		}
	}

	doc.DrawFooterText("Generado por Solennix")
	return doc.Output()
}
