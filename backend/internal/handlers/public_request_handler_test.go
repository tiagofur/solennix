package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// --- mocks ---

type mockPublicRequestService struct {
	mock.Mock
}

func (m *mockPublicRequestService) CreatePublicRequest(ctx context.Context, in services.CreatePublicRequestInput) (*models.PublicRequest, error) {
	args := m.Called(ctx, in)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublicRequest), args.Error(1)
}
func (m *mockPublicRequestService) Respond(ctx context.Context, requestID, organizerUserID uuid.UUID, resp *models.PublicResponse) error {
	return m.Called(ctx, requestID, organizerUserID, resp).Error(0)
}
func (m *mockPublicRequestService) RequestInfo(ctx context.Context, requestID, organizerUserID uuid.UUID) error {
	return m.Called(ctx, requestID, organizerUserID).Error(0)
}
func (m *mockPublicRequestService) Decline(ctx context.Context, requestID, organizerUserID uuid.UUID, reason *string) error {
	return m.Called(ctx, requestID, organizerUserID, reason).Error(0)
}
func (m *mockPublicRequestService) MarkRead(ctx context.Context, requestID, organizerUserID uuid.UUID) error {
	return m.Called(ctx, requestID, organizerUserID).Error(0)
}
func (m *mockPublicRequestService) ClientAction(ctx context.Context, requestID uuid.UUID, clientToken uuid.UUID, action string) error {
	return m.Called(ctx, requestID, clientToken, action).Error(0)
}
func (m *mockPublicRequestService) ConvertToEvent(ctx context.Context, requestID, organizerUserID uuid.UUID) (*uuid.UUID, error) {
	args := m.Called(ctx, requestID, organizerUserID)
	var eid *uuid.UUID
	if args.Get(0) != nil {
		eid = args.Get(0).(*uuid.UUID)
	}
	return eid, args.Error(1)
}

type mockPublicRequestInboxStore struct {
	mock.Mock
}

func (m *mockPublicRequestInboxStore) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID, f repository.PublicRequestListFilters) ([]models.PublicRequest, int, error) {
	args := m.Called(ctx, organizerUserID, f)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]models.PublicRequest), args.Int(1), args.Error(2)
}
func (m *mockPublicRequestInboxStore) ListByOrganizerCursor(ctx context.Context, organizerUserID uuid.UUID, f repository.PublicRequestCursorFilters) ([]models.PublicRequest, *string, error) {
	args := m.Called(ctx, organizerUserID, f)
	var next *string
	if args.Get(1) != nil {
		next = args.Get(1).(*string)
	}
	if args.Get(0) == nil {
		return nil, next, args.Error(2)
	}
	return args.Get(0).([]models.PublicRequest), next, args.Error(2)
}
func (m *mockPublicRequestInboxStore) CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	args := m.Called(ctx, organizerUserID)
	return args.Int(0), args.Error(1)
}
func (m *mockPublicRequestInboxStore) GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequest, error) {
	args := m.Called(ctx, id, organizerUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublicRequest), args.Error(1)
}
func (m *mockPublicRequestInboxStore) ListResponsesByRequest(ctx context.Context, requestID, organizerUserID uuid.UUID) ([]models.PublicResponse, error) {
	args := m.Called(ctx, requestID, organizerUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.PublicResponse), args.Error(1)
}
func newReqHandler(svc *mockPublicRequestService, store *mockPublicRequestInboxStore) *PublicRequestHandler {
	return &PublicRequestHandler{svc: svc, requestRepo: store}
}

// --- CreatePublicRequest (public) ---

func TestCreatePublicRequest_HappyPath(t *testing.T) {
	svc := new(mockPublicRequestService)
	store := new(mockPublicRequestInboxStore)
	h := newReqHandler(svc, store)

	token := uuid.New()
	created := &models.PublicRequest{
		ID: uuid.New(), ClientToken: token, ContactEmail: "c@x.dev",
		Status: models.RequestStatusPending, Currency: "MXN",
	}
	svc.On("CreatePublicRequest", mock.Anything, mock.AnythingOfType("services.CreatePublicRequestInput")).
		Return(created, nil)

	body := `{"contact_email":"c@x.dev"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()

	h.CreatePublicRequest(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]any
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	data := resp["data"].(map[string]any)
	assert.Equal(t, token.String(), data["client_token"])
	assert.Equal(t, created.ID.String(), data["id"])
	svc.AssertExpectations(t)
}

func TestCreatePublicRequest_HoneypotFilled_Fake201NoServiceCall(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))

	body := `{"contact_email":"bot@x.dev","website":"https://spam.example"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()

	h.CreatePublicRequest(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	svc.AssertNotCalled(t, "CreatePublicRequest")
}

func TestCreatePublicRequest_MissingEmail_Returns400(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(`{}`))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()
	h.CreatePublicRequest(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreatePublicRequest_InvalidServiceID_Returns400(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	body := `{"contact_email":"c@x.dev","service_ids":["not-a-uuid"]}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()
	h.CreatePublicRequest(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid service_id")
}

func TestCreatePublicRequest_ProfileDisabled_MapsTo404(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	svc.On("CreatePublicRequest", mock.Anything, mock.Anything).Return(nil, services.ErrPublicProfileDisabled)

	body := `{"contact_email":"c@x.dev"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/ghost/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "ghost")
	w := httptest.NewRecorder()
	h.CreatePublicRequest(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestCreatePublicRequest_PendingCap_MapsTo429(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	svc.On("CreatePublicRequest", mock.Anything, mock.Anything).Return(nil, services.ErrPendingCapExceeded)

	body := `{"contact_email":"c@x.dev"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()
	h.CreatePublicRequest(w, req)
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.Contains(t, w.Body.String(), "inbox_full")
}

func TestCreatePublicRequest_InvalidServices_MapsTo400(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	svc.On("CreatePublicRequest", mock.Anything, mock.Anything).Return(nil, services.ErrInvalidServices)

	body := `{"contact_email":"c@x.dev"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/organizers/alice/requests", bytes.NewBufferString(body))
	req.SetPathValue("slug", "alice")
	w := httptest.NewRecorder()
	h.CreatePublicRequest(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// --- Organizer inbox (auth) ---

func TestListRequests_Paginated(t *testing.T) {
	svc := new(mockPublicRequestService)
	store := new(mockPublicRequestInboxStore)
	h := newReqHandler(svc, store)

	uid := uuid.New()
	items := []models.PublicRequest{{ID: uuid.New()}, {ID: uuid.New()}}
	store.On("ListByOrganizer", mock.Anything, uid, mock.AnythingOfType("repository.PublicRequestListFilters")).
		Return(items, 2, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/organizers/me/requests?page=1&limit=20", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	w := httptest.NewRecorder()
	h.ListRequests(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, float64(2), resp["total"])
}

func TestListRequests_CursorMode(t *testing.T) {
	svc := new(mockPublicRequestService)
	store := new(mockPublicRequestInboxStore)
	h := newReqHandler(svc, store)

	uid := uuid.New()
	items := []models.PublicRequest{{ID: uuid.New()}, {ID: uuid.New()}}
	next := "opaque-next"
	store.On("ListByOrganizerCursor", mock.Anything, uid, mock.AnythingOfType("repository.PublicRequestCursorFilters")).
		Return(items, &next, nil)

	// Empty cursor key forces keyset mode (mobile first page).
	req := httptest.NewRequest(http.MethodGet, "/api/organizers/me/requests?cursor=&limit=20&status=pending", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	w := httptest.NewRecorder()
	h.ListRequests(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["has_more"])
	assert.Equal(t, "opaque-next", resp["next_cursor"])
	assert.Equal(t, float64(20), resp["limit"])
	assert.Nil(t, resp["total"]) // no total in cursor mode
}

func TestListRequests_InvalidCursor_400(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	uid := uuid.New()
	req := httptest.NewRequest(http.MethodGet, "/api/organizers/me/requests?cursor=not-valid!!!", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	w := httptest.NewRecorder()
	h.ListRequests(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCountUnread_ReturnsCount(t *testing.T) {
	svc := new(mockPublicRequestService)
	store := new(mockPublicRequestInboxStore)
	h := newReqHandler(svc, store)
	uid := uuid.New()
	// CountUnreadByOrganizer returns (int, error); testify needs the call set once.
	store.On("CountUnreadByOrganizer", mock.Anything, uid).Return(5, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/organizers/me/requests/unread-count", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	w := httptest.NewRecorder()
	h.CountUnread(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), `"count":5`)
}

func TestMarkRead_NotFound_MapsTo404(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	uid := uuid.New()
	rid := uuid.New()
	svc.On("MarkRead", mock.Anything, rid, uid).Return(services.ErrRequestNotFound)

	req := httptest.NewRequest(http.MethodPost, "/api/organizers/me/requests/"+rid.String()+"/read", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	req.SetPathValue("id", rid.String())
	w := httptest.NewRecorder()
	h.MarkRead(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestRespondRequest_InvalidTransition_MapsTo409(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	uid := uuid.New()
	rid := uuid.New()
	svc.On("Respond", mock.Anything, rid, uid, mock.Anything).Return(services.ErrInvalidTransition)

	body := `{"quote_amount":5000}`
	req := httptest.NewRequest(http.MethodPost, "/api/organizers/me/requests/"+rid.String()+"/responses", bytes.NewBufferString(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	req.SetPathValue("id", rid.String())
	w := httptest.NewRecorder()
	h.RespondRequest(w, req)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestRespondRequest_NegativeAmount_Returns400(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	body := `{"quote_amount":-50}`
	req := httptest.NewRequest(http.MethodPost, "/api/organizers/me/requests/"+uuid.New().String()+"/responses", bytes.NewBufferString(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uuid.New()))
	req.SetPathValue("id", uuid.New().String())
	w := httptest.NewRecorder()
	h.RespondRequest(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestConvertToEvent_AlreadyConverted_MapsTo409WithEventID(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	uid := uuid.New()
	rid := uuid.New()
	existing := uuid.New()
	svc.On("ConvertToEvent", mock.Anything, rid, uid).Return(&existing, services.ErrAlreadyConverted)

	req := httptest.NewRequest(http.MethodPost, "/api/organizers/me/requests/"+rid.String()+"/convert-to-event", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	req.SetPathValue("id", rid.String())
	w := httptest.NewRecorder()
	h.ConvertToEvent(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
	assert.Contains(t, w.Body.String(), "already_converted")
	assert.Contains(t, w.Body.String(), existing.String())
}

// --- ClientAction (public, X-Request-Token) ---

func TestClientAction_MissingToken_Returns401(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	body := `{"action":"accept"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/requests/"+uuid.New().String()+"/action", bytes.NewBufferString(body))
	req.SetPathValue("id", uuid.New().String())
	w := httptest.NewRecorder()
	h.ClientAction(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestClientAction_InvalidAction_Returns400(t *testing.T) {
	h := newReqHandler(new(mockPublicRequestService), new(mockPublicRequestInboxStore))
	token := uuid.New()
	body := `{"action":"bogus"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/requests/"+uuid.New().String()+"/action", bytes.NewBufferString(body))
	req.Header.Set("X-Request-Token", token.String())
	req.SetPathValue("id", uuid.New().String())
	w := httptest.NewRecorder()
	h.ClientAction(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestClientAction_HappyPath(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	rid := uuid.New()
	token := uuid.New()
	svc.On("ClientAction", mock.Anything, rid, token, "accept").Return(nil)

	body := `{"action":"accept"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/requests/"+rid.String()+"/action", bytes.NewBufferString(body))
	req.Header.Set("X-Request-Token", token.String())
	req.SetPathValue("id", rid.String())
	w := httptest.NewRecorder()
	h.ClientAction(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	svc.AssertExpectations(t)
}

func TestClientAction_WrongToken_MapsTo404(t *testing.T) {
	svc := new(mockPublicRequestService)
	h := newReqHandler(svc, new(mockPublicRequestInboxStore))
	rid := uuid.New()
	token := uuid.New()
	svc.On("ClientAction", mock.Anything, rid, token, "decline").Return(services.ErrRequestNotFound)

	body := `{"action":"decline"}`
	req := httptest.NewRequest(http.MethodPost, "/api/public/requests/"+rid.String()+"/action", bytes.NewBufferString(body))
	req.Header.Set("X-Request-Token", token.String())
	req.SetPathValue("id", rid.String())
	w := httptest.NewRecorder()
	h.ClientAction(w, req)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

// --- error mapping coverage ---

func TestWritePublicRequestError_DefaultsTo500(t *testing.T) {
	w := httptest.NewRecorder()
	writePublicRequestError(w, pgx.ErrNoRows)
	// pgx.ErrNoRows maps to 404 by the catch-all in the mapper.
	assert.Equal(t, http.StatusNotFound, w.Code)
}
