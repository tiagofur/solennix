package pdf

import (
	"bytes"
	"image"
	_ "image/jpeg" // decode JPEG
	_ "image/png"  // decode PNG
	"strings"

	"github.com/go-pdf/fpdf"
)

// Page constants (US Letter: 612x792 points → mm).
const (
	PageWidth    = 215.9 // mm (US Letter)
	PageHeight   = 279.4 // mm (US Letter)
	MarginLeft   = 20.0
	MarginRight  = 20.0
	MarginTop    = 20.0
	MarginBottom = 20.0
	ContentWidth = PageWidth - MarginLeft - MarginRight // ~175.9mm

	DefaultBrandColor = "#C4A265"
	HeaderLogoMaxW    = 30.0 // mm, max logo width
	HeaderLogoMaxH    = 20.0 // mm, max logo height
	HeaderSeparatorH  = 0.8  // mm, separator line thickness
	HeaderHeight      = 30.0 // mm, reserved header block height
)

// PDFDoc wraps fpdf.Fpdf with Solennix-specific helpers.
type PDFDoc struct {
	*fpdf.Fpdf
	BrandColor     string
	ShowName       bool
	BusinessName   string
	LogoBytes      []byte
	CurrentPage    int
	FooterText     string
	footerSet      bool
	hasLogo        bool
	logoWidth      float64
	logoHeight     float64
	logoImageID    string
}

// NewPDFDoc creates a new PDF document with embedded Unicode fonts and standard config.
func NewPDFDoc(brandColor, businessName string, showName bool, logoBytes []byte) (*PDFDoc, error) {
	fpdfObj := fpdf.New("P", "mm", "Letter", "")
	fpdfObj.SetAutoPageBreak(true, MarginBottom)
	fpdfObj.SetMargins(MarginLeft, MarginTop, MarginRight)

	// Register Unicode fonts
	if err := RegisterFonts(fpdfObj); err != nil {
		return nil, err
	}

	doc := &PDFDoc{
		Fpdf:         fpdfObj,
		BrandColor:   brandColor,
		ShowName:     showName,
		BusinessName: businessName,
		LogoBytes:    logoBytes,
	}

	if brandColor == "" {
		doc.BrandColor = DefaultBrandColor
	}

	// Parse logo image if provided
	if len(logoBytes) > 0 {
		if err := doc.registerLogo(); err == nil {
			doc.hasLogo = true
		}
		// If logo fails to parse, we silently skip it — PDF still generates
	}

	return doc, nil
}

// registerLogo parses the logo bytes and registers the image with fpdf.
func (d *PDFDoc) registerLogo() error {
	img, _, err := image.Decode(bytes.NewReader(d.LogoBytes))
	if err != nil {
		return err
	}

	// Get image dimensions
	bounds := img.Bounds()
	imgW := float64(bounds.Dx())
	imgH := float64(bounds.Dy())

	if imgW == 0 || imgH == 0 {
		return nil
	}

	// Scale to fit within max bounds, preserving aspect ratio
	ratio := imgW / imgH
	if ratio > HeaderLogoMaxW/HeaderLogoMaxH {
		d.logoWidth = HeaderLogoMaxW
		d.logoHeight = HeaderLogoMaxW / ratio
	} else {
		d.logoHeight = HeaderLogoMaxH
		d.logoWidth = HeaderLogoMaxH * ratio
	}

	// Register image via bytes reader for reuse across pages
	d.logoImageID = "__solennix_logo__"
	opts := fpdf.ImageOptions{ImageType: "auto"}
	d.RegisterImageOptionsReader(d.logoImageID, opts, bytes.NewReader(d.LogoBytes))

	return nil
}

// hexColorToRGB parses "#RRGGBB" into r, g, b values (0-255).
func hexColorToRGB(hex string) (int, int, int) {
	hex = strings.TrimPrefix(hex, "#")
	if len(hex) != 6 {
		return 196, 162, 101 // default brand color fallback
	}
	r := hexToInt(hex[0:2])
	g := hexToInt(hex[2:4])
	b := hexToInt(hex[4:6])
	return r, g, b
}

func hexToInt(s string) int {
	var v int
	for _, c := range s {
		v <<= 4
		switch {
		case c >= '0' && c <= '9':
			v += int(c - '0')
		case c >= 'a' && c <= 'f':
			v += int(c - 'a' + 10)
		case c >= 'A' && c <= 'F':
			v += int(c - 'A' + 10)
		}
	}
	return v
}

// BrandRGB returns the brand color as r, g, b (0-255).
func (d *PDFDoc) BrandRGB() (int, int, int) {
	return hexColorToRGB(d.BrandColor)
}

// SetBrandColor sets the draw + text color to the brand color.
func (d *PDFDoc) SetBrandColor() {
	r, g, b := d.BrandRGB()
	d.SetDrawColor(r, g, b)
	d.SetTextColor(r, g, b)
}

// SetTextColorDefault sets text to dark gray (#1A1A1A).
func (d *PDFDoc) SetTextColorDefault() {
	d.SetTextColor(26, 26, 26)
}

// SetTextColorSecondary sets text to medium gray (#666666).
func (d *PDFDoc) SetTextColorSecondary() {
	d.SetTextColor(102, 102, 102)
}

// SetTextColorWhite sets text to white.
func (d *PDFDoc) SetTextColorWhite() {
	d.SetTextColor(255, 255, 255)
}

// DrawHeader draws the shared header: logo + business name (left) + title (right) + separator.
// Returns the Y position after the header.
func (d *PDFDoc) DrawHeader(title string) float64 {
	y := MarginTop
	d.SetFont(FontDejaVuSans, "", 8)

	// Calculate layout
	hasName := d.ShowName && d.BusinessName != ""
	hasLogo := d.hasLogo

	leftX := MarginLeft
	contentEndX := PageWidth - MarginRight

	switch {
	case hasLogo && hasName:
		// Logo left, then name, then title right-aligned
		d.Image(d.logoImageID, leftX, y, d.logoWidth, d.logoHeight, false, "", 0, "")
		nameX := leftX + d.logoWidth + 5
		d.SetFont(FontDejaVuSansBold, "", 12)
		d.SetTextColorDefault()
		d.Text(nameX, y+d.logoHeight/2+3, d.BusinessName)
		// Title right-aligned
		d.SetFont(FontDejaVuSansBold, "", 10)
		d.SetBrandColor()
		titleW := d.GetStringWidth(title)
		d.Text(contentEndX-titleW, y+d.logoHeight/2+3, title)
		y += d.logoHeight + 3

	case hasLogo && !hasName:
		// Logo left, title right-aligned
		d.Image(d.logoImageID, leftX, y, d.logoWidth, d.logoHeight, false, "", 0, "")
		d.SetFont(FontDejaVuSansBold, "", 10)
		d.SetBrandColor()
		titleW := d.GetStringWidth(title)
		d.Text(contentEndX-titleW, y+d.logoHeight/2+3, title)
		y += d.logoHeight + 3

	case !hasLogo && hasName:
		// Name left, title right-aligned
		d.SetFont(FontDejaVuSansBold, "", 12)
		d.SetTextColorDefault()
		d.Text(leftX, y+6, d.BusinessName)
		d.SetFont(FontDejaVuSansBold, "", 10)
		d.SetBrandColor()
		titleW := d.GetStringWidth(title)
		d.Text(contentEndX-titleW, y+6, title)
		y += 12

	default:
		// No logo, no name → centered title
		d.SetFont(FontDejaVuSansBold, "", 14)
		d.SetBrandColor()
		titleW := d.GetStringWidth(title)
		centerX := (PageWidth - titleW) / 2
		d.Text(centerX, y+8, title)
		y += 14
	}

	// Brand-colored separator line
	d.SetBrandColor()
	d.SetLineWidth(HeaderSeparatorH)
	d.Line(MarginLeft, y, PageWidth-MarginRight, y)
	y += 6 // space after separator

	return y
}

// DrawSectionHeader draws a section title with brand-colored text.
func (d *PDFDoc) DrawSectionHeader(y float64, title string) float64 {
	d.SetFont(FontDejaVuSansBold, "", 11)
	d.SetBrandColor()
	d.Text(MarginLeft, y+5, title)
	y += 8
	d.SetTextColorDefault()
	return y
}

// DrawInfoGrid draws a 2-column info grid (label: value pairs).
// Each column takes half the content width.
func (d *PDFDoc) DrawInfoGrid(y float64, leftItems, rightItems [][2]string) float64 {
	d.SetFont(FontDejaVuSans, "", 9)
	colWidth := ContentWidth / 2
	lineHeight := 5.0

	maxRows := len(leftItems)
	if len(rightItems) > maxRows {
		maxRows = len(rightItems)
	}

	for i := 0; i < maxRows; i++ {
		// Left column
		if i < len(leftItems) {
			label, value := leftItems[i][0], leftItems[i][1]
			d.SetTextColorSecondary()
			d.Text(MarginLeft, y, label+":")
			d.SetTextColorDefault()
			d.Text(MarginLeft+30, y, value)
		}

		// Right column
		if i < len(rightItems) {
			label, value := rightItems[i][0], rightItems[i][1]
			rightX := MarginLeft + colWidth
			d.SetTextColorSecondary()
			d.Text(rightX, y, label+":")
			d.SetTextColorDefault()
			d.Text(rightX+30, y, value)
		}

		y += lineHeight
	}

	return y
}

// DrawSeparator draws a thin horizontal line.
func (d *PDFDoc) DrawSeparator(y float64) {
	d.SetDrawColor(200, 200, 200)
	d.SetLineWidth(0.3)
	d.Line(MarginLeft, y, PageWidth-MarginRight, y)
}

// DrawSummaryRow draws a financial summary row (label left, value right).
func (d *PDFDoc) DrawSummaryRow(y float64, label, value string, bold bool) float64 {
	if bold {
		d.SetFont(FontDejaVuSansBold, "", 10)
	} else {
		d.SetFont(FontDejaVuSans, "", 10)
	}
	d.SetTextColorDefault()
	d.Text(MarginLeft, y, label)
	// Right-align value
	valW := d.GetStringWidth(value)
	d.Text(PageWidth-MarginRight-valW, y, value)
	return y + 6
}

// DrawFooterText draws a small gray centered footer text.
func (d *PDFDoc) DrawFooterText(text string) {
	d.SetFont(FontDejaVuSans, "", 7)
	d.SetTextColorSecondary()
	w := d.GetStringWidth(text)
	d.Text((PageWidth-w)/2, PageHeight-10, text)
}

// NewPage adds a new page and returns the starting Y (after top margin).
func (d *PDFDoc) NewPage() float64 {
	d.AddPage()
	return MarginTop
}

// EnsureSpace checks if there's enough space on the current page.
// If not, adds a new page and returns the new Y position.
// Otherwise returns y unchanged.
func (d *PDFDoc) EnsureSpace(y, needed float64) float64 {
	if y+needed > PageHeight-MarginBottom {
		d.AddPage()
		return MarginTop
	}
	return y
}

// Output returns the PDF as raw bytes.
func (d *PDFDoc) Output() ([]byte, error) {
	var buf bytes.Buffer
	if err := d.Fpdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
