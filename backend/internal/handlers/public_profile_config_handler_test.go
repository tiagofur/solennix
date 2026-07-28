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
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// --- fakes ---

type cfgUserRepo struct {
	user *models.User
	err  error
}

func (f *cfgUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return f.user, f.err
}

type cfgProfileRepo struct {
	existing *models.OrganizerPublicProfile // returned by GetByUserID
	getErr   error
	upserted *models.OrganizerPublicProfile // returned by Upsert (the stored copy)
	upsertIn *models.OrganizerPublicProfile // captured input for assertions
	upsertRr int                            // how many times Upsert was called
}

func (f *cfgProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.OrganizerPublicProfile, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	if f.existing == nil {
		return nil, repository.ErrPublicProfileNotFound
	}
	cp := *f.existing
	return &cp, nil
}

func (f *cfgProfileRepo) Upsert(ctx context.Context, p *models.OrganizerPublicProfile) (*models.OrganizerPublicProfile, error) {
	f.upsertRr++
	cp := *p
	f.upsertIn = &cp
	if f.upserted != nil {
		return f.upserted, nil
	}
	return &cp, nil
}

// slugRenamer captures whether the slug rename was attempted.
type slugRenamer struct {
	called  bool
	userID  uuid.UUID
	newSlug string
	err     error
}

func (s *slugRenamer) UpdatePublicSlug(ctx context.Context, userID uuid.UUID, slug string) error {
	s.called = true
	s.userID = userID
	s.newSlug = slug
	return s.err
}

func newConfigHandler(u *cfgUserRepo, p *cfgProfileRepo, s *slugRenamer, plan string) (*PublicProfileConfigHandler, *models.User) {
	if u.user == nil {
		u.user = &models.User{ID: uuid.New(), Plan: plan}
	}
	return &PublicProfileConfigHandler{
		userRepo:        u,
		profileRepo:     p,
		slugUpdater:     s,
		frontendURL:     "https://app.test",
		defaultProfile:  defaultPublicProfile,
	}, u.user
}

// putWithUser builds a PUT request whose context carries the user id (simulating
// the auth middleware) and the given JSON body.
func putWithUser(t *testing.T, userID uuid.UUID, body string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodPut, "/api/users/me/public-profile", strings.NewReader(body))
	return req.WithContext(middleware.WithUserID(req.Context(), userID))
}

func getWithUser(t *testing.T, userID uuid.UUID) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/users/me/public-profile", nil)
	return req.WithContext(middleware.WithUserID(req.Context(), userID))
}

// --- slug validator tests ---

func TestValidatePublicSlug(t *testing.T) {
	valid := []string{"alice", "abc", "alice-123", "a-b-c", strings.Repeat("a", 140)}
	invalid := []string{
		"", "ab", strings.Repeat("a", 141), // length bounds
		"Alice", "ALICE",         // uppercase
		"-x", "x-", "--", "a--b", // leading/trailing/double hyphen
		"a b", "a.b", "a_b", // whitespace, punctuation
	}
	for _, s := range valid {
		if err := validatePublicSlug(s); err != nil {
			t.Errorf("validatePublicSlug(%q) = %v, want nil", s, err)
		}
	}
	for _, s := range invalid {
		if err := validatePublicSlug(s); err == nil {
			t.Errorf("validatePublicSlug(%q) = nil, want error", s)
		}
	}
}

// --- GET handler ---

func TestGetMyPublicProfile_NoRow_ReturnsDefaults(t *testing.T) {
	h, user := newConfigHandler(&cfgUserRepo{}, &cfgProfileRepo{}, &slugRenamer{}, "pro")
	rr := httptest.NewRecorder()
	h.GetMyPublicProfile(rr, getWithUser(t, user.ID))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	var resp struct {
		Data models.OrganizerPublicProfile `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if resp.Data.IsEnabled {
		t.Errorf("default IsEnabled = true, want false")
	}
	if !resp.Data.ShowServices || !resp.Data.ShowReviews || !resp.Data.ShowPortfolio || !resp.Data.ShowContact {
		t.Errorf("default show_* toggles not all true")
	}
	if resp.Data.ShowPrices {
		t.Errorf("default ShowPrices = true, want false")
	}
}

func TestGetMyPublicProfile_ExistingRow(t *testing.T) {
	headline := "My headline"
	existing := &models.OrganizerPublicProfile{IsEnabled: true, Headline: &headline, ShowReviews: false}
	h, user := newConfigHandler(&cfgUserRepo{}, &cfgProfileRepo{existing: existing}, &slugRenamer{}, "pro")
	rr := httptest.NewRecorder()
	h.GetMyPublicProfile(rr, getWithUser(t, user.ID))

	var resp struct {
		Data models.OrganizerPublicProfile `json:"data"`
	}
	_ = json.Unmarshal(rr.Body.Bytes(), &resp)
	if !resp.Data.IsEnabled {
		t.Errorf("IsEnabled = false, want true")
	}
	if resp.Data.ShowReviews {
		t.Errorf("ShowReviews = true, want false (persisted value)")
	}
}

// --- PUT handler ---

func TestUpsertMyPublicProfile_FirstSave_Free(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "basic")
	// Free provides a slug for the first time.
	body := `{"is_enabled":true,"public_slug":"alice","headline":"Hi","show_prices":true,"show_services":true,"show_reviews":false,"show_portfolio":false,"show_contact":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertRr != 1 {
		t.Errorf("Upsert called %d times, want 1", p.upsertRr)
	}
	if !s.called || s.newSlug != "alice" {
		t.Errorf("slug rename = called=%v slug=%q, want called=true slug=alice", s.called, s.newSlug)
	}
	if p.upsertIn == nil || !p.upsertIn.IsEnabled || p.upsertIn.Headline == nil || *p.upsertIn.Headline != "Hi" {
		t.Errorf("upsert input = %+v", p.upsertIn)
	}
}

func TestUpsertMyPublicProfile_Free_RejectsProToggles(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "basic")
	// Free tries to enable show_reviews -> must 403 and NOT call upsert.
	body := `{"is_enabled":true,"public_slug":"alice","show_reviews":true,"show_portfolio":false,"show_services":true,"show_contact":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertRr != 0 {
		t.Errorf("Upsert must NOT be called on Free pro-toggle attempt; called %d", p.upsertRr)
	}
	if s.called {
		t.Errorf("slug rename must NOT run on rejected request")
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Errorf("body must contain plan_limit_exceeded; got %s", rr.Body.String())
	}
}

func TestUpsertMyPublicProfile_InvalidSlug_400(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "pro")
	body := `{"is_enabled":true,"public_slug":"Invalid Slug"}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
	if p.upsertRr != 0 {
		t.Errorf("Upsert must NOT be called on invalid slug")
	}
}

func TestUpsertMyPublicProfile_SlugConflict_409(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{err: repository.ErrPublicSlugTaken}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "pro")
	body := `{"is_enabled":true,"public_slug":"taken"}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409; body=%s", rr.Code, rr.Body.String())
	}
	// Slug is applied before Upsert — conflict must not leave a partial config write.
	if p.upsertRr != 0 {
		t.Errorf("Upsert must NOT run when slug rename conflicts; called %d", p.upsertRr)
	}
}

func TestUpsertMyPublicProfile_Free_FirstSave_ForcesProTogglesOff(t *testing.T) {
	// Omitted show_reviews/show_portfolio would inherit defaults true; Free must force false.
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "basic")
	body := `{"is_enabled":true,"public_slug":"free-org","show_services":true,"show_contact":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertIn == nil {
		t.Fatal("expected Upsert input")
	}
	if p.upsertIn.ShowReviews || p.upsertIn.ShowPortfolio {
		t.Errorf("Free first save must force show_reviews/show_portfolio false; got reviews=%v portfolio=%v",
			p.upsertIn.ShowReviews, p.upsertIn.ShowPortfolio)
	}
	if len(p.upsertIn.Socials) != 0 {
		t.Errorf("Free first save must clear socials; got %v", p.upsertIn.Socials)
	}
}

func TestUpsertMyPublicProfile_InvalidContactType_400(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "pro")
	body := `{"is_enabled":true,"public_slug":"org","contact_type":"telegram"}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertRr != 0 {
		t.Errorf("Upsert must NOT run on invalid contact_type")
	}
}

func TestUpsertMyPublicProfile_EnableWithoutSlug_400(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	// User has no public_slug yet.
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "pro")
	body := `{"is_enabled":true,"show_services":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertRr != 0 {
		t.Errorf("Upsert must NOT run when enabling without slug")
	}
}

func TestUpsertMyPublicProfile_Pro_AcceptsProToggles(t *testing.T) {
	p := &cfgProfileRepo{}
	s := &slugRenamer{}
	h, user := newConfigHandler(&cfgUserRepo{}, p, s, "pro")
	body := `{"is_enabled":true,"public_slug":"pro-org","show_reviews":true,"show_portfolio":true,"show_services":true,"show_contact":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, user.ID, body))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if p.upsertRr != 1 {
		t.Errorf("Upsert called %d, want 1", p.upsertRr)
	}
}

func TestUpsertMyPublicProfile_NoSlugChange_DoesNotRename(t *testing.T) {
	// Existing profile already has the same slug -> no rename needed.
	existingSlug := "alice"
	p := &cfgProfileRepo{existing: &models.OrganizerPublicProfile{IsEnabled: true, PublicSlug: &existingSlug}}
	s := &slugRenamer{}
	h, _ := newConfigHandler(&cfgUserRepo{user: &models.User{ID: uuid.New(), Plan: "pro", PublicSlug: &existingSlug}}, p, s, "pro")
	// Body omits public_slug entirely OR sends the same one.
	body := `{"is_enabled":true,"show_services":true,"show_reviews":false,"show_portfolio":false,"show_contact":true}`
	rr := httptest.NewRecorder()
	h.UpsertMyPublicProfile(rr, putWithUser(t, uuid.New(), body))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if s.called {
		t.Errorf("slug rename must NOT run when slug unchanged/absent")
	}
}

// Ensure errors import is used (helper kept for future expansion).
var _ = errors.Is
