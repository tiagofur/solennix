package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// SEOHandler serves crawler-friendly artifacts for the public profile:
// a dynamic sitemap of enabled profiles and a per-profile OG preview image.
type SEOHandler struct {
	userRepo    seoUserRepo
	profileRepo seoProfileRepo
	frontendURL string
}

type seoUserRepo interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}
type seoProfileRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
	ListEnabledSlugs(ctx context.Context) ([]repository.PublicProfileSlug, error)
}

func NewSEOHandler(userRepo *repository.UserRepo, profileRepo *repository.PublicProfileRepo, frontendURL string) *SEOHandler {
	return &SEOHandler{userRepo: userRepo, profileRepo: profileRepo, frontendURL: strings.TrimSuffix(frontendURL, "/")}
}

// SitemapProfiles handles GET /api/public/sitemap-profiles.xml
func (h *SEOHandler) SitemapProfiles(w http.ResponseWriter, r *http.Request) {
	slugs, err := h.profileRepo.ListEnabledSlugs(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to build sitemap")
		return
	}
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	for _, s := range slugs {
		b.WriteString("  <url>\n")
		b.WriteString("    <loc>" + h.frontendURL + "/u/" + s.Slug + "</loc>\n")
		if !s.UpdatedAt.IsZero() {
			b.WriteString("    <lastmod>" + s.UpdatedAt.UTC().Format(time.RFC3339) + "</lastmod>\n")
		}
		b.WriteString("  </url>\n")
	}
	b.WriteString("</urlset>\n")
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write([]byte(b.String()))
}

// OGImage handles GET /api/public/organizers/{slug}/og-image
//
// If the profile has a cover image with an absolute URL, it redirects there
// (scrapers follow og:image redirects). Otherwise it renders a simple branded
// PNG fallback so the social card is never blank.
func (h *SEOHandler) OGImage(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "Organizer slug is required")
		return
	}
	user, err := h.userRepo.GetByPublicSlug(r.Context(), slug)
	if err != nil || !isPubliclyVisibleAccount(user) {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}
	profile, err := h.profileRepo.GetByUserID(r.Context(), user.ID)
	if err != nil || profile == nil || !profile.IsEnabled {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	// Prefer the cover image when it is an absolute URL.
	if user.CoverURL != nil && *user.CoverURL != "" && isAbsoluteURL(*user.CoverURL) {
		http.Redirect(w, r, *user.CoverURL, http.StatusFound)
		return
	}
	if user.LogoURL != nil && *user.LogoURL != "" && isAbsoluteURL(*user.LogoURL) {
		http.Redirect(w, r, *user.LogoURL, http.StatusFound)
		return
	}

	// Branded PNG fallback.
	bg := brandColorOrDefault(user.BrandColor)
	pngBytes, err := renderBrandedPNG(bg, businessNameOrDefault(user))
	if err != nil {
		http.Redirect(w, r, h.frontendURL+"/og-image.png", http.StatusFound)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "public, max-age=3600")
	_, _ = w.Write(pngBytes)
}

func isAbsoluteURL(s string) bool {
	return strings.HasPrefix(strings.ToLower(s), "http://") || strings.HasPrefix(strings.ToLower(s), "https://")
}

func brandColorOrDefault(c *string) color.RGBA {
	if c != nil && len(*c) == 7 && (*c)[0] == '#' {
		return color.RGBA{R: hexNibble(*c, 1), G: hexNibble(*c, 3), B: hexNibble(*c, 5), A: 0xFF}
	}
	// Solennix gold #C4A265.
	return color.RGBA{R: 0xC4, G: 0xA2, B: 0x65, A: 0xFF}
}

func hexNibble(s string, start int) uint8 {
	var v uint8
	for i := start; i < start+2; i++ {
		v <<= 4
		switch {
		case s[i] >= '0' && s[i] <= '9':
			v |= s[i] - '0'
		case s[i] >= 'a' && s[i] <= 'f':
			v |= s[i] - 'a' + 10
		case s[i] >= 'A' && s[i] <= 'F':
			v |= s[i] - 'A' + 10
		}
	}
	return v
}

func businessNameOrDefault(u *models.User) string {
	if u.BusinessName != nil && strings.TrimSpace(*u.BusinessName) != "" {
		return *u.BusinessName
	}
	if u.Name != "" {
		return u.Name
	}
	return "Solennix"
}

// renderBrandedPNG draws a 1200x630 card with the brand color. The business
// name is not rasterized (no bundled font); the gradient/solid color block is
// enough to avoid a blank social card. A richer renderer can replace this.
func renderBrandedPNG(bg color.RGBA, _ string) ([]byte, error) {
	const w, h = 1200, 630
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), &image.Uniform{C: bg}, image.Point{}, draw.Src)

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
