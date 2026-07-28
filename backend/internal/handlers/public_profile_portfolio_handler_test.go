package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// --- portfolio fakes ---

type portfolioUserRepo struct {
	user *models.User
	err  error
}

func (f *portfolioUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return f.user, f.err
}

type portfolioItemStore struct {
	items   []models.OrganizerPublicPortfolioItem
	listErr error
	create  func(item *models.OrganizerPublicPortfolioItem) error
	update  func(item *models.OrganizerPublicPortfolioItem) error
	delete  func(userID, id uuid.UUID) error
	count   int
	countFn func(userID uuid.UUID) (int, error)
}

func (f *portfolioItemStore) ListPortfolioByUserID(ctx context.Context, userID uuid.UUID) ([]models.OrganizerPublicPortfolioItem, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]models.OrganizerPublicPortfolioItem, 0, len(f.items))
	for _, it := range f.items {
		if it.UserID == userID {
			out = append(out, it)
		}
	}
	return out, nil
}

func (f *portfolioItemStore) CountPortfolioByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	if f.countFn != nil {
		return f.countFn(userID)
	}
	if f.count > 0 {
		return f.count, nil
	}
	n := 0
	for _, it := range f.items {
		if it.UserID == userID {
			n++
		}
	}
	return n, nil
}

func (f *portfolioItemStore) CreatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error {
	if f.create != nil {
		return f.create(item)
	}
	if item.ID == uuid.Nil {
		item.ID = uuid.New()
	}
	f.items = append(f.items, *item)
	return nil
}

func (f *portfolioItemStore) UpdatePortfolioItem(ctx context.Context, item *models.OrganizerPublicPortfolioItem) error {
	if f.update != nil {
		return f.update(item)
	}
	for i, it := range f.items {
		if it.ID == item.ID && it.UserID == item.UserID {
			f.items[i] = *item
			return nil
		}
	}
	return repository.ErrPortfolioItemNotFound
}

func (f *portfolioItemStore) DeletePortfolioItem(ctx context.Context, userID, id uuid.UUID) error {
	if f.delete != nil {
		return f.delete(userID, id)
	}
	for i, it := range f.items {
		if it.ID == id && it.UserID == userID {
			f.items = append(f.items[:i], f.items[i+1:]...)
			return nil
		}
	}
	return repository.ErrPortfolioItemNotFound
}

func newPortfolioHandler(plan string, store *portfolioItemStore) (*PublicProfilePortfolioHandler, uuid.UUID) {
	uid := uuid.New()
	if store == nil {
		store = &portfolioItemStore{}
	}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: plan}},
		portfolioRepo: store,
	}
	return h, uid
}

func portfolioReq(t *testing.T, method, path, body string, userID uuid.UUID) *http.Request {
	t.Helper()
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	return r.WithContext(middleware.WithUserID(r.Context(), userID))
}

// --- 5.1 RED scenarios ---

func TestCreatePortfolio_Free_PlanLimit(t *testing.T) {
	store := &portfolioItemStore{}
	h, uid := newPortfolioHandler("basic", store)
	body := `{"title":"Wedding","photo_url":"https://cdn.example/p.jpg","sort_order":0}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403; body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "plan_limit_exceeded") {
		t.Errorf("body must contain plan_limit_exceeded; got %s", rr.Body.String())
	}
	if !strings.Contains(rr.Body.String(), "public_profile_full") {
		t.Errorf("body must name public_profile_full limit; got %s", rr.Body.String())
	}
	if len(store.items) != 0 {
		t.Errorf("Free create must not persist items; got %d", len(store.items))
	}
}

func TestCreatePortfolio_Pro_SeventhItemRejected(t *testing.T) {
	uid := uuid.New()
	items := make([]models.OrganizerPublicPortfolioItem, 0, 6)
	for i := 0; i < 6; i++ {
		items = append(items, models.OrganizerPublicPortfolioItem{
			ID: uuid.New(), UserID: uid, Title: "x", PhotoURL: "https://x", SortOrder: i,
		})
	}
	store := &portfolioItemStore{items: items, count: 6}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
	}
	body := `{"title":"Seventh","photo_url":"https://cdn.example/7.jpg","sort_order":0}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body=%s", rr.Code, rr.Body.String())
	}
	if !strings.Contains(strings.ToLower(rr.Body.String()), "6") {
		t.Errorf("max-items error should mention limit 6; got %s", rr.Body.String())
	}
	if len(store.items) != 6 {
		t.Errorf("7th create must not append; len=%d", len(store.items))
	}
}

func TestCreatePortfolio_Pro_Success(t *testing.T) {
	store := &portfolioItemStore{}
	h, uid := newPortfolioHandler("pro", store)
	body := `{"title":"Gala 2024","photo_url":"https://cdn.example/gala.jpg","sort_order":1,"event_date":"2024-06-15"}`
	rr := httptest.NewRecorder()

	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body=%s", rr.Code, rr.Body.String())
	}
	var item models.OrganizerPublicPortfolioItem
	if err := json.Unmarshal(rr.Body.Bytes(), &item); err != nil {
		// also accept {data: ...} wrap
		var wrap struct {
			Data models.OrganizerPublicPortfolioItem `json:"data"`
		}
		if err2 := json.Unmarshal(rr.Body.Bytes(), &wrap); err2 != nil || wrap.Data.Title == "" {
			t.Fatalf("unmarshal: %v; body=%s", err, rr.Body.String())
		}
		item = wrap.Data
	}
	if item.Title != "Gala 2024" || item.PhotoURL == "" || item.SortOrder != 1 {
		t.Errorf("item = %+v", item)
	}
	if item.UserID != uid {
		t.Errorf("UserID = %v, want %v", item.UserID, uid)
	}
	if len(store.items) != 1 {
		t.Errorf("store len = %d, want 1", len(store.items))
	}
}

func TestListPortfolio_Free_PlanLimit(t *testing.T) {
	h, uid := newPortfolioHandler("basic", &portfolioItemStore{})
	rr := httptest.NewRecorder()
	h.ListPortfolioItems(rr, portfolioReq(t, http.MethodGet, "/api/users/me/public-profile/portfolio", "", uid))
	if rr.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rr.Code)
	}
}

func TestListPortfolio_Pro_ReturnsItems(t *testing.T) {
	uid := uuid.New()
	store := &portfolioItemStore{items: []models.OrganizerPublicPortfolioItem{
		{ID: uuid.New(), UserID: uid, Title: "A", PhotoURL: "https://a", SortOrder: 0},
		{ID: uuid.New(), UserID: uid, Title: "B", PhotoURL: "https://b", SortOrder: 1},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "business"}},
		portfolioRepo: store,
	}
	rr := httptest.NewRecorder()
	h.ListPortfolioItems(rr, portfolioReq(t, http.MethodGet, "/api/users/me/public-profile/portfolio", "", uid))
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	var items []models.OrganizerPublicPortfolioItem
	if err := json.Unmarshal(rr.Body.Bytes(), &items); err != nil {
		var wrap struct {
			Data []models.OrganizerPublicPortfolioItem `json:"data"`
		}
		if err2 := json.Unmarshal(rr.Body.Bytes(), &wrap); err2 != nil {
			t.Fatalf("unmarshal: %v body=%s", err, rr.Body.String())
		}
		items = wrap.Data
	}
	if len(items) != 2 {
		t.Errorf("len = %d, want 2", len(items))
	}
}

func TestDeletePortfolio_Pro_NotFound(t *testing.T) {
	h, uid := newPortfolioHandler("pro", &portfolioItemStore{})
	missing := uuid.New()
	req := portfolioReq(t, http.MethodDelete, "/api/users/me/public-profile/portfolio/"+missing.String(), "", uid)
	req.SetPathValue("id", missing.String())
	rr := httptest.NewRecorder()
	h.DeletePortfolioItem(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestDeletePortfolio_Pro_Success(t *testing.T) {
	uid := uuid.New()
	id := uuid.New()
	store := &portfolioItemStore{items: []models.OrganizerPublicPortfolioItem{
		{ID: id, UserID: uid, Title: "X", PhotoURL: "https://x", SortOrder: 0},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
	}
	req := portfolioReq(t, http.MethodDelete, "/api/users/me/public-profile/portfolio/"+id.String(), "", uid)
	req.SetPathValue("id", id.String())
	rr := httptest.NewRecorder()
	h.DeletePortfolioItem(rr, req)
	if rr.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204; body=%s", rr.Code, rr.Body.String())
	}
	if len(store.items) != 0 {
		t.Errorf("item not deleted; len=%d", len(store.items))
	}
}

func TestUpdatePortfolio_Pro_Success(t *testing.T) {
	uid := uuid.New()
	id := uuid.New()
	store := &portfolioItemStore{items: []models.OrganizerPublicPortfolioItem{
		{ID: id, UserID: uid, Title: "Old", PhotoURL: "https://old", SortOrder: 0},
	}}
	h := &PublicProfilePortfolioHandler{
		userRepo:      &portfolioUserRepo{user: &models.User{ID: uid, Plan: "pro"}},
		portfolioRepo: store,
	}
	body := `{"title":"New Title","photo_url":"https://new","sort_order":2}`
	req := portfolioReq(t, http.MethodPut, "/api/users/me/public-profile/portfolio/"+id.String(), body, uid)
	req.SetPathValue("id", id.String())
	rr := httptest.NewRecorder()
	h.UpdatePortfolioItem(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if store.items[0].Title != "New Title" || store.items[0].SortOrder != 2 {
		t.Errorf("updated = %+v", store.items[0])
	}
}

func TestCreatePortfolio_InvalidSortOrder(t *testing.T) {
	h, uid := newPortfolioHandler("pro", &portfolioItemStore{})
	body := `{"title":"X","photo_url":"https://x","sort_order":6}`
	rr := httptest.NewRecorder()
	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for sort_order=6", rr.Code)
	}
}

func TestCreatePortfolio_MissingTitle(t *testing.T) {
	h, uid := newPortfolioHandler("pro", &portfolioItemStore{})
	body := `{"photo_url":"https://x","sort_order":0}`
	rr := httptest.NewRecorder()
	h.CreatePortfolioItem(rr, portfolioReq(t, http.MethodPost, "/api/users/me/public-profile/portfolio", body, uid))
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400 for missing title", rr.Code)
	}
}
