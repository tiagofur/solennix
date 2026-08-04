package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type fakeListingModeration struct {
	profile     *models.OrganizerPublicProfile
	publicable  bool
	submitErr   error
	approveErr  error
	rejectErr   error
	queue       []repository.ModerationListing
	lastStatus  string
	lastReason  string
	submittedID uuid.UUID
}

func (f *fakeListingModeration) GetByUserID(_ context.Context, _ uuid.UUID) (*models.OrganizerPublicProfile, error) {
	if f.profile == nil {
		return nil, repository.ErrPublicProfileNotFound
	}
	return f.profile, nil
}
func (f *fakeListingModeration) IsDirectoryPublicable(_ context.Context, _ uuid.UUID) (bool, error) {
	return f.publicable, nil
}
func (f *fakeListingModeration) SubmitForReview(_ context.Context, userID uuid.UUID, _ bool, spam bool) (*models.OrganizerPublicProfile, error) {
	f.submittedID = userID
	if f.submitErr != nil {
		return nil, f.submitErr
	}
	p := *f.profile
	p.PublicationStatus = models.PublicationPendingReview
	p.PublicationSpamFlag = spam
	return &p, nil
}
func (f *fakeListingModeration) ApprovePublication(_ context.Context, userID, _ uuid.UUID) (*models.OrganizerPublicProfile, error) {
	if f.approveErr != nil {
		return nil, f.approveErr
	}
	return &models.OrganizerPublicProfile{UserID: userID, PublicationStatus: models.PublicationPublished}, nil
}
func (f *fakeListingModeration) RejectPublication(_ context.Context, userID, _ uuid.UUID, reason string) (*models.OrganizerPublicProfile, error) {
	f.lastReason = reason
	if f.rejectErr != nil {
		return nil, f.rejectErr
	}
	r := reason
	return &models.OrganizerPublicProfile{
		UserID: userID, PublicationStatus: models.PublicationRejected,
		PublicationRejectionReason: &r,
	}, nil
}
func (f *fakeListingModeration) ListModerationQueue(_ context.Context, status string, _ int) ([]repository.ModerationListing, error) {
	f.lastStatus = status
	return f.queue, nil
}

func TestSubmitForDirectoryReview_HappyPath(t *testing.T) {
	uid := uuid.New()
	store := &fakeListingModeration{
		profile:    &models.OrganizerPublicProfile{UserID: uid, IsEnabled: true, PublicationStatus: models.PublicationUnpublished},
		publicable: true,
	}
	h := &PublicProfileConfigHandler{moderation: store}
	req := httptest.NewRequest(http.MethodPost, "/api/users/me/public-profile/submit-for-review", nil)
	req = req.WithContext(middleware.WithUserID(req.Context(), uid))
	w := httptest.NewRecorder()
	h.SubmitForDirectoryReview(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, uid, store.submittedID)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]any)
	assert.Equal(t, models.PublicationPendingReview, data["publication_status"])
}

func TestSubmitForDirectoryReview_NotPublicable(t *testing.T) {
	uid := uuid.New()
	store := &fakeListingModeration{
		profile:    &models.OrganizerPublicProfile{UserID: uid, IsEnabled: true},
		publicable: false,
	}
	h := &PublicProfileConfigHandler{moderation: store}
	req := httptest.NewRequest(http.MethodPost, "/api/users/me/public-profile/submit-for-review", nil)
	req = req.WithContext(middleware.WithUserID(req.Context(), uid))
	w := httptest.NewRecorder()
	h.SubmitForDirectoryReview(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDetectSpamFlag(t *testing.T) {
	assert.True(t, repository.DetectSpamFlag("great", "buy bitcoin now"))
	assert.False(t, repository.DetectSpamFlag("Bodas en CDMX", "Servicio profesional de catering"))
}

func TestAdminApproveListing(t *testing.T) {
	uid := uuid.New()
	adminID := uuid.New()
	store := &fakeListingModeration{}
	h := &AdminHandler{moderation: store}
	req := httptest.NewRequest(http.MethodPost, "/api/admin/listing-moderation/"+uid.String()+"/approve", nil)
	req.SetPathValue("id", uid.String())
	req = req.WithContext(middleware.WithUserID(req.Context(), adminID))
	w := httptest.NewRecorder()
	h.ApproveListing(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]any)
	assert.Equal(t, models.PublicationPublished, data["publication_status"])
}

func TestAdminRejectListing_RequiresReason(t *testing.T) {
	uid := uuid.New()
	h := &AdminHandler{moderation: &fakeListingModeration{}}
	req := httptest.NewRequest(http.MethodPost, "/api/admin/listing-moderation/"+uid.String()+"/reject",
		strings.NewReader(`{"reason":""}`))
	req.SetPathValue("id", uid.String())
	req = req.WithContext(middleware.WithUserID(req.Context(), uuid.New()))
	w := httptest.NewRecorder()
	h.RejectListing(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAdminListModerationQueue(t *testing.T) {
	store := &fakeListingModeration{
		queue: []repository.ModerationListing{{
			UserID: uuid.New(), PublicSlug: "alice", BusinessName: "Alice", PublicationStatus: "pending_review",
		}},
	}
	h := &AdminHandler{moderation: store}
	req := httptest.NewRequest(http.MethodGet, "/api/admin/listing-moderation?status=pending_review", nil)
	w := httptest.NewRecorder()
	h.ListListingModeration(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "pending_review", store.lastStatus)
	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].([]any)
	assert.Len(t, data, 1)
}
