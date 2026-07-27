package handlers

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// Stubs implementing the local interfaces used by listPublicReviews.

type reviewListerStub struct {
	reviews []*models.EventReview
	err     error
	called  bool
}

func (s *reviewListerStub) ListPublicByOrganizerSlug(ctx context.Context, slug string) ([]*models.EventReview, error) {
	s.called = true
	return s.reviews, s.err
}

type reviewUserResolverStub struct {
	user *models.User
	err  error
}

func (s *reviewUserResolverStub) GetByPublicSlug(ctx context.Context, slug string) (*models.User, error) {
	return s.user, s.err
}

type reviewProfileResolverStub struct {
	profile *models.OrganizerPublicProfile
	err     error
}

func (s *reviewProfileResolverStub) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	return s.profile, s.err
}

func TestListPublicReviews_Free_ReturnsEmptyWithoutCallingRepo(t *testing.T) {
	reviews := &reviewListerStub{reviews: []*models.EventReview{{Rating: 5, ClientName: strPtrS("Ana")}}}
	deps := publicReviewDeps{
		user:    &reviewUserResolverStub{user: &models.User{ID: uuid.New(), Plan: "basic"}},
		profile: &reviewProfileResolverStub{profile: &models.OrganizerPublicProfile{IsEnabled: true, ShowReviews: true}},
		reviews: reviews,
	}
	rr := httptest.NewRecorder()
	listPublicReviews(rr, httptest.NewRequest("GET", "/", nil), "free", deps)

	if reviews.called {
		t.Errorf("repo must NOT be called on Free; it was")
	}
	var resp struct {
		Data []models.PublicReview `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Data) != 0 {
		t.Errorf("Free reviews = %d items, want 0", len(resp.Data))
	}
}

func TestListPublicReviews_Pro_SanitizesPII(t *testing.T) {
	uid := uuid.New()
	deps := publicReviewDeps{
		user: &reviewUserResolverStub{user: &models.User{ID: uid, Plan: "pro"}},
		profile: &reviewProfileResolverStub{profile: &models.OrganizerPublicProfile{
			UserID: uid, IsEnabled: true, ShowReviews: true,
		}},
		reviews: &reviewListerStub{reviews: []*models.EventReview{{
			ID: uuid.New(), EventID: uuid.New(), UserID: uid, ClientID: uuid.New(),
			Rating: 5, ClientName: strPtrS("Secret Client"),
		}}},
	}
	rr := httptest.NewRecorder()
	listPublicReviews(rr, httptest.NewRequest("GET", "/", nil), "pro", deps)

	body := rr.Body.String()
	for _, forbidden := range []string{"client_id", "user_id", "event_id", "Secret Client"} {
		if strings.Contains(body, forbidden) {
			t.Errorf("body must not contain %q; got %s", forbidden, body)
		}
	}
	var resp struct {
		Data []models.PublicReview `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if len(resp.Data) != 1 || resp.Data[0].DisplayName != "S." {
		t.Errorf("reviews = %+v, want one with DisplayName=S.", resp.Data)
	}
}

func TestListPublicReviews_ToggleOff_ReturnsEmptyWithoutCallingRepo(t *testing.T) {
	uid := uuid.New()
	reviews := &reviewListerStub{reviews: []*models.EventReview{{Rating: 5}}}
	deps := publicReviewDeps{
		user:    &reviewUserResolverStub{user: &models.User{ID: uid, Plan: "pro"}},
		profile: &reviewProfileResolverStub{profile: &models.OrganizerPublicProfile{UserID: uid, ShowReviews: false}},
		reviews: reviews,
	}
	rr := httptest.NewRecorder()
	listPublicReviews(rr, httptest.NewRequest("GET", "/", nil), "x", deps)

	if reviews.called {
		t.Errorf("repo must NOT be called when show_reviews=false")
	}
	var resp struct {
		Data []models.PublicReview `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if len(resp.Data) != 0 {
		t.Errorf("toggle-off reviews = %d, want 0", len(resp.Data))
	}
}

func TestListPublicReviews_UnknownSlug_404(t *testing.T) {
	deps := publicReviewDeps{
		user:    &reviewUserResolverStub{err: pgx.ErrNoRows},
		profile: &reviewProfileResolverStub{},
		reviews: &reviewListerStub{},
	}
	rr := httptest.NewRecorder()
	listPublicReviews(rr, httptest.NewRequest("GET", "/", nil), "ghost", deps)

	if rr.Code != 404 && rr.Code != 200 {
		t.Fatalf("status = %d, want 404 or 200-empty", rr.Code)
	}
	// Unknown slug must not surface reviews.
	var resp struct {
		Data []models.PublicReview `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if len(resp.Data) != 0 {
		t.Errorf("unknown slug reviews = %d, want 0", len(resp.Data))
	}
}
