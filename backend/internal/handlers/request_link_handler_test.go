package handlers

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/services"
)

type mockRequestLinkRepo struct{ mock.Mock }

func (m *mockRequestLinkRepo) Create(ctx context.Context, link *models.PublicRequestLink) error {
	args := m.Called(ctx, link)
	if args.Error(0) == nil {
		link.ID = uuid.New()
		link.CreatedAt = time.Now().UTC()
		link.UpdatedAt = link.CreatedAt
	}
	return args.Error(0)
}
func (m *mockRequestLinkRepo) GetByToken(ctx context.Context, token string) (*models.PublicRequestLink, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublicRequestLink), args.Error(1)
}
func (m *mockRequestLinkRepo) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicRequestLink, error) {
	args := m.Called(ctx, organizerUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.PublicRequestLink), args.Error(1)
}
func (m *mockRequestLinkRepo) Revoke(ctx context.Context, id, organizerUserID uuid.UUID) error {
	return m.Called(ctx, id, organizerUserID).Error(0)
}
func (m *mockRequestLinkRepo) Delete(ctx context.Context, id, organizerUserID uuid.UUID) error {
	return m.Called(ctx, id, organizerUserID).Error(0)
}
func (m *mockRequestLinkRepo) CountActive(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	args := m.Called(ctx, organizerUserID)
	return args.Int(0), args.Error(1)
}
func (m *mockRequestLinkRepo) GetPool() *pgxpool.Pool { return nil }

type mockRequestLinkSvc struct{ mock.Mock }

func (m *mockRequestLinkSvc) CreateFromLink(ctx context.Context, token string, in services.CreatePublicRequestInput) (*models.PublicRequest, error) {
	args := m.Called(ctx, token, in)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PublicRequest), args.Error(1)
}

type mockRequestLinkUser struct{ mock.Mock }

func (m *mockRequestLinkUser) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func TestGetLinkData_NotFound(t *testing.T) {
	repo := &mockRequestLinkRepo{}
	repo.On("GetByToken", mock.Anything, "missing").Return(nil, pgx.ErrNoRows)
	h := &RequestLinkHandler{linkRepo: repo}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.SetPathValue("token", "missing")
	rr := httptest.NewRecorder()
	h.GetLinkData(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetLinkData_Expired_410(t *testing.T) {
	past := time.Now().UTC().Add(-time.Hour)
	repo := &mockRequestLinkRepo{}
	repo.On("GetByToken", mock.Anything, "tok").Return(&models.PublicRequestLink{
		ID: uuid.New(), Status: models.PublicRequestLinkActive, ExpiresAt: &past,
		SubmitMode: models.SubmitModeStandard, OrganizerUserID: uuid.New(),
	}, nil)
	h := &RequestLinkHandler{linkRepo: repo}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.SetPathValue("token", "tok")
	rr := httptest.NewRecorder()
	h.GetLinkData(rr, req)
	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "link_invalid")
}

func TestSubmitLinkRequest_Honeypot(t *testing.T) {
	h := &RequestLinkHandler{}
	body := `{"contact_email":"a@b.com","website":"http://spam"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("token", "tok")
	rr := httptest.NewRecorder()
	h.SubmitLinkRequest(rr, req)
	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestSubmitLinkRequest_LinkInvalid_410(t *testing.T) {
	svc := &mockRequestLinkSvc{}
	svc.On("CreateFromLink", mock.Anything, "tok", mock.Anything).Return(nil, services.ErrLinkInvalid)
	h := &RequestLinkHandler{svc: svc}
	body := `{"contact_email":"a@b.com"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("token", "tok")
	rr := httptest.NewRecorder()
	h.SubmitLinkRequest(rr, req)
	assert.Equal(t, http.StatusGone, rr.Code)
}

func TestSubmitLinkRequest_AutoEvent_201(t *testing.T) {
	svc := &mockRequestLinkSvc{}
	eid := uuid.New()
	created := &models.PublicRequest{
		ID: uuid.New(), ClientToken: uuid.New(), ContactEmail: "a@b.com",
		Status: models.RequestStatusBooked, Source: models.RequestSourceSharedLink,
		SubmitMode: models.SubmitModeAutoEvent, EventID: &eid, Currency: "MXN",
		Services: []models.PublicRequestServiceSnapshot{},
	}
	svc.On("CreateFromLink", mock.Anything, "tok", mock.Anything).Return(created, nil)
	h := &RequestLinkHandler{svc: svc}
	body := `{"contact_name":"Ana","contact_phone":"+52","contact_email":"a@b.com","event_date":"2026-11-20","event_type":"Boda","guest_count":80}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("token", "tok")
	rr := httptest.NewRecorder()
	h.SubmitLinkRequest(rr, req)
	require.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), eid.String())
	assert.Contains(t, rr.Body.String(), "booked")
}

func TestSubmitLinkRequest_EmptyServicesOK(t *testing.T) {
	svc := &mockRequestLinkSvc{}
	created := &models.PublicRequest{
		ID: uuid.New(), ClientToken: uuid.New(), ContactEmail: "a@b.com",
		Status: models.RequestStatusPending, Source: models.RequestSourceSharedLink,
		SubmitMode: models.SubmitModeStandard, Currency: "MXN",
		Services: []models.PublicRequestServiceSnapshot{},
	}
	svc.On("CreateFromLink", mock.Anything, "tok", mock.MatchedBy(func(in services.CreatePublicRequestInput) bool {
		return len(in.Services) == 0 && len(in.ServiceIDs) == 0
	})).Return(created, nil)
	h := &RequestLinkHandler{svc: svc}
	body := `{"contact_email":"a@b.com","contact_name":"Ana"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("token", "tok")
	rr := httptest.NewRecorder()
	h.SubmitLinkRequest(rr, req)
	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestGenerateLink_PlanLimit(t *testing.T) {
	uid := uuid.New()
	repo := &mockRequestLinkRepo{}
	repo.On("CountActive", mock.Anything, uid).Return(3, nil)
	user := &mockRequestLinkUser{}
	user.On("GetByID", mock.Anything, uid).Return(&models.User{ID: uid, Plan: "basic"}, nil)

	h := &RequestLinkHandler{
		linkRepo:    repo,
		userRepo:    user,
		frontendURL: "https://app.test",
		pool:        nil,
	}

	body := `{"label":"XV"}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)
	assert.True(t, rr.Code == http.StatusForbidden || rr.Code == http.StatusPaymentRequired || rr.Code == 402,
		"expected plan limit status, got %d body=%s", rr.Code, rr.Body.String())
}

func TestGenerateLink_Pro_Creates(t *testing.T) {
	uid := uuid.New()
	repo := &mockRequestLinkRepo{}
	repo.On("Create", mock.Anything, mock.AnythingOfType("*models.PublicRequestLink")).Return(nil)
	user := &mockRequestLinkUser{}
	user.On("GetByID", mock.Anything, uid).Return(&models.User{ID: uid, Plan: "pro"}, nil)

	h := &RequestLinkHandler{
		linkRepo:    repo,
		userRepo:    user,
		frontendURL: "https://app.test",
		pool:        nil,
	}

	body := `{"label":"Paquete","submit_mode":"standard","max_uses":1}`
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, uid))
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)
	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "/s/")
}
