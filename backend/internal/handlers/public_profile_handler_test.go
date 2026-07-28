package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// --- fakes ---

type fakeUserRepo struct {
	user *models.User
	err  error
}

func (f *fakeUserRepo) GetByPublicSlug(ctx context.Context, slug string) (*models.User, error) {
	return f.user, f.err
}

type fakeProfileRepo struct {
	profile *models.OrganizerPublicProfile
	err     error
}

func (f *fakeProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	return f.profile, f.err
}

type fakeProductRepo struct {
	products []models.Product
	err      error
}

func (f *fakeProductRepo) ListPublicProfileServices(ctx context.Context, userID uuid.UUID) ([]models.Product, error) {
	return f.products, f.err
}

type fakeReviewRepo struct {
	reviews []*models.EventReview
	err     error
}

func (f *fakeReviewRepo) ListPublicByOrganizerSlug(ctx context.Context, slug string) ([]*models.EventReview, error) {
	return f.reviews, f.err
}

// newHandler wires a PublicProfileHandler with fakes.
func newHandler(u *fakeUserRepo, p *fakeProfileRepo, pr *fakeProductRepo, rv *fakeReviewRepo) *PublicProfileHandler {
	return &PublicProfileHandler{
		userRepo: u, profileRepo: p, productRepo: pr, reviewRepo: rv,
	}
}

func strPtrS(s string) *string { return &s }

// --- tests ---

func TestGetPublicProfile_404_UnknownSlug(t *testing.T) {
	h := newHandler(
		&fakeUserRepo{err: pgx.ErrNoRows},
		&fakeProfileRepo{}, &fakeProductRepo{}, &fakeReviewRepo{},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/ghost", nil)
	req.SetPathValue("slug", "ghost")
	rr := httptest.NewRecorder()

	h.GetPublicProfile(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestGetPublicProfile_404_ProfileMissing(t *testing.T) {
	uid := uuid.New()
	slug := "alice"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro", AccountStatus: "active"}},
		&fakeProfileRepo{err: repository.ErrPublicProfileNotFound},
		&fakeProductRepo{}, &fakeReviewRepo{},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/alice", nil)
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	h.GetPublicProfile(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404 (missing profile)", rr.Code)
	}
}

func TestGetPublicProfile_500_ProfileDBError(t *testing.T) {
	uid := uuid.New()
	slug := "alice"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro", AccountStatus: "active"}},
		&fakeProfileRepo{err: errors.New("connection refused")},
		&fakeProductRepo{}, &fakeReviewRepo{},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/alice", nil)
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	h.GetPublicProfile(rr, req)
	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500 (DB outage must not mask as 404)", rr.Code)
	}
}

func TestGetPublicProfile_404_BlockedAccount(t *testing.T) {
	uid := uuid.New()
	slug := "alice"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro", AccountStatus: "blocked"}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{UserID: uid, IsEnabled: true}},
		&fakeProductRepo{}, &fakeReviewRepo{},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/alice", nil)
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	h.GetPublicProfile(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404 for blocked account", rr.Code)
	}
}

func TestGetPublicProfile_404_Disabled(t *testing.T) {
	uid := uuid.New()
	slug := "alice"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro"}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{UserID: uid, IsEnabled: false}},
		&fakeProductRepo{}, &fakeReviewRepo{},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/alice", nil)
	req.SetPathValue("slug", "alice")
	rr := httptest.NewRecorder()

	h.GetPublicProfile(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404 (disabled)", rr.Code)
	}
}

func TestGetPublicProfile_Free_OmitsProSectionsAndCapsServices(t *testing.T) {
	uid := uuid.New()
	slug := "free-organizer"
	biz := "Free Catering"
	contactType := "email"
	// 5 public services; Free must cap to 3.
	prods := []models.Product{
		{ID: uuid.New(), Name: "S1", Category: "main", BasePrice: 10},
		{ID: uuid.New(), Name: "S2", Category: "main", BasePrice: 20},
		{ID: uuid.New(), Name: "S3", Category: "dessert", BasePrice: 30},
		{ID: uuid.New(), Name: "S4", Category: "main", BasePrice: 40},
		{ID: uuid.New(), Name: "S5", Category: "main", BasePrice: 50},
	}
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "basic", BusinessName: &biz}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{
			UserID: uid, IsEnabled: true,
			ShowServices: true, ShowPrices: false,
			ShowContact: true, ContactType: &contactType, ContactValue: strPtrS("a@b.com"),
			City: strPtrS("Lisbon"),
			// Pro toggles set true on the row, but Free must ignore them.
			ShowReviews: true, ShowPortfolio: true,
			Socials: map[string]string{"instagram": "@free"},
		}},
		&fakeProductRepo{products: prods},
		&fakeReviewRepo{reviews: []*models.EventReview{{Rating: 5, ClientName: strPtrS("Ana")}}},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/free-organizer", nil)
	req.SetPathValue("slug", slug)
	rr := httptest.NewRecorder()
	h.GetPublicProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	var resp struct {
		Data models.PublicOrganizerProfile `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v; body=%s", err, rr.Body.String())
	}
	dto := resp.Data

	// Basic fields.
	if dto.Slug != slug {
		t.Errorf("Slug = %q, want %q", dto.Slug, slug)
	}
	if dto.BusinessName != biz {
		t.Errorf("BusinessName = %q, want %q", dto.BusinessName, biz)
	}
	if dto.Location == nil || dto.Location.City == nil || *dto.Location.City != "Lisbon" {
		t.Errorf("Location = %+v, want city=Lisbon", dto.Location)
	}
	if dto.Contact == nil || dto.Contact.Type != "email" || dto.Contact.Value != "a@b.com" {
		t.Errorf("Contact = %+v, want email/a@b.com", dto.Contact)
	}

	// Services capped to 3.
	if len(dto.Services) != 3 {
		t.Errorf("Services len = %d, want 3 (Free cap)", len(dto.Services))
	}
	// No base_price when show_prices=false.
	for _, s := range dto.Services {
		if s.BasePrice != nil {
			t.Errorf("service %q BasePrice = %v, want nil (show_prices=false)", s.Name, s.BasePrice)
		}
	}

	// Pro sections omitted on Free.
	if dto.Reviews != nil {
		t.Errorf("Reviews = %+v, want nil (Free omits)", dto.Reviews)
	}
	if dto.Portfolio != nil {
		t.Errorf("Portfolio = %+v, want nil (Free omits)", dto.Portfolio)
	}
	if dto.Socials != nil {
		t.Errorf("Socials = %+v, want nil (Free omits)", dto.Socials)
	}
}

func TestGetPublicProfile_Pro_FullProjectionWithPricesAndReviews(t *testing.T) {
	uid := uuid.New()
	slug := "pro-organizer"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro"}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{
			UserID: uid, IsEnabled: true,
			ShowServices: true, ShowPrices: true,
			ShowReviews: true, ShowPortfolio: true, ShowContact: false,
			Socials: map[string]string{"site": "https://x.test"},
		}},
		&fakeProductRepo{products: []models.Product{{ID: uuid.New(), Name: "Premium", Category: "main", BasePrice: 99}}},
		&fakeReviewRepo{reviews: []*models.EventReview{{Rating: 5, ClientName: strPtrS("Bob")}}},
	)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/pro-organizer", nil)
	req.SetPathValue("slug", slug)
	rr := httptest.NewRecorder()
	h.GetPublicProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var resp struct {
		Data models.PublicOrganizerProfile `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	dto := resp.Data

	// Prices included.
	if len(dto.Services) != 1 || dto.Services[0].BasePrice == nil || *dto.Services[0].BasePrice != 99 {
		t.Errorf("Services = %+v, want one with BasePrice=99", dto.Services)
	}
	// Reviews sanitized.
	if len(dto.Reviews) != 1 || dto.Reviews[0].DisplayName != "B." {
		t.Errorf("Reviews = %+v, want one with DisplayName=B.", dto.Reviews)
	}
	// Socials present.
	if dto.Socials == nil || dto.Socials["site"] != "https://x.test" {
		t.Errorf("Socials = %+v, want site", dto.Socials)
	}
	// Contact omitted (toggle off).
	if dto.Contact != nil {
		t.Errorf("Contact = %+v, want nil (toggle off)", dto.Contact)
	}
}

func TestGetPublicProfile_Pro_HideReviewsWhenToggleOff(t *testing.T) {
	uid := uuid.New()
	slug := "pro-no-reviews"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro"}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{
			UserID: uid, IsEnabled: true,
			ShowServices: false, ShowReviews: false,
		}},
		&fakeProductRepo{}, &fakeReviewRepo{reviews: []*models.EventReview{{Rating: 5}}},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/pro-no-reviews", nil)
	req.SetPathValue("slug", slug)
	rr := httptest.NewRecorder()
	h.GetPublicProfile(rr, req)

	var resp struct {
		Data models.PublicOrganizerProfile `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if resp.Data.Reviews != nil {
		t.Errorf("Reviews should be nil when show_reviews=false; got %+v", resp.Data.Reviews)
	}
}

func TestGetPublicProfile_BodyHasNoPII(t *testing.T) {
	uid := uuid.New()
	slug := "pii-check"
	h := newHandler(
		&fakeUserRepo{user: &models.User{ID: uid, PublicSlug: &slug, Plan: "pro", BusinessName: strPtrS("Biz")}},
		&fakeProfileRepo{profile: &models.OrganizerPublicProfile{UserID: uid, IsEnabled: true, ShowReviews: true}},
		&fakeProductRepo{},
		&fakeReviewRepo{reviews: []*models.EventReview{{
			ID: uid, EventID: uid, UserID: uid, ClientID: uid,
			Rating: 4, ClientName: strPtrS("Secret Person"),
		}}},
	)
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers/pii-check", nil)
	req.SetPathValue("slug", slug)
	rr := httptest.NewRecorder()
	h.GetPublicProfile(rr, req)

	body := rr.Body.String()
	for _, forbidden := range []string{"client_id", "user_id", "event_id", "Secret Person", "password"} {
		if strings.Contains(body, forbidden) {
			t.Errorf("body must not contain %q; got %s", forbidden, body)
		}
	}
}
