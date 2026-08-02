package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// fakeSearchRepo is a manual fake (same style as fakeUserRepo / fakeProfileRepo
// in public_profile_handler_test.go) implementing publicProfileSearchRepo.
type fakeSearchRepo struct {
	cards []models.PublicOrganizerCard
	total int
	err   error
	// Captured filters let tests assert the handler mapped query params correctly.
	captured repository.SearchPublicProfilesFilters
}

func (f *fakeSearchRepo) SearchPublicProfiles(_ context.Context, fl repository.SearchPublicProfilesFilters) ([]models.PublicOrganizerCard, int, error) {
	f.captured = fl
	return f.cards, f.total, f.err
}

func newSearchHandler(repo *fakeSearchRepo) *PublicProfileHandler {
	return &PublicProfileHandler{searchRepo: repo}
}

func TestSearchOrganizers_HappyPath(t *testing.T) {
	repo := &fakeSearchRepo{
		cards: []models.PublicOrganizerCard{{Slug: "alice", BusinessName: "Alice Catering", IsFeatured: true}},
		total: 1,
	}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers?page=1&limit=10", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(1), resp["total"])
	// Filter mapping: default limit/page applied.
	assert.Equal(t, 10, repo.captured.Limit)
	assert.Equal(t, 0, repo.captured.Offset) // page 1 → offset 0
}

func TestSearchOrganizers_DefaultsWhenNoPagination(t *testing.T) {
	repo := &fakeSearchRepo{total: 0}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, 20, repo.captured.Limit) // default
	assert.Equal(t, 0, repo.captured.Offset)
}

func TestSearchOrganizers_MapsAllFilters(t *testing.T) {
	repo := &fakeSearchRepo{}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet,
		"/api/public/organizers?city=Mexico&country=MX&event_type=boda&q=catering&sort=rating&order=asc&page=3&limit=5", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	f := repo.captured
	assert.Equal(t, "Mexico", f.City)
	assert.Equal(t, "MX", f.Country)
	assert.Equal(t, "boda", f.EventType)
	assert.Equal(t, "catering", f.Query)
	assert.Equal(t, "rating", f.SortBy)
	assert.Equal(t, "ASC", f.Order)
	assert.Equal(t, 5, f.Limit)
	assert.Equal(t, 10, f.Offset) // page 3 × limit 5
}

func TestSearchOrganizers_RepoError_Returns500(t *testing.T) {
	repo := &fakeSearchRepo{err: errors.New("db down")}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "Failed to load directory")
}

func TestSearchOrganizers_NilSearchRepo_Returns501(t *testing.T) {
	// Handler constructed without searchRepo (defensive — older callers).
	h := &PublicProfileHandler{}
	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)
	assert.Equal(t, http.StatusNotImplemented, w.Code)
}

func TestSearchOrganizers_EmptyResults(t *testing.T) {
	repo := &fakeSearchRepo{cards: []models.PublicOrganizerCard{}, total: 0}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers?city=Nowhere", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, float64(0), resp["total"])
	// data should be an empty array (not nil) for clean JSON.
	assert.Contains(t, w.Body.String(), `"data":[]`)
}

func TestSearchOrganizers_FreeCardHidesRating(t *testing.T) {
	// The repo returns nil AverageRating/ReviewsCount (plan-gating happens there).
	// The handler must not synthesize them — just pass through.
	repo := &fakeSearchRepo{
		cards: []models.PublicOrganizerCard{{Slug: "free", IsFeatured: false}},
		total: 1,
	}
	h := newSearchHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/public/organizers", nil)
	w := httptest.NewRecorder()
	h.SearchOrganizers(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].([]any)
	card := data[0].(map[string]any)
	assert.Nil(t, card["average_rating"])
	assert.Nil(t, card["reviews_count"])
}

// Ensure uuid import used (future-proof for test expansion).
var _ = uuid.New
