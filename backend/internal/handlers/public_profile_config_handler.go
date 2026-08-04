package handlers

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// publicSlugRegex enforces kebab-case: lowercase letters/digits, single hyphens
// between groups, no leading/trailing hyphens. Length bounds [3,140] are checked
// separately because regexp length checks are awkward.
var publicSlugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

const (
	publicSlugMinLen = 3
	publicSlugMaxLen = 140
)

// validatePublicSlug returns an error when s is not a valid public slug.
// Empty string is allowed (means "do not change"); callers handle that case.
func validatePublicSlug(s string) error {
	if s == "" {
		return errors.New("slug is required")
	}
	if len(s) < publicSlugMinLen || len(s) > publicSlugMaxLen {
		return errors.New("slug must be between 3 and 140 characters")
	}
	if !publicSlugRegex.MatchString(s) {
		return errors.New("slug must be lowercase letters, digits, and single hyphens")
	}
	return nil
}

// PublicProfileConfigHandler serves the authenticated public-profile config
// endpoints (Settings). Free plans may not enable Pro-only sections
// (show_reviews / show_portfolio / full socials); attempting to do so yields
// a 403 plan_limit_exceeded.
type PublicProfileConfigHandler struct {
	userRepo    configUserRepo
	profileRepo configProfileRepo
	slugUpdater configSlugUpdater
	geocoder    geocoderPort
	frontendURL string
	// defaultProfile builds the response shape returned when the organizer has
	// no profile row yet. Overridable for tests; production uses the package
	// default which mirrors the DB defaults.
	defaultProfile func(userID uuid.UUID) *models.OrganizerPublicProfile
}

// geocoderPort is satisfied by *services.GeocodingService. Interface for testability.
type geocoderPort interface {
	Geocode(ctx context.Context, city, country string) (lat, lng float64, err error)
}

// Local interface slices of the concrete repos so the handler is unit-testable
// with fakes.
type configUserRepo interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
}
type configProfileRepo interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error)
	Upsert(ctx context.Context, p *models.OrganizerPublicProfile) (*models.OrganizerPublicProfile, error)
}
type configSlugUpdater interface {
	UpdatePublicSlug(ctx context.Context, userID uuid.UUID, slug string) error
}

// NewPublicProfileConfigHandler assembles the handler with its deps.
func NewPublicProfileConfigHandler(
	userRepo *repository.UserRepo,
	profileRepo *repository.PublicProfileRepo,
	geocoder geocoderPort,
	frontendURL string,
) *PublicProfileConfigHandler {
	return &PublicProfileConfigHandler{
		userRepo:       userRepo,
		profileRepo:    profileRepo,
		slugUpdater:    userRepo, // *UserRepo implements configSlugUpdater
		geocoder:       geocoder,
		frontendURL:    strings.TrimSuffix(frontendURL, "/"),
		defaultProfile: defaultPublicProfile,
	}
}

// defaultPublicProfile returns a config mirroring the DB defaults for an
// organizer who has not yet created a profile row.
func defaultPublicProfile(userID uuid.UUID) *models.OrganizerPublicProfile {
	return &models.OrganizerPublicProfile{
		UserID:        userID,
		IsEnabled:     false,
		ShowPrices:    false,
		ShowServices:  true,
		ShowReviews:   true,
		ShowPortfolio: true,
		ShowContact:   true,
	}
}

// upsertRequest is the PUT body shape. All fields optional except where noted;
// omitted booleans default to the DB/profile defaults on first save.
type upsertRequest struct {
	IsEnabled     *bool             `json:"is_enabled"`
	PublicSlug    *string           `json:"public_slug"`
	Headline      *string           `json:"headline"`
	ContactType   *string           `json:"contact_type"`
	ContactValue  *string           `json:"contact_value"`
	City          *string           `json:"city"`
	Region        *string           `json:"region"`
	Country       *string           `json:"country"`
	ShowPrices    *bool             `json:"show_prices"`
	ShowServices  *bool             `json:"show_services"`
	ShowReviews   *bool             `json:"show_reviews"`
	ShowPortfolio *bool             `json:"show_portfolio"`
	ShowContact   *bool             `json:"show_contact"`
	ShowPackages  *bool             `json:"show_packages"`
	ShowFaq       *bool             `json:"show_faq"`
	ShowPolicies  *bool             `json:"show_policies"`
	Socials       map[string]string `json:"socials"`
	About         *string           `json:"about"`
	ServiceAreas  []string          `json:"service_areas"`
	MinGuests     *int              `json:"min_guests"`
	MaxGuests     *int              `json:"max_guests"`
	EventTypes      []string          `json:"event_types"`
	ResponseTime    *string           `json:"response_time"`
	Languages       []string          `json:"languages"`
	ServiceRadiusKm *float64          `json:"service_radius_km"` // null/omit keep; 0 clears (unlimited)
}

// GetMyPublicProfile handles GET /api/users/me/public-profile.
// Returns the stored config, or DB defaults when the organizer has no row yet.
func (h *PublicProfileConfigHandler) GetMyPublicProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	profile, err := h.profileRepo.GetByUserID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, repository.ErrPublicProfileNotFound) {
			profile = h.defaultProfile(userID)
		} else {
			writeError(w, http.StatusInternalServerError, "Failed to load public profile")
			return
		}
	}
	profile.PublicSlug = h.currentSlug(r.Context(), userID, profile.PublicSlug)
	writeJSON(w, http.StatusOK, map[string]any{"data": profile})
}

// currentSlug returns the slug to surface on the GET response. Prefers the
// denormalized profile.PublicSlug, then the user's actual public_slug.
func (h *PublicProfileConfigHandler) currentSlug(ctx context.Context, userID uuid.UUID, profileSlug *string) *string {
	if profileSlug != nil && *profileSlug != "" {
		return profileSlug
	}
	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil
	}
	return user.PublicSlug
}

// UpsertMyPublicProfile handles PUT /api/users/me/public-profile.
func (h *PublicProfileConfigHandler) UpsertMyPublicProfile(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req upsertRequest
	if err := decodeJSON(w, r, &req); err != nil {
		if isRequestBodyTooLarge(err) {
			return
		}
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate slug if provided.
	if req.PublicSlug != nil {
		if err := validatePublicSlug(*req.PublicSlug); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "Failed to load account")
		return
	}

	fullPlan := FeatureAvailable(user.Plan, "public_profile_full")

	// Free plan cannot enable Pro-only sections.
	if !fullPlan {
		if (req.ShowReviews != nil && *req.ShowReviews) || (req.ShowPortfolio != nil && *req.ShowPortfolio) || len(req.Socials) > 0 {
			writePlanLimitError(w, r, "public_profile_full", 0, 0)
			return
		}
	}

	if req.ContactType != nil && *req.ContactType != "" {
		if err := validateContactType(*req.ContactType); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	// Require a public slug when enabling the profile (new or existing).
	effectiveSlug := ""
	if req.PublicSlug != nil {
		effectiveSlug = strings.TrimSpace(*req.PublicSlug)
	} else if user.PublicSlug != nil {
		effectiveSlug = *user.PublicSlug
	}
	if req.IsEnabled != nil && *req.IsEnabled && effectiveSlug == "" {
		writeError(w, http.StatusBadRequest, "public_slug is required when enabling the profile")
		return
	}

	// Build the profile to upsert. Merge onto existing row so omitted fields
	// keep their current values instead of being zeroed.
	existing, err := h.profileRepo.GetByUserID(r.Context(), userID)
	if err != nil && !errors.Is(err, repository.ErrPublicProfileNotFound) {
		writeError(w, http.StatusInternalServerError, "Failed to load public profile")
		return
	}
	if errors.Is(err, repository.ErrPublicProfileNotFound) {
		existing = nil
	}
	merged := mergeProfile(existing, h.defaultProfile(userID), &req, userID)

	// Free: force Pro-only section flags off even when request omits them
	// (defaults would otherwise leave show_reviews/show_portfolio true).
	if !fullPlan {
		merged.ShowReviews = false
		merged.ShowPortfolio = false
		merged.Socials = map[string]string{}
	}

	// Slug rename BEFORE profile upsert so a 409 conflict never leaves a
	// partial config write from this request.
	finalSlug := user.PublicSlug
	if req.PublicSlug != nil && (user.PublicSlug == nil || *user.PublicSlug != *req.PublicSlug) {
		if err := h.slugUpdater.UpdatePublicSlug(r.Context(), userID, *req.PublicSlug); err != nil {
			if errors.Is(err, repository.ErrPublicSlugTaken) {
				writeError(w, http.StatusConflict, "Public slug already taken")
				return
			}
			writeError(w, http.StatusInternalServerError, "Failed to save public slug")
			return
		}
		finalSlug = req.PublicSlug
	}

	// Geo-coding hook (#1127): if the city/country changed (or coords are empty
	// and a city is now present), geocode via Nominatim. Failures are graceful
	// — lat/lng stay nil and the save proceeds (the organizer still appears by
	// city text in the directory).
	if h.geocoder != nil && locationChanged(existing, merged) {
		city := derefStr(merged.City)
		country := derefStr(merged.Country)
		if city != "" || country != "" {
			lat, lng, _ := h.geocoder.Geocode(r.Context(), city, country)
			if lat != 0 || lng != 0 {
				merged.Latitude = &lat
				merged.Longitude = &lng
			}
		}
	}

	stored, err := h.profileRepo.Upsert(r.Context(), merged)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save public profile")
		return
	}
	stored.PublicSlug = finalSlug

	writeJSON(w, http.StatusOK, map[string]any{"data": stored})
}

// validateContactType enforces the DB CHECK values so callers get 400 instead of 500.
func validateContactType(v string) error {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "phone", "whatsapp", "email", "url":
		return nil
	default:
		return errors.New("contact_type must be one of: phone, whatsapp, email, url")
	}
}

// mergeProfile combines the existing row, the request, and defaults into the
// shape to persist. Rule: request wins; for unset booleans on a fresh row, the
// default (true for show_* sections) applies; for unset booleans on an existing
// row, the existing value is preserved.
func mergeProfile(existing *models.OrganizerPublicProfile, def *models.OrganizerPublicProfile, req *upsertRequest, userID uuid.UUID) *models.OrganizerPublicProfile {
	base := def
	if existing != nil {
		base = existing
	}
	p := *base
	p.UserID = userID

	if req.IsEnabled != nil {
		p.IsEnabled = *req.IsEnabled
	}
	if req.Headline != nil {
		p.Headline = req.Headline
	}
	if req.ContactType != nil {
		p.ContactType = req.ContactType
	}
	if req.ContactValue != nil {
		p.ContactValue = req.ContactValue
	}
	if req.City != nil {
		p.City = req.City
	}
	if req.Region != nil {
		p.Region = req.Region
	}
	if req.Country != nil {
		p.Country = req.Country
	}
	if req.ShowPrices != nil {
		p.ShowPrices = *req.ShowPrices
	}
	if req.ShowServices != nil {
		p.ShowServices = *req.ShowServices
	}
	if req.ShowReviews != nil {
		p.ShowReviews = *req.ShowReviews
	}
	if req.ShowPortfolio != nil {
		p.ShowPortfolio = *req.ShowPortfolio
	}
	if req.ShowContact != nil {
		p.ShowContact = *req.ShowContact
	}
	if req.ShowPackages != nil {
		p.ShowPackages = *req.ShowPackages
	}
	if req.ShowFaq != nil {
		p.ShowFaq = *req.ShowFaq
	}
	if req.ShowPolicies != nil {
		p.ShowPolicies = *req.ShowPolicies
	}
	if req.Socials != nil {
		p.Socials = req.Socials
	}
	if req.About != nil {
		p.About = req.About
	}
	if req.ServiceAreas != nil {
		p.ServiceAreas = req.ServiceAreas
	}
	if req.MinGuests != nil {
		p.MinGuests = req.MinGuests
	}
	if req.MaxGuests != nil {
		p.MaxGuests = req.MaxGuests
	}
	if req.EventTypes != nil {
		p.EventTypes = req.EventTypes
	}
	if req.ResponseTime != nil {
		p.ResponseTime = req.ResponseTime
	}
	if req.Languages != nil {
		p.Languages = req.Languages
	}
	// service_radius_km: explicit 0 means "no limit" (store NULL); positive sets km.
	if req.ServiceRadiusKm != nil {
		if *req.ServiceRadiusKm <= 0 {
			p.ServiceRadiusKm = nil
		} else {
			p.ServiceRadiusKm = req.ServiceRadiusKm
		}
	}
	return &p
}

// locationChanged reports whether the city or country differs between the
// existing profile and the merged one, OR if coords are still empty and a
// city is now present. Used to decide whether to re-geocode (#1127 D7).
func locationChanged(existing, merged *models.OrganizerPublicProfile) bool {
	if existing == nil {
		// Fresh profile — geocode if any location is present.
		return merged != nil && (derefStr(merged.City) != "" || derefStr(merged.Country) != "")
	}
	if merged == nil {
		return false
	}
	// Re-geocode if city/country changed, OR if coords are empty but city is set.
	cityChanged := !strPtrEqual(existing.City, merged.City)
	countryChanged := !strPtrEqual(existing.Country, merged.Country)
	coordsEmpty := merged.Latitude == nil || merged.Longitude == nil
	hasCity := derefStr(merged.City) != ""
	return cityChanged || countryChanged || (coordsEmpty && hasCity)
}

func strPtrEqual(a, b *string) bool {
	if a == nil || *a == "" {
		return b == nil || *b == ""
	}
	if b == nil {
		return false
	}
	return *a == *b
}
