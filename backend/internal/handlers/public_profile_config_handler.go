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
	frontendURL string
	// defaultProfile builds the response shape returned when the organizer has
	// no profile row yet. Overridable for tests; production uses the package
	// default which mirrors the DB defaults.
	defaultProfile func(userID uuid.UUID) *models.OrganizerPublicProfile
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
	frontendURL string,
) *PublicProfileConfigHandler {
	return &PublicProfileConfigHandler{
		userRepo:       userRepo,
		profileRepo:    profileRepo,
		slugUpdater:    userRepo, // *UserRepo implements configSlugUpdater
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
	IsEnabled     *bool              `json:"is_enabled"`
	PublicSlug    *string            `json:"public_slug"`
	Headline      *string            `json:"headline"`
	ContactType   *string            `json:"contact_type"`
	ContactValue  *string            `json:"contact_value"`
	City          *string            `json:"city"`
	Region        *string            `json:"region"`
	Country       *string            `json:"country"`
	ShowPrices    *bool              `json:"show_prices"`
	ShowServices  *bool              `json:"show_services"`
	ShowReviews   *bool              `json:"show_reviews"`
	ShowPortfolio *bool              `json:"show_portfolio"`
	ShowContact   *bool              `json:"show_contact"`
	Socials       map[string]string  `json:"socials"`
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
	if req.Socials != nil {
		p.Socials = req.Socials
	}
	return &p
}
