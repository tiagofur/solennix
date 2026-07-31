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
)

// --- fakes for services selection ---

type servicesProductStore struct {
	products []models.Product
	listErr  error
	setErr   error
	setIDs   []uuid.UUID
	setUser  uuid.UUID
}

func (f *servicesProductStore) ListActiveForPublicProfileSettings(ctx context.Context, userID uuid.UUID) ([]models.Product, error) {
	if f.listErr != nil {
		return nil, f.listErr
	}
	out := make([]models.Product, 0)
	for _, p := range f.products {
		if p.UserID == userID && p.IsActive {
			out = append(out, p)
		}
	}
	return out, nil
}

func (f *servicesProductStore) SetPublicProfileServices(ctx context.Context, userID uuid.UUID, productIDs []uuid.UUID) error {
	if f.setErr != nil {
		return f.setErr
	}
	f.setUser = userID
	f.setIDs = append([]uuid.UUID(nil), productIDs...)
	// Mirror bulk semantics: selected active IDs true, all other active false.
	selected := map[uuid.UUID]bool{}
	for _, id := range productIDs {
		selected[id] = true
	}
	for i := range f.products {
		if f.products[i].UserID != userID || !f.products[i].IsActive {
			continue
		}
		f.products[i].ShowOnPublicProfile = selected[f.products[i].ID]
	}
	return nil
}

func newServicesHandler(store *servicesProductStore) (*PublicProfileServicesHandler, uuid.UUID) {
	uid := uuid.New()
	if store == nil {
		store = &servicesProductStore{}
	}
	h := &PublicProfileServicesHandler{
		productRepo: store,
	}
	return h, uid
}

func servicesReq(t *testing.T, method, path, body string, userID uuid.UUID) *http.Request {
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

func TestListPublicProfileServices_ReturnsActiveWithFlag(t *testing.T) {
	uid := uuid.New()
	img := "https://cdn.example/a.jpg"
	store := &servicesProductStore{products: []models.Product{
		{ID: uuid.New(), UserID: uid, Name: "Alpha", Category: "main", BasePrice: 100, ImageURL: &img, IsActive: true, ShowOnPublicProfile: true},
		{ID: uuid.New(), UserID: uid, Name: "Beta", Category: "side", BasePrice: 50, IsActive: true, ShowOnPublicProfile: false},
		{ID: uuid.New(), UserID: uid, Name: "Inactive", Category: "main", BasePrice: 10, IsActive: false, ShowOnPublicProfile: true},
	}}
	h := &PublicProfileServicesHandler{
		productRepo: store,
	}
	rr := httptest.NewRecorder()
	h.ListMyPublicProfileServices(rr, servicesReq(t, http.MethodGet, "/api/users/me/public-profile/services", "", uid))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	var items []publicProfileServiceDTO
	if err := json.Unmarshal(rr.Body.Bytes(), &items); err != nil {
		var wrap struct {
			Data []publicProfileServiceDTO `json:"data"`
		}
		if err2 := json.Unmarshal(rr.Body.Bytes(), &wrap); err2 != nil {
			t.Fatalf("unmarshal: %v body=%s", err, rr.Body.String())
		}
		items = wrap.Data
	}
	if len(items) != 2 {
		t.Fatalf("len = %d, want 2 active products; body=%s", len(items), rr.Body.String())
	}
	// Must include price/image/flag for settings UI.
	foundPublic := false
	for _, it := range items {
		if it.Name == "Alpha" {
			foundPublic = true
			if !it.ShowOnPublicProfile {
				t.Errorf("Alpha show_on_public_profile = false, want true")
			}
			if it.BasePrice != 100 {
				t.Errorf("Alpha base_price = %v, want 100", it.BasePrice)
			}
			if it.ImageURL == nil || *it.ImageURL != img {
				t.Errorf("Alpha image_url = %v, want %s", it.ImageURL, img)
			}
		}
		if it.Name == "Inactive" {
			t.Errorf("inactive product must not appear")
		}
	}
	if !foundPublic {
		t.Errorf("expected Alpha in response")
	}
}

// With the Free-plan cap removed, any number of services may be selected — there
// is no longer a 3-service limit on Free.
func TestSetPublicProfileServices_Free_NoCap(t *testing.T) {
	uid := uuid.New()
	ids := make([]uuid.UUID, 5)
	products := make([]models.Product, 0, 5)
	for i := 0; i < 5; i++ {
		ids[i] = uuid.New()
		products = append(products, models.Product{
			ID: ids[i], UserID: uid, Name: "P", Category: "main", BasePrice: float64(i), IsActive: true,
		})
	}
	store := &servicesProductStore{products: products}
	h, _ := newServicesHandler(store)
	parts := make([]string, 0, 5)
	for _, id := range ids {
		parts = append(parts, id.String())
	}
	body := `{"product_ids":["` + strings.Join(parts, `","`) + `"]}`
	rr := httptest.NewRecorder()

	h.SetMyPublicProfileServices(rr, servicesReq(t, http.MethodPut, "/api/users/me/public-profile/services", body, uid))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if len(store.setIDs) != 5 {
		t.Errorf("setIDs len = %d, want 5 (no Free cap)", len(store.setIDs))
	}
}

func TestSetPublicProfileServices_EmptyClearsAll(t *testing.T) {
	uid := uuid.New()
	p1 := uuid.New()
	store := &servicesProductStore{products: []models.Product{
		{ID: p1, UserID: uid, Name: "A", Category: "main", BasePrice: 1, IsActive: true, ShowOnPublicProfile: true},
	}}
	h := &PublicProfileServicesHandler{
		productRepo: store,
	}
	body := `{"product_ids":[]}`
	rr := httptest.NewRecorder()

	h.SetMyPublicProfileServices(rr, servicesReq(t, http.MethodPut, "/api/users/me/public-profile/services", body, uid))

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%s", rr.Code, rr.Body.String())
	}
	if store.products[0].ShowOnPublicProfile {
		t.Errorf("empty selection must clear flags")
	}
}
