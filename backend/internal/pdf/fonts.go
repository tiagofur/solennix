package pdf

import (
	"embed"
	"io/fs"

	"github.com/go-pdf/fpdf"
)

//go:embed fonts/*.ttf
var fontsFS embed.FS

const (
	// FontDejaVuSans is the primary Unicode font supporting Spanish chars.
	FontDejaVuSans = "DejaVuSans"
	// FontDejaVuSansBold is the bold variant.
	FontDejaVuSansBold = "DejaVuSansBold"
	// FontDejaVuSansOblique is the italic variant.
	FontDejaVuSansOblique = "DejaVuSansOblique"
	// FontDejaVuSansBoldOblique is the bold-italic variant.
	FontDejaVuSansBoldOblique = "DejaVuSansBoldOblique"
)

// RegisterFonts loads the embedded TTF fonts into the fpdf instance.
// Must be called before any text rendering.
func RegisterFonts(pdf *fpdf.Fpdf) error {
	type fontEntry struct {
		family string
		file   string
	}

	fonts := []fontEntry{
		{FontDejaVuSans, "DejaVuSans.ttf"},
		{FontDejaVuSansBold, "DejaVuSans-Bold.ttf"},
		{FontDejaVuSansOblique, "DejaVuSans-Oblique.ttf"},
		{FontDejaVuSansBoldOblique, "DejaVuSans-BoldOblique.ttf"},
	}

	for _, f := range fonts {
		data, err := fs.ReadFile(fontsFS, "fonts/"+f.file)
		if err != nil {
			return err
		}
		pdf.AddUTF8FontFromBytes(f.family, "", data)
	}

	// Register bold/italic/bold-italic as separate families for simplicity.
	// go-pdf/fpdf uses style strings ("B", "I", "BI") mapped to registered families.
	// We register them all under the base family name with different style suffixes.
	// However, AddUTF8FontFromBytes only takes family+style.
	// So we register each variant as a separate family and use SetFont(family, "", size).

	return nil
}

// RegisterFontsEmbedded is an alias for RegisterFonts.
// Kept for API clarity — the fonts are always embedded.
var RegisterFontsEmbedded = RegisterFonts
