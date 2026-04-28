package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// newEventFormHandler is a test factory that omits the pool (nil) so all
// tests that exercise code paths before pool.Begin are safe.
func newEventFormHandler(lr *MockEventFormLinkRepo, pr *MockProductRepo, ur *MockFullUserRepo) *EventFormHandler {
	return NewEventFormHandler(lr, pr, ur, "https://app.example.com", nil)
}

// activeLink returns a link in "active" status with an expiry far in the
// future, owned by the given userID.
func activeLink(userID uuid.UUID) *models.EventFormLink {
	exp := time.Now().Add(24 * time.Hour)
	return &models.EventFormLink{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     "validtoken",
		Status:    "active",
		ExpiresAt: exp,
	}
}

// ---------------------------------------------------------------------------
// GenerateLink (authenticated)
// ---------------------------------------------------------------------------

func TestGenerateLink_Success_ProUser(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	linkRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", `{"ttl_days":7}`, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var resp models.EventFormLink
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Contains(t, resp.URL, "/form/")
	linkRepo.AssertExpectations(t)
	userRepo.AssertExpectations(t)
}

func TestGenerateLink_Success_EmptyBody_DefaultTTL(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	linkRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

func TestGenerateLink_TTLTooLow_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", `{"ttl_days":0}`, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "ttl_days must be between 1 and 30")
}

func TestGenerateLink_TTLTooHigh_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", `{"ttl_days":31}`, userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "ttl_days must be between 1 and 30")
}

func TestGenerateLink_UserRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to get user")
	userRepo.AssertExpectations(t)
}

func TestGenerateLink_BasicUserAtLimit_Returns429(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	linkRepo.On("CountActiveByUserID", mock.Anything, userID).Return(3, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
	userRepo.AssertExpectations(t)
	linkRepo.AssertExpectations(t)
}

func TestGenerateLink_BasicUserUnderLimit_Returns201(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	linkRepo.On("CountActiveByUserID", mock.Anything, userID).Return(2, nil)
	linkRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	userRepo.AssertExpectations(t)
	linkRepo.AssertExpectations(t)
}

func TestGenerateLink_CountError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "basic"}, nil)
	linkRepo.On("CountActiveByUserID", mock.Anything, userID).Return(0, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to check link limits")
}

func TestGenerateLink_CreateError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, Plan: "pro"}, nil)
	linkRepo.On("Create", mock.Anything, mock.Anything).Return(errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodPost, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.GenerateLink(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create link")
}

// ---------------------------------------------------------------------------
// ListLinks (authenticated)
// ---------------------------------------------------------------------------

func TestListLinks_Success(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	links := []models.EventFormLink{
		{ID: uuid.New(), UserID: userID, Token: "abc123", Status: "active", ExpiresAt: time.Now().Add(time.Hour)},
	}
	linkRepo.On("GetByUserID", mock.Anything, userID).Return(links, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.ListLinks(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "abc123")
	linkRepo.AssertExpectations(t)
}

func TestListLinks_Empty_Returns200(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByUserID", mock.Anything, userID).Return([]models.EventFormLink{}, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.ListLinks(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestListLinks_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByUserID", mock.Anything, userID).Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.ListLinks(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to list links")
}

// URLs are computed and appended to each link.
func TestListLinks_URLComputedPerLink(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	links := []models.EventFormLink{
		{ID: uuid.New(), UserID: userID, Token: "tokenXYZ", Status: "active", ExpiresAt: time.Now().Add(time.Hour)},
	}
	linkRepo.On("GetByUserID", mock.Anything, userID).Return(links, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/event-forms", "", userID)
	rr := httptest.NewRecorder()
	h.ListLinks(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	// URL must include the token and the frontend base.
	assert.Contains(t, rr.Body.String(), "tokenXYZ")
	assert.Contains(t, rr.Body.String(), "https://app.example.com")
}

// ---------------------------------------------------------------------------
// DeleteLink (authenticated)
// ---------------------------------------------------------------------------

func TestDeleteLink_Success_Returns204(t *testing.T) {
	userID := uuid.New()
	linkID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("Delete", mock.Anything, linkID, userID).Return(nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/event-forms/"+linkID.String(), "", linkID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteLink(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	linkRepo.AssertExpectations(t)
}

func TestDeleteLink_InvalidUUID_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/event-forms/bad", "", "bad", userID)
	rr := httptest.NewRecorder()
	h.DeleteLink(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid link ID")
}

func TestDeleteLink_NotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	linkID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("Delete", mock.Anything, linkID, userID).Return(pgx.ErrNoRows)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/event-forms/"+linkID.String(), "", linkID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteLink(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Link not found")
	linkRepo.AssertExpectations(t)
}

func TestDeleteLink_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("Delete", mock.Anything, linkID, userID).Return(errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/event-forms/"+linkID.String(), "", linkID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteLink(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to delete link")
}

// ---------------------------------------------------------------------------
// GetFormData (public — no auth)
// ---------------------------------------------------------------------------

func TestGetFormData_Success(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	biz := "Eventos del Norte"
	products := []models.Product{
		{ID: uuid.New(), UserID: userID, Name: "Taquiza", Category: "Catering", IsActive: true, BasePrice: 500},
	}

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID, BusinessName: &biz}, nil)
	productRepo.On("GetAll", mock.Anything, userID).Return(products, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/validtoken", "validtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Taquiza")
	assert.Contains(t, rr.Body.String(), "Eventos del Norte")
	// Price must NOT be exposed on the public form endpoint.
	assert.NotContains(t, rr.Body.String(), "500")
	linkRepo.AssertExpectations(t)
	userRepo.AssertExpectations(t)
	productRepo.AssertExpectations(t)
}

func TestGetFormData_LinkNotFound_Returns404(t *testing.T) {
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "unknown").Return(nil, pgx.ErrNoRows)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/unknown", "unknown", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Link not found")
}

func TestGetFormData_RepoError_Returns500(t *testing.T) {
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "tok").Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/tok", "tok", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetFormData_ExpiredLink_Returns410(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	expiredLink := &models.EventFormLink{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     "expiredtoken",
		Status:    "active",
		ExpiresAt: time.Now().Add(-1 * time.Hour), // past
	}
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "expiredtoken").Return(expiredLink, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/expiredtoken", "expiredtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "link_invalid")
}

func TestGetFormData_UsedLink_Returns410(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	usedLink := &models.EventFormLink{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     "usedtoken",
		Status:    "used", // not "active"
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "usedtoken").Return(usedLink, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/usedtoken", "usedtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "link_invalid")
}

func TestGetFormData_OrganizerError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/validtoken", "validtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetFormData_ProductRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID}, nil)
	productRepo.On("GetAll", mock.Anything, userID).Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/validtoken", "validtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetFormData_InactiveProductsFiltered(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	products := []models.Product{
		{ID: uuid.New(), UserID: userID, Name: "Active Product", Category: "A", IsActive: true},
		{ID: uuid.New(), UserID: userID, Name: "Inactive Product", Category: "B", IsActive: false},
	}

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(&models.User{ID: userID}, nil)
	productRepo.On("GetAll", mock.Anything, userID).Return(products, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/event-forms/validtoken", "validtoken", "")
	rr := httptest.NewRecorder()
	h.GetFormData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "Active Product")
	assert.NotContains(t, rr.Body.String(), "Inactive Product")
}

// ---------------------------------------------------------------------------
// SubmitForm (public — no auth, pre-transaction paths)
// ---------------------------------------------------------------------------

func TestSubmitForm_LinkNotFound_Returns404(t *testing.T) {
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "notoken").Return(nil, pgx.ErrNoRows)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/notoken", "notoken", "{}")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Link not found")
}

func TestSubmitForm_RepoError_Returns500(t *testing.T) {
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "tok").Return(nil, errTest)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/tok", "tok", "{}")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestSubmitForm_ExpiredToken_Returns410(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	expiredLink := &models.EventFormLink{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     "expiredtoken",
		Status:    "active",
		ExpiresAt: time.Now().Add(-1 * time.Hour),
	}
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "expiredtoken").Return(expiredLink, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/expiredtoken", "expiredtoken", "{}")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "link_invalid")
}

func TestSubmitForm_UsedToken_Returns410(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	usedLink := &models.EventFormLink{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     "usedtoken",
		Status:    "used",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "usedtoken").Return(usedLink, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/usedtoken", "usedtoken", "{}")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "link_invalid")
}

func TestSubmitForm_InvalidJSON_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", `{bad json`)
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid request body")
}

func TestSubmitForm_MissingClientName_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"","client_phone":"5551234567","event_date":"2026-12-01","service_type":"Boda","num_people":100}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "client_name")
}

func TestSubmitForm_MissingPhone_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"","event_date":"2026-12-01","service_type":"Boda","num_people":100}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "client_phone")
}

func TestSubmitForm_MissingEventDate_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"5551234567","event_date":"","service_type":"Boda","num_people":100}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "event_date")
}

func TestSubmitForm_InvalidDateFormat_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"5551234567","event_date":"01/12/2026","service_type":"Boda","num_people":100}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "event_date")
}

func TestSubmitForm_MissingServiceType_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"5551234567","event_date":"2026-12-01","service_type":"","num_people":100}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "service_type")
}

func TestSubmitForm_NumPeopleZero_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"5551234567","event_date":"2026-12-01","service_type":"Boda","num_people":0}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "num_people")
}

func TestSubmitForm_InvalidProductUUID_Returns400(t *testing.T) {
	userID := uuid.New()
	linkRepo := new(MockEventFormLinkRepo)
	userRepo := new(MockFullUserRepo)
	productRepo := new(MockProductRepo)

	link := activeLink(userID)
	linkRepo.On("GetByTokenUnfiltered", mock.Anything, "validtoken").Return(link, nil)

	body := `{"client_name":"Ana","client_phone":"5551234567","event_date":"2026-12-01","service_type":"Boda","num_people":50,"products":[{"product_id":"not-a-uuid","quantity":1}]}`
	h := newEventFormHandler(linkRepo, productRepo, userRepo)
	req := makePublicReqWithTokenParam(http.MethodPost, "/api/public/event-forms/validtoken", "validtoken", body)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.SubmitForm(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid product ID")
}
