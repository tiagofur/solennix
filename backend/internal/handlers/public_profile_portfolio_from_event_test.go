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
	"github.com/tiagofur/solennix-backend/internal/models"
)

var errEventNotFound = errors.New("event not found")

// portfolioEventStore fakes event lookup for portfolio-from-event create + candidates.
type portfolioEventStore struct {
	events      map[uuid.UUID]*models.Event
	candidates  []models.PortfolioCandidateEvent
	getErr      error
	listErr     error
	listCalled  bool
	getCalledID uuid.UUID
}

func (f *portfolioEventStore) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error) {
	f.getCalledID = id
	if f.getErr != nil {
		return nil, f.getErr
	}
	if f.events == nil {
		return nil, errEventNotFound
	}
	e, ok := f.events[id]
	if !ok || e.UserID != userID {
		return nil, errEventNotFound
	}
	return e, nil
}

func (f *portfolioEventStore) ListPublicPortfolioCandidates(ctx context.Context, userID uuid.UUID) ([]models.PortfolioCandidateEvent, error) {
	f.listCalled = true
	if f.listErr != nil {
		return nil, f.listErr
	}
	return f.candidates, nil
}

func TestCreatePortfolio_FromEvent_Success(t *testing.T) {
	uid := uuid.New()
	eventID := uuid.New()
	photoID := uuid.New()
	thumb := "https://cdn.example/t.jpg"
	photosJSON := `[{"id":"` + photoID.String() + `","url":"https://cdn.example/p.jpg","thumbnail_url":"` + thumb + `","created_at":"2026-01-01T00:00:00Z"}]`
	store := &portfolioItemStore{}
	eventStore := &portfolioEventStore{events: map[uuid.UUID]*models.Event{
		eventID: {
			ID: eventID, UserID: uid, ServiceType: "Wedding", EventDate: "2024-06-15",
			Status: "completed", Photos: &photosJSON,
		},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
		eventRepo:     eventStore,
	}
	body := `{"event_id":"` + eventID.String() + `"}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	if len(store.items) != 1 {
		t.Fatalf("store len = %d, want 1", len(store.items))
	}
	item := store.items[0]
	if item.Title != "Wedding" {
		t.Errorf("title = %q, want Wedding (service_type)", item.Title)
	}
	if item.EventDate == nil || *item.EventDate != "2024-06-15" {
		t.Errorf("event_date = %v, want 2024-06-15", item.EventDate)
	}
	if item.PhotoURL != "https://cdn.example/p.jpg" {
		t.Errorf("photo_url = %q", item.PhotoURL)
	}
	if item.ThumbnailURL == nil || *item.ThumbnailURL != thumb {
		t.Errorf("thumbnail_url = %v, want %s", item.ThumbnailURL, thumb)
	}
	if item.EventID == nil || *item.EventID != eventID {
		t.Errorf("event_id = %v, want %v", item.EventID, eventID)
	}
}

func TestCreatePortfolio_FromEvent_PhotoID(t *testing.T) {
	uid := uuid.New()
	eventID := uuid.New()
	photo1 := uuid.New()
	photo2 := uuid.New()
	photosJSON := `[{"id":"` + photo1.String() + `","url":"https://cdn.example/1.jpg","created_at":"2026-01-01T00:00:00Z"},{"id":"` + photo2.String() + `","url":"https://cdn.example/2.jpg","created_at":"2026-01-02T00:00:00Z"}]`
	store := &portfolioItemStore{}
	eventStore := &portfolioEventStore{events: map[uuid.UUID]*models.Event{
		eventID: {
			ID: eventID, UserID: uid, ServiceType: "Gala", EventDate: "2024-01-01",
			Status: "completed", Photos: &photosJSON,
		},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
		eventRepo:     eventStore,
	}
	body := `{"event_id":"` + eventID.String() + `","photo_id":"` + photo2.String() + `"}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	if store.items[0].PhotoURL != "https://cdn.example/2.jpg" {
		t.Errorf("photo_url = %q, want second photo", store.items[0].PhotoURL)
	}
}

func TestCreatePortfolio_FromEvent_DuplicateRejected(t *testing.T) {
	uid := uuid.New()
	eventID := uuid.New()
	photosJSON := `[{"id":"` + uuid.New().String() + `","url":"https://cdn.example/p.jpg","created_at":"2026-01-01T00:00:00Z"}]`
	store := &portfolioItemStore{items: []models.OrganizerPublicPortfolioItem{
		{ID: uuid.New(), UserID: uid, EventID: &eventID, Title: "Existing", PhotoURL: "https://x", SortOrder: 0},
	}}
	eventStore := &portfolioEventStore{events: map[uuid.UUID]*models.Event{
		eventID: {
			ID: eventID, UserID: uid, ServiceType: "Wedding", EventDate: "2024-06-15",
			Status: "completed", Photos: &photosJSON,
		},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
		eventRepo:     eventStore,
	}
	body := `{"event_id":"` + eventID.String() + `"}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(strings.ToLower(rr.Body.String()), "already") {
		t.Errorf("duplicate error should mention already; got %s", rr.Body.String())
	}
	if len(store.items) != 1 {
		t.Errorf("duplicate must not append; len=%d", len(store.items))
	}
}

func TestCreatePortfolio_FromEvent_TitleOverride(t *testing.T) {
	uid := uuid.New()
	eventID := uuid.New()
	photosJSON := `[{"id":"` + uuid.New().String() + `","url":"https://cdn.example/p.jpg","created_at":"2026-01-01T00:00:00Z"}]`
	store := &portfolioItemStore{}
	eventStore := &portfolioEventStore{events: map[uuid.UUID]*models.Event{
		eventID: {
			ID: eventID, UserID: uid, ServiceType: "Wedding", EventDate: "2024-06-15",
			Status: "completed", Photos: &photosJSON,
		},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
		eventRepo:     eventStore,
	}
	body := `{"event_id":"` + eventID.String() + `","title":"Custom Title"}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	if store.items[0].Title != "Custom Title" {
		t.Errorf("title = %q, want Custom Title override", store.items[0].Title)
	}
}

func TestListPortfolioCandidates_Pro_OmitsClientPII(t *testing.T) {
	uid := uuid.New()
	eventID := uuid.New()
	photoID := uuid.New()
	city := "Lisbon"
	// Candidates must never include client name/phone — fake returns only sanitized DTO.
	store := &portfolioItemStore{}
	eventStore := &portfolioEventStore{candidates: []models.PortfolioCandidateEvent{
		{
			ID: eventID, ServiceType: "Wedding", EventDate: "2024-06-15", City: &city,
			Photos: []models.PortfolioCandidatePhoto{
				{ID: photoID, URL: "https://cdn.example/p.jpg"},
			},
		},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
		eventRepo:     eventStore,
	}
	rr := httptest.NewRecorder()
	h.ListPortfolioCandidates(rr, portfolioReq(t, http.MethodGet, "/api/users/me/public-profile/portfolio/candidates", "", uid))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	body := rr.Body.String()
	// Hard PII guard: client fields must never appear in candidates payload.
	for _, forbidden := range []string{"client_name", "client_phone", "phone", "email", "client_id"} {
		if strings.Contains(strings.ToLower(body), forbidden) {
			t.Errorf("candidates body must not contain %q; got %s", forbidden, body)
		}
	}
	var items []models.PortfolioCandidateEvent
	if err := json.Unmarshal(rr.Body.Bytes(), &items); err != nil {
		var wrap struct {
			Data []models.PortfolioCandidateEvent `json:"data"`
		}
		if err2 := json.Unmarshal(rr.Body.Bytes(), &wrap); err2 != nil {
			t.Fatalf("unmarshal: %v body=%s", err, body)
		}
		items = wrap.Data
	}
	if len(items) != 1 || items[0].ServiceType != "Wedding" {
		t.Errorf("items = %+v", items)
	}
	if !eventStore.listCalled {
		t.Error("expected ListPublicPortfolioCandidates to be called")
	}
}

func TestListPortfolioCandidates_Free_PlanLimit(t *testing.T) {
	h, uid := newPortfolioHandler("basic", &portfolioItemStore{})
	// Ensure Free path does not require eventRepo for the plan gate.
	rr := httptest.NewRecorder()
	h.ListPortfolioCandidates(rr, portfolioReq(t, http.MethodGet, "/api/users/me/public-profile/portfolio/candidates", "", uid))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Errorf("body must contain plan_limit_exceeded; got %s", rr.Body.String())
	}
}
