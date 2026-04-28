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

// newPublicLinkHandler is a test factory that wires all required repos.
func newPublicLinkHandler(
	lr *MockEventPublicLinkRepo,
	er *MockFullEventRepo,
	cr *MockClientRepo,
	ur *MockFullUserRepo,
	pr *MockFullPaymentRepo,
) *EventPublicLinkHandler {
	return NewEventPublicLinkHandler(lr, er, cr, ur, pr, "https://app.example.com")
}

// activePublicLink returns a valid "active" EventPublicLink with no expiry.
func activePublicLink(eventID, userID uuid.UUID) *models.EventPublicLink {
	return &models.EventPublicLink{
		ID:      uuid.New(),
		EventID: eventID,
		UserID:  userID,
		Token:   "portaltoken",
		Status:  "active",
	}
}

// ---------------------------------------------------------------------------
// CreateOrRotate (authenticated)
// ---------------------------------------------------------------------------

func TestCreateOrRotate_Success_Returns201(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)
	linkRepo.On("Create", mock.Anything, mock.MatchedBy(func(l *models.EventPublicLink) bool {
		return l.EventID == eventID && l.UserID == userID
	})).Return(nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/public-link", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	var resp models.EventPublicLink
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Contains(t, resp.URL, "/client/")
	linkRepo.AssertExpectations(t)
	eventRepo.AssertExpectations(t)
}

func TestCreateOrRotate_InvalidEventID_Returns400(t *testing.T) {
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/bad/public-link", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Invalid event id")
}

func TestCreateOrRotate_EventNotFound_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, pgx.ErrNoRows)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/public-link", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Event not found")
	eventRepo.AssertExpectations(t)
}

func TestCreateOrRotate_TTLTooLow_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/public-link",
		`{"ttl_days":0}`, eventID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "ttl_days must be between 1 and 730")
}

func TestCreateOrRotate_TTLTooHigh_Returns400(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/public-link",
		`{"ttl_days":731}`, eventID.String(), userID)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "ttl_days must be between 1 and 730")
}

func TestCreateOrRotate_LinkRepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)
	linkRepo.On("Create", mock.Anything, mock.Anything).Return(errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.CreateOrRotate(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to create public link")
}

// ---------------------------------------------------------------------------
// GetActive (authenticated)
// ---------------------------------------------------------------------------

func TestGetActive_Success(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	linkRepo.On("GetActiveByEventID", mock.Anything, eventID, userID).Return(link, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetActive(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "portaltoken")
	assert.Contains(t, rr.Body.String(), "https://app.example.com")
	linkRepo.AssertExpectations(t)
}

func TestGetActive_InvalidEventID_Returns400(t *testing.T) {
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/bad/public-link", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.GetActive(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetActive_NoActiveLink_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("GetActiveByEventID", mock.Anything, eventID, userID).Return(nil, pgx.ErrNoRows)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetActive(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "No active public link")
	linkRepo.AssertExpectations(t)
}

func TestGetActive_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("GetActiveByEventID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetActive(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to get public link")
}

// ---------------------------------------------------------------------------
// Revoke (authenticated)
// ---------------------------------------------------------------------------

func TestRevoke_Success_Returns204(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("Revoke", mock.Anything, eventID, userID).Return(nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.Revoke(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	linkRepo.AssertExpectations(t)
}

func TestRevoke_InvalidEventID_Returns400(t *testing.T) {
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/events/bad/public-link", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.Revoke(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestRevoke_NoActiveLink_Returns404(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("Revoke", mock.Anything, eventID, userID).Return(pgx.ErrNoRows)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.Revoke(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "No active public link to revoke")
	linkRepo.AssertExpectations(t)
}

func TestRevoke_RepoError_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("Revoke", mock.Anything, eventID, userID).Return(errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makeReqWithIDParam(http.MethodDelete, "/api/events/"+eventID.String()+"/public-link",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.Revoke(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to revoke public link")
}

// ---------------------------------------------------------------------------
// GetPortalData (public — no auth)
// ---------------------------------------------------------------------------

func TestGetPortalData_Success_FullResponseShape(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()

	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	biz := "Eventos Divinos"
	link := activePublicLink(eventID, userID)
	event := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ClientID:    clientID,
		ServiceType: "Boda",
		EventDate:   "2026-12-01",
		NumPeople:   150,
		Status:      "confirmed",
		TotalAmount: 50000,
	}
	organizer := &models.User{ID: userID, BusinessName: &biz}
	client := &models.Client{ID: clientID, UserID: userID, Name: "María López"}
	payments := []models.Payment{
		{ID: uuid.New(), UserID: userID, EventID: eventID, Amount: 15000},
		{ID: uuid.New(), UserID: userID, EventID: eventID, Amount: 10000},
	}

	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(organizer, nil)
	clientRepo.On("GetByID", mock.Anything, clientID, userID).Return(client, nil)
	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return(payments, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp PublicEventView
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "Boda", resp.Event.ServiceType)
	assert.Equal(t, "2026-12-01", resp.Event.EventDate)
	assert.Equal(t, "Eventos Divinos", *resp.Organizer.BusinessName)
	assert.Equal(t, "María López", resp.Client.Name)
	assert.Equal(t, float64(50000), resp.Payment.Total)
	assert.Equal(t, float64(25000), resp.Payment.Paid)
	assert.Equal(t, float64(25000), resp.Payment.Remaining)
	assert.Equal(t, "MXN", resp.Payment.Currency)

	linkRepo.AssertExpectations(t)
	eventRepo.AssertExpectations(t)
	userRepo.AssertExpectations(t)
	clientRepo.AssertExpectations(t)
	paymentRepo.AssertExpectations(t)
}

func TestGetPortalData_LinkNotFound_Returns404(t *testing.T) {
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("GetByToken", mock.Anything, "notoken").Return(nil, pgx.ErrNoRows)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/notoken", "notoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Link not found")
}

func TestGetPortalData_LinkRepoError_Returns500(t *testing.T) {
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	linkRepo.On("GetByToken", mock.Anything, "tok").Return(nil, errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/tok", "tok", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

func TestGetPortalData_RevokedLink_Returns410(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	revokedLink := &models.EventPublicLink{
		ID:      uuid.New(),
		EventID: eventID,
		UserID:  userID,
		Token:   "revokedtoken",
		Status:  "revoked",
	}
	linkRepo.On("GetByToken", mock.Anything, "revokedtoken").Return(revokedLink, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/revokedtoken", "revokedtoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "no longer active")
}

func TestGetPortalData_ExpiredLink_Returns410(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	past := time.Now().Add(-1 * time.Hour)
	expiredLink := &models.EventPublicLink{
		ID:        uuid.New(),
		EventID:   eventID,
		UserID:    userID,
		Token:     "expiredtoken",
		Status:    "active",
		ExpiresAt: &past,
	}
	linkRepo.On("GetByToken", mock.Anything, "expiredtoken").Return(expiredLink, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/expiredtoken", "expiredtoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "expired")
}

func TestGetPortalData_OrphanedEvent_Returns410(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)
	// The handler calls Revoke on orphaned events; stub it as no-op.
	linkRepo.On("Revoke", mock.Anything, eventID, userID).Return(nil).Maybe()

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusGone, rr.Code)
	assert.Contains(t, rr.Body.String(), "no longer exists")
}

func TestGetPortalData_OrganizerNotFound_Returns500(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	event := &models.Event{ID: eventID, UserID: userID, ServiceType: "Boda", EventDate: "2026-12-01", TotalAmount: 0}

	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(nil, errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusInternalServerError, rr.Code)
	assert.Contains(t, rr.Body.String(), "Failed to load organizer")
}

// When the event has no client (ClientID == uuid.Nil) the portal still works;
// the client name is empty.
func TestGetPortalData_NoClient_Returns200WithEmptyClientName(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	event := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ClientID:    uuid.Nil, // no client
		ServiceType: "Corporativo",
		EventDate:   "2026-11-15",
		TotalAmount: 0,
	}
	organizer := &models.User{ID: userID}

	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(organizer, nil)
	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return([]models.Payment{}, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp PublicEventView
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, "", resp.Client.Name)
}

// Remaining must never be negative even if payments exceed total.
func TestGetPortalData_PaymentExceedsTotal_RemainingIsZero(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	event := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ServiceType: "Boda",
		EventDate:   "2026-12-01",
		TotalAmount: 1000,
	}
	organizer := &models.User{ID: userID}
	payments := []models.Payment{
		{ID: uuid.New(), UserID: userID, EventID: eventID, Amount: 1500},
	}

	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(organizer, nil)
	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return(payments, nil)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp PublicEventView
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, float64(0), resp.Payment.Remaining)
}

// Payment load failure is non-fatal; portal still returns 200 with Paid=0.
func TestGetPortalData_PaymentRepoError_FallsBackToZero(t *testing.T) {
	userID := uuid.New()
	eventID := uuid.New()
	linkRepo := new(MockEventPublicLinkRepo)
	eventRepo := new(MockFullEventRepo)
	clientRepo := new(MockClientRepo)
	userRepo := new(MockFullUserRepo)
	paymentRepo := new(MockFullPaymentRepo)

	link := activePublicLink(eventID, userID)
	event := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ServiceType: "Boda",
		EventDate:   "2026-12-01",
		TotalAmount: 20000,
	}
	organizer := &models.User{ID: userID}

	linkRepo.On("GetByToken", mock.Anything, "portaltoken").Return(link, nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	userRepo.On("GetByID", mock.Anything, userID).Return(organizer, nil)
	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return(nil, errTest)

	h := newPublicLinkHandler(linkRepo, eventRepo, clientRepo, userRepo, paymentRepo)
	req := makePublicReqWithTokenParam(http.MethodGet, "/api/public/events/portaltoken", "portaltoken", "")
	rr := httptest.NewRecorder()
	h.GetPortalData(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var resp PublicEventView
	assert.NoError(t, json.Unmarshal(rr.Body.Bytes(), &resp))
	assert.Equal(t, float64(0), resp.Payment.Paid)
	assert.Equal(t, float64(20000), resp.Payment.Remaining)
}
