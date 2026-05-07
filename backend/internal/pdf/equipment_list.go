package pdf

import (
	"fmt"

	"github.com/tiagofur/solennix-backend/internal/models"
)

// EquipmentListData holds all data needed to generate an Equipment List PDF.
type EquipmentListData struct {
	Event     models.Event
	Client    *models.Client
	Profile   *models.User
	Equipment []models.EventEquipment
	LogoBytes []byte
}

// GenerateEquipmentList creates a Lista de Equipo PDF and returns the raw bytes.
func GenerateEquipmentList(data EquipmentListData) ([]byte, error) {
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
	y := doc.DrawHeader("Lista de Equipo")

	// ── Event Info ──
	clientName := "N/A"
	if data.Client != nil {
		clientName = data.Client.Name
	}
	leftItems := [][2]string{
		{"Cliente", clientName},
		{"Evento", data.Event.ServiceType},
	}

	location := "Por definir"
	if data.Event.Location != nil && *data.Event.Location != "" {
		location = *data.Event.Location
	}
	rightItems := [][2]string{
		{"Fecha", FormatDate(data.Event.EventDate)},
		{"Lugar", location},
	}
	y = doc.DrawInfoGrid(y, leftItems, rightItems)
	y += 5

	// ── Equipment Table ──
	y = doc.DrawSectionHeader(y, "Equipo a Trasladar")

	colWidths := []float64{ContentWidth * 0.07, ContentWidth * 0.53, ContentWidth * 0.20, ContentWidth * 0.20}
	headers := []string{"✓", "Artículo", "Cant.", "Unidad"}
	y = drawTableHeader(doc, y, headers, colWidths)

	if len(data.Equipment) > 0 {
		for _, eq := range data.Equipment {
			y = doc.EnsureSpace(y, 8)

			name := "Equipo"
			if eq.EquipmentName != nil {
				name = *eq.EquipmentName
			}
			unit := "pza"
			if eq.Unit != nil && *eq.Unit != "" {
				unit = *eq.Unit
			}

			notes := ""
			if eq.Notes != nil && *eq.Notes != "" {
				notes = " (" + *eq.Notes + ")"
			}

			drawTableRow(doc, y, []string{
				"☐",
				name + notes,
				fmt.Sprintf("%d", eq.Quantity),
				unit,
			}, colWidths)
			y += 7
		}
	} else {
		doc.SetFont(FontDejaVuSans, "", 9)
		doc.SetTextColorSecondary()
		doc.Text(MarginLeft, y, "No hay equipo registrado para este evento.")
		y += 8
	}

	doc.DrawFooterText("Generado por Solennix")
	return doc.Output()
}
