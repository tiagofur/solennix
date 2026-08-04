package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// isPubliclyVisibleAccount reports whether the organizer may appear on public
// surfaces (profile page, reviews sub-route). Blocked / soft-deleted accounts
// must not be discoverable even if a public_slug remains set.
func isPubliclyVisibleAccount(user *models.User) bool {
	if user == nil {
		return false
	}
	if user.DeletedAt != nil {
		return false
	}
	status := strings.TrimSpace(user.AccountStatus)
	if status == "" {
		status = repository.AccountStatusActive
	}
	return status == repository.AccountStatusActive
}

// PublicProfileHandler serves the unauthenticated public aggregate GET for an
// organizer's professional profile. It is plan-aware: Free plans get the basic
// projection (≤3 services, no reviews/portfolio/socials), Pro+ honor section
// toggles. Prices are omitted unless the profile has show_prices=true.
type PublicProfileHandler struct {
	userRepo      publicProfileUserRepo
	profileRepo   publicProfileConfigRepo
	productRepo   publicProfileProductRepo
	reviewRepo    publicProfileReviewRepo
	portfolioRepo publicProfilePortfolioRepo
	eventRepo     publicProfileEventRepo
	searchRepo    publicProfileSearchRepo
	frontendURL   string
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
type publicProfilePortfolioRepo interface {
	ListPortfolioByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPortfolioItem, error)
	ListPackagesByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPackage, error)
	ListFaqByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicFaqItem, error)
}
type publicProfileEventRepo interface {
	CountCompletedByUser(ctx context.Context, userID uuid.UUID) (int, error)
}
type publicProfileSearchRepo interface {
	SearchPublicProfiles(ctx context.Context, f repository.SearchPublicProfilesFilters) ([]models.PublicOrganizerCard, int, error)
}

// NewPublicProfileHandler assembles the handler with its repository deps.
func NewPublicProfileHandler(
	userRepo *repository.UserRepo,
	profileRepo *repository.PublicProfileRepo,
	productRepo *repository.ProductRepo,
	reviewRepo *repository.EventReviewRepo,
	eventRepo *repository.EventRepo,
	frontendURL string,
) *PublicProfileHandler {
	return &PublicProfileHandler{
		userRepo:      userRepo,
		profileRepo:   profileRepo,
		productRepo:   productRepo,
		reviewRepo:    reviewRepo,
		portfolioRepo: profileRepo, // *PublicProfileRepo implements portfolio list
		eventRepo:     eventRepo,
		searchRepo:    profileRepo, // *PublicProfileRepo implements SearchPublicProfiles
		frontendURL:   strings.TrimSuffix(frontendURL, "/"),
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
	// Defense in depth if the repo ever returns non-active accounts.
	if !isPubliclyVisibleAccount(user) {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	profile, err := h.profileRepo.GetByUserID(r.Context(), user.ID)
	if err != nil {
		// Missing profile row -> not enabled -> 404 from the visitor's view.
		// Other errors (DB outage) must not be masked as 404.
		if errors.Is(err, repository.ErrPublicProfileNotFound) || isPgxNoRows(err) {
			writeError(w, http.StatusNotFound, "Profile not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to load profile")
		return
	}
	if !profile.IsEnabled {
		writeError(w, http.StatusNotFound, "Profile not found")
		return
	}

	dto := h.buildProjection(r.Context(), user, profile)
	writeJSON(w, http.StatusOK, map[string]any{"data": dto})
}

// SearchOrganizers handles GET /api/public/organizers (directory listing, #1116).
// Public, unauthenticated. Returns a paginated slice of PublicOrganizerCard with
// plan-aware ranking. Publicability + filters are enforced in the repo query.
// Geo params lat/lng/radius_km (#1127) are parsed here and forwarded to the repo.
func (h *PublicProfileHandler) SearchOrganizers(w http.ResponseWriter, r *http.Request) {
	if h.searchRepo == nil {
		writeError(w, http.StatusNotImplemented, "search not configured")
		return
	}
	params := parsePaginationParams(r, nil, "")
	if params == nil {
		params = &PaginationParams{Page: 1, Limit: 20, Order: "DESC"}
	}

	filters := repository.SearchPublicProfilesFilters{
		City:      strings.TrimSpace(r.URL.Query().Get("city")),
		Country:   strings.TrimSpace(r.URL.Query().Get("country")),
		EventType: strings.TrimSpace(r.URL.Query().Get("event_type")),
		Query:     strings.TrimSpace(r.URL.Query().Get("q")),
		SortBy:    strings.TrimSpace(r.URL.Query().Get("sort")),
		Order:     params.Order,
		Limit:     params.Limit,
		Offset:    (params.Page - 1) * params.Limit,
	}
	// Geo: both lat and lng required; radius_km optional (repo default 50).
	// Invalid numbers are ignored (no 400) so partial/malformed query strings
	// still return text-filtered results instead of hard-failing the page.
	if lat, ok := parseOptionalFloatQuery(r, "lat"); ok {
		if lng, okLng := parseOptionalFloatQuery(r, "lng"); okLng {
			filters.Lat = &lat
			filters.Lng = &lng
			if radius, okR := parseOptionalFloatQuery(r, "radius_km"); okR && radius > 0 {
				filters.RadiusKm = &radius
			}
		}
	}
	// Advanced filters (#1128): budget, service category, availability date.
	if minB, ok := parseOptionalFloatQuery(r, "min_budget"); ok && minB >= 0 {
		filters.MinBudget = &minB
	}
	if maxB, ok := parseOptionalFloatQuery(r, "max_budget"); ok && maxB >= 0 {
		filters.MaxBudget = &maxB
	}
	filters.ServiceCategory = strings.TrimSpace(r.URL.Query().Get("service_category"))
	if day := strings.TrimSpace(r.URL.Query().Get("available_on")); day != "" {
		// Accept only YYYY-MM-DD; ignore malformed dates (no 400).
		if len(day) == 10 && day[4] == '-' && day[7] == '-' {
			filters.AvailableOn = day
		}
	}
	items, total, err := h.searchRepo.SearchPublicProfiles(r.Context(), filters)
	if err != nil {
		slog.Error("public directory search failed", "error", err, "filters", filters)
		writeError(w, http.StatusInternalServerError, "Failed to load directory")
		return
	}
	writePaginatedJSON(w, http.StatusOK, items, total, params)
}

// parseOptionalFloatQuery reads a float64 query param. ok=false when missing or invalid.
func parseOptionalFloatQuery(r *http.Request, key string) (float64, bool) {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return 0, false
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

// buildProjection assembles the plan-aware PublicOrganizerProfile.
func (h *PublicProfileHandler) buildProjection(ctx context.Context, user *models.User, profile *models.OrganizerPublicProfile) models.PublicOrganizerProfile {
	fullPlan := FeatureAvailable(user.Plan, "public_profile_full")
	reviewsAllowed := fullPlan && profile.ShowReviews && FeatureAvailable(user.Plan, "reviews")

	dto := models.PublicOrganizerProfile{Slug: slugOrEmpty(user.PublicSlug)}
	if user.BusinessName != nil {
		dto.BusinessName = *user.BusinessName
	}
	dto.ShowBusinessName = user.ShowBusinessNameInPdf == nil || *user.ShowBusinessNameInPdf
	dto.LogoURL = user.LogoURL
	dto.CoverURL = user.CoverURL
	dto.BrandColor = user.BrandColor
	dto.Headline = profile.Headline
	dto.About = profile.About
	dto.ServiceAreas = profile.ServiceAreas
	dto.MinGuests = profile.MinGuests
	dto.MaxGuests = profile.MaxGuests
	dto.EventTypes = profile.EventTypes
	dto.ResponseTime = profile.ResponseTime
	dto.Languages = profile.Languages

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
		dto.Services = h.projectServices(ctx, user.ID, profile)
	}

	// Pro+ only AND toggle on. Free omits the reviews key entirely (spec).
	if reviewsAllowed {
		reviews, avg, count := h.projectReviews(ctx, user.PublicSlug)
		dto.Reviews = reviews
		if count > 0 {
			dto.AverageRating = &avg
			dto.ReviewsCount = &count
		}
	}

	// Events completed: always-visible social proof (no plan/toggle gate).
	if h.eventRepo != nil {
		if completed, err := h.eventRepo.CountCompletedByUser(ctx, user.ID); err == nil {
			dto.EventsCompleted = completed
		}
	}

	// Portfolio: Pro+ AND show_portfolio. Free omits the key entirely (spec).
	if fullPlan && profile.ShowPortfolio {
		dto.Portfolio = h.projectPortfolio(ctx, user.ID)
	}

	// Packages: toggle-gated (default on). Visible to all plans.
	if profile.ShowPackages {
		dto.Packages = h.projectPackages(ctx, user.ID)
	}

	// FAQ: toggle-gated (default on).
	if profile.ShowFaq {
		dto.Faq = h.projectFaq(ctx, user.ID)
	}

	// Policies: toggle-gated (default off). Sourced from the organizer's defaults.
	if profile.ShowPolicies {
		dto.Policies = buildPublicPolicies(user)
	}

	// Socials: Pro+ only.
	if fullPlan {
		dto.Socials = profile.Socials
	}

	return dto
}

func (h *PublicProfileHandler) projectPackages(ctx context.Context, userID uuid.UUID) []models.PublicPackage {
	if h.portfolioRepo == nil {
		return nil
	}
	raw, err := h.portfolioRepo.ListPackagesByUserID(ctx, userID)
	if err != nil || len(raw) == 0 {
		return nil
	}
	out := make([]models.PublicPackage, 0, len(raw))
	for _, p := range raw {
		out = append(out, models.PublicPackage{
			ID:          p.ID,
			Title:       p.Title,
			Description: p.Description,
			FromPrice:   p.FromPrice,
			Inclusions:  p.Inclusions,
			ImageURL:    p.ImageURL,
			IsFeatured:  p.IsFeatured,
			SortOrder:   p.SortOrder,
		})
	}
	return out
}

func (h *PublicProfileHandler) projectFaq(ctx context.Context, userID uuid.UUID) []models.PublicFaqItem {
	if h.portfolioRepo == nil {
		return nil
	}
	raw, err := h.portfolioRepo.ListFaqByUserID(ctx, userID)
	if err != nil || len(raw) == 0 {
		return nil
	}
	out := make([]models.PublicFaqItem, 0, len(raw))
	for _, f := range raw {
		out = append(out, models.PublicFaqItem{
			ID:        f.ID,
			Question:  f.Question,
			Answer:    f.Answer,
			SortOrder: f.SortOrder,
		})
	}
	return out
}

// buildPublicPolicies projects the organizer's default commercial terms.
func buildPublicPolicies(user *models.User) *models.PublicPolicies {
	p := &models.PublicPolicies{DepositPercent: user.DefaultDepositPercent}
	if user.DefaultCancellationDays != nil {
		days := int(*user.DefaultCancellationDays)
		p.CancellationDays = &days
	}
	p.RefundPercent = user.DefaultRefundPercent
	if p.DepositPercent == nil && p.CancellationDays == nil && p.RefundPercent == nil {
		return nil
	}
	return p
}

func (h *PublicProfileHandler) projectServices(ctx context.Context, userID uuid.UUID, profile *models.OrganizerPublicProfile) []models.PublicProfileService {
	products, err := h.productRepo.ListPublicProfileServices(ctx, userID)
	if err != nil {
		return []models.PublicProfileService{}
	}
	out := make([]models.PublicProfileService, 0, len(products))
	for _, p := range products {
		svc := models.PublicProfileService{
			ID: p.ID, Name: p.Name, Category: p.Category, ImageURL: p.ImageURL,
			IsFeatured: p.IsFeatured,
		}
		if profile.ShowPrices {
			bp := p.BasePrice
			svc.BasePrice = &bp
		}
		out = append(out, svc)
	}
	return out
}

// projectReviews returns the public reviews list plus the average rating and
// count derived from the same fetch (no extra DB round-trip).
func (h *PublicProfileHandler) projectReviews(ctx context.Context, slug *string) ([]models.PublicReview, float64, int) {
	emptyAvg, emptyCount := 0.0, 0
	if slug == nil || *slug == "" {
		return []models.PublicReview{}, emptyAvg, emptyCount
	}
	raw, err := h.reviewRepo.ListPublicByOrganizerSlug(ctx, *slug)
	if err != nil {
		return []models.PublicReview{}, emptyAvg, emptyCount
	}
	out := make([]models.PublicReview, 0, len(raw))
	var sum int
	for _, er := range raw {
		out = append(out, toPublicReview(er))
		sum += er.Rating
	}
	count := len(raw)
	avg := emptyAvg
	if count > 0 {
		avg = float64(sum) / float64(count)
	}
	return out, avg, count
}

func (h *PublicProfileHandler) projectPortfolio(ctx context.Context, userID uuid.UUID) []models.PublicPortfolioItem {
	if h.portfolioRepo == nil {
		return nil
	}
	raw, err := h.portfolioRepo.ListPortfolioByUserID(ctx, userID)
	if err != nil || len(raw) == 0 {
		return nil
	}
	if len(raw) > 6 {
		raw = raw[:6]
	}
	out := make([]models.PublicPortfolioItem, 0, len(raw))
	for _, it := range raw {
		out = append(out, models.PublicPortfolioItem{
			ID:           it.ID,
			Title:        it.Title,
			EventDate:    it.EventDate,
			PhotoURL:     it.PhotoURL,
			ThumbnailURL: it.ThumbnailURL,
			SortOrder:    it.SortOrder,
		})
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
