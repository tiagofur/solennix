package handlers

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// PublicProfileHandler serves the unauthenticated public aggregate GET for an
// organizer's professional profile. It is plan-aware: Free plans get the basic
// projection (≤3 services, no reviews/portfolio/socials), Pro+ honor section
// toggles. Prices are omitted unless the profile has show_prices=true.
type PublicProfileHandler struct {
	userRepo    publicProfileUserRepo
	profileRepo publicProfileConfigRepo
	productRepo publicProfileProductRepo
	reviewRepo  publicProfileReviewRepo
	frontendURL string
}

// Local interface slices of the concrete repos, so the handler is unit-testable
// with fakes (no DB required). Each is satisfied by the corresponding
// *repository.*Repo.
type publicProfileUserRepo interface {
	GetByPublicSlug(ctx context.Context, slug string) (*models.User, error)
}
type publicProfileConfigRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
}
type publicProfileProductRepo interface {
	ListPublicProfileServices(ctx context.Context, userID uuid.UUID) ([]models.Product, error)
}
type publicProfileReviewRepo interface {
	ListPublicByOrganizerSlug(ctx context.Context, slug string) ([]*models.EventReview, error)
}

// NewPublicProfileHandler assembles the handler with its repository deps.
func NewPublicProfileHandler(
	userRepo *repository.UserRepo,
	profileRepo *repository.PublicProfileRepo,
	productRepo *repository.ProductRepo,
	reviewRepo *repository.EventReviewRepo,
	frontendURL string,
) *PublicProfileHandler {
	return &PublicProfileHandler{
		userRepo:    userRepo,
		profileRepo: profileRepo,
		productRepo: productRepo,
		reviewRepo:  reviewRepo,
		frontendURL: strings.TrimSuffix(frontendURL, "/"),
	}
}

// GetPublicProfile handles GET /api/public/organizers/{slug}.
// 404 when slug is unknown, profile is missing, or is_enabled=false.
func (h *PublicProfileHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
	slug := strings.TrimSpace(r.PathValue("slug"))
	if slug == "" {
		writeError(w, http.StatusBadRequest, "Organizer slug is required")
		return
	}

	user, err := h.userRepo.GetByPublicSlug(r.Context(), slug)
	if err != nil {
		if isPgxNoRows(err) {
			writeError(w, http.StatusNotFound, "Profile not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to load profile")
		return
	}

	profile, err := h.profileRepo.GetByUserID(r.Context(), user.ID)
	if err != nil {
		// Missing profile row -> not enabled -> 404 from the visitor's view.
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}
	if !profile.IsEnabled {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	dto := h.buildProjection(r.Context(), user, profile)
	writeJSON(w, http.StatusOK, map[string]any{"data": dto})
}

// buildProjection assembles the plan-aware PublicOrganizerProfile.
func (h *PublicProfileHandler) buildProjection(ctx context.Context, user *models.User, profile *models.OrganizerPublicProfile) models.PublicOrganizerProfile {
	fullPlan := FeatureAvailable(user.Plan, "public_profile_full")
	reviewsAllowed := fullPlan && profile.ShowReviews && FeatureAvailable(user.Plan, "reviews")

	dto := models.PublicOrganizerProfile{Slug: slugOrEmpty(user.PublicSlug)}
	if user.BusinessName != nil {
		dto.BusinessName = *user.BusinessName
	}
	dto.LogoURL = user.LogoURL
	dto.BrandColor = user.BrandColor
	dto.Headline = profile.Headline

	if profile.City != nil || profile.Region != nil || profile.Country != nil {
		dto.Location = &models.PublicLocation{
			City: profile.City, Region: profile.Region, Country: profile.Country,
		}
	}

	// Basic plans still get one contact when the toggle is on.
	if profile.ShowContact && profile.ContactType != nil && *profile.ContactType != "" {
		dto.Contact = &models.PublicContact{Type: *profile.ContactType, Value: derefStr(profile.ContactValue)}
	}

	if profile.ShowServices {
		dto.Services = h.projectServices(ctx, user.ID, profile, fullPlan)
	}

	// Pro+ only AND toggle on. Free omits the reviews key entirely (spec).
	if reviewsAllowed {
		dto.Reviews = h.projectReviews(ctx, user.PublicSlug)
	}

	// Portfolio: Pro+ AND toggle on. No portfolio repo yet (PR5); left omitted.
	// Socials: Pro+ only.
	if fullPlan {
		dto.Socials = profile.Socials
	}

	return dto
}

func (h *PublicProfileHandler) projectServices(ctx context.Context, userID uuid.UUID, profile *models.OrganizerPublicProfile, fullPlan bool) []models.PublicProfileService {
	products, err := h.productRepo.ListPublicProfileServices(ctx, userID)
	if err != nil {
		return []models.PublicProfileService{}
	}
	if !fullPlan && len(products) > 3 {
		products = products[:3]
	}
	out := make([]models.PublicProfileService, 0, len(products))
	for _, p := range products {
		svc := models.PublicProfileService{
			ID: p.ID, Name: p.Name, Category: p.Category, ImageURL: p.ImageURL,
		}
		if profile.ShowPrices {
			bp := p.BasePrice
			svc.BasePrice = &bp
		}
		out = append(out, svc)
	}
	return out
}

func (h *PublicProfileHandler) projectReviews(ctx context.Context, slug *string) []models.PublicReview {
	if slug == nil || *slug == "" {
		return []models.PublicReview{}
	}
	raw, err := h.reviewRepo.ListPublicByOrganizerSlug(ctx, *slug)
	if err != nil {
		return []models.PublicReview{}
	}
	out := make([]models.PublicReview, 0, len(raw))
	for _, er := range raw {
		out = append(out, toPublicReview(er))
	}
	return out
}

// isPgxNoRows reports whether err is (or wraps) pgx.ErrNoRows.
func isPgxNoRows(err error) bool {
	if err == nil {
		return false
	}
	return err == pgx.ErrNoRows || strings.Contains(err.Error(), pgx.ErrNoRows.Error())
}

func slugOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
