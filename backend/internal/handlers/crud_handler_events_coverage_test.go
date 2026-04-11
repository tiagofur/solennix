package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stripe/stripe-go/v81"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
	"github.com/tiagofur/solennix-backend/internal/services"
)

// eventCoverageHandler wires the minimal set of mocks needed for the event
// coverage tests below. It is intentionally lighter than newTestHandler so
// every test case owns its mock expectations.
func eventCoverageHandler(eventRepo *MockFullEventRepo) *CRUDHandler {
	udr := new(MockUnavailableDateRepo)
	udr.On("GetByDateRange", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return([]models.UnavailableDate{}, nil).Maybe()
	return NewCRUDHandler(
		new(MockClientRepo),
		eventRepo,
		new(MockProductRepo),
		new(MockInventoryRepo),
		new(MockFullPaymentRepo),
		new(MockFullUserRepo),
		udr,
	)
}

// ---------------------------------------------------------------------------
// Setters — trivial but previously uncovered
// ---------------------------------------------------------------------------

type stubNotifier struct{}

func (stubNotifier) SendPaymentReceived(context.Context, uuid.UUID, uuid.UUID, float64) error {
	return nil
}
func (stubNotifier) SendEventConfirmed(context.Context, uuid.UUID, models.Event) error {
	return nil
}

type stubLiveActivityNotifier struct{}

func (stubLiveActivityNotifier) PushUpdate(context.Context, uuid.UUID, services.LiveActivityContentState) error {
	return nil
}

func TestCRUDHandler_Setters(t *testing.T) {
	h := &CRUDHandler{}

	h.SetNotifier(stubNotifier{})
	assert.NotNil(t, h.notifier)

	h.SetEmailService(&services.EmailService{})
	assert.NotNil(t, h.emailService)

	h.SetLiveActivityNotifier(stubLiveActivityNotifier{})
	assert.NotNil(t, h.liveActivitySvc)
}

// ---------------------------------------------------------------------------
// parseEventPhotos — direct unit test
// ---------------------------------------------------------------------------

func TestParseEventPhotos(t *testing.T) {
	t.Run("nil pointer returns empty slice", func(t *testing.T) {
		got := parseEventPhotos(nil)
		assert.Equal(t, []models.EventPhoto{}, got)
	})

	t.Run("empty string returns empty slice", func(t *testing.T) {
		empty := ""
		got := parseEventPhotos(&empty)
		assert.Equal(t, []models.EventPhoto{}, got)
	})

	t.Run("literal null string returns empty slice", func(t *testing.T) {
		nullStr := "null"
		got := parseEventPhotos(&nullStr)
		assert.Equal(t, []models.EventPhoto{}, got)
	})

	t.Run("invalid JSON returns empty slice", func(t *testing.T) {
		bad := "not-json"
		got := parseEventPhotos(&bad)
		assert.Equal(t, []models.EventPhoto{}, got)
	})

	t.Run("valid JSON returns parsed photos", func(t *testing.T) {
		raw := `[{"id":"11111111-1111-1111-1111-111111111111","url":"https://x","created_at":"2026-01-01T00:00:00Z"}]`
		got := parseEventPhotos(&raw)
		assert.Len(t, got, 1)
		assert.Equal(t, "https://x", got[0].URL)
	})
}

// ---------------------------------------------------------------------------
// parseEventStartTime — direct unit test
// ---------------------------------------------------------------------------

func TestParseEventStartTime(t *testing.T) {
	t.Run("date + HH:MM start_time", func(t *testing.T) {
		st := "14:30"
		got := parseEventStartTime("2026-06-15", &st)
		assert.Equal(t, 14, got.Hour())
		assert.Equal(t, 30, got.Minute())
	})

	t.Run("date + HH:MM:SS truncates to HH:MM", func(t *testing.T) {
		st := "09:15:45"
		got := parseEventStartTime("2026-06-15", &st)
		assert.Equal(t, 9, got.Hour())
		assert.Equal(t, 15, got.Minute())
	})

	t.Run("RFC3339 date is accepted", func(t *testing.T) {
		st := "18:00"
		got := parseEventStartTime("2026-06-15T00:00:00Z", &st)
		assert.Equal(t, 18, got.Hour())
	})

	t.Run("nil start_time defaults to 09:00", func(t *testing.T) {
		got := parseEventStartTime("2026-06-15", nil)
		assert.Equal(t, 9, got.Hour())
	})

	t.Run("invalid date falls back to now", func(t *testing.T) {
		// "not-a-date" fails parsing → returns time.Now() which should be valid
		got := parseEventStartTime("not-a-date", nil)
		assert.False(t, got.IsZero())
	})
}

// ---------------------------------------------------------------------------
// GetEventPhotos
// ---------------------------------------------------------------------------

func TestGetEventPhotos_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()

	photosJSON := `[{"id":"22222222-2222-2222-2222-222222222222","url":"https://img/1","created_at":"2026-01-01T00:00:00Z"}]`
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID, Photos: &photosJSON}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/photos", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventPhotos(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "https://img/1")
}

func TestGetEventPhotos_InvalidEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithIDParam(http.MethodGet, "/api/events/bad/photos", "", "not-a-uuid", uuid.New())
	rr := httptest.NewRecorder()
	h.GetEventPhotos(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetEventPhotos_EventNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/photos", "", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventPhotos(rr, req)

	assert.Equal(t, http.StatusNotFound, rr.Code)
}

// ---------------------------------------------------------------------------
// AddEventPhoto
// ---------------------------------------------------------------------------

func TestAddEventPhoto_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()

	existing := &models.Event{ID: eventID, UserID: userID}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.MatchedBy(func(e *models.Event) bool {
		return e.Photos != nil && strings.Contains(*e.Photos, "https://photo")
	})).Return(nil)

	h := eventCoverageHandler(eventRepo)
	body := `{"url":"https://photo","caption":"nice"}`
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/photos", body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
	assert.Contains(t, rr.Body.String(), "https://photo")
}

func TestAddEventPhoto_InvalidEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithIDParam(http.MethodPost, "/api/events/bad/photos", `{"url":"x"}`, "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestAddEventPhoto_EventNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/photos",
		`{"url":"x"}`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestAddEventPhoto_InvalidBody(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/photos",
		`{malformed`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestAddEventPhoto_EmptyURL(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/photos",
		`{"url":""}`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "url is required")
}

func TestAddEventPhoto_UpdateFails(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPost, "/api/events/"+eventID.String()+"/photos",
		`{"url":"https://ok"}`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.AddEventPhoto(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// DeleteEventPhoto
// ---------------------------------------------------------------------------

// twoParamsReq builds a request with both "id" and "photoId" chi params + userID.
func twoParamsReq(method, path, body, eventID, photoID string, userID uuid.UUID) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("id", eventID)
	routeCtx.URLParams.Add("photoId", photoID)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx)
	ctx = context.WithValue(ctx, middleware.UserIDKey, userID)
	return req.WithContext(ctx)
}

func TestDeleteEventPhoto_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	photoID := uuid.New()

	photosJSON := fmt.Sprintf(`[{"id":"%s","url":"x","created_at":"2026-01-01T00:00:00Z"}]`, photoID)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID, Photos: &photosJSON}, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	h := eventCoverageHandler(eventRepo)
	req := twoParamsReq(http.MethodDelete, "/api/events/"+eventID.String()+"/photos/"+photoID.String(),
		"", eventID.String(), photoID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestDeleteEventPhoto_InvalidEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := twoParamsReq(http.MethodDelete, "/api/events/bad/photos/also-bad", "", "bad", "also-bad", uuid.New())
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeleteEventPhoto_InvalidPhotoID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	eventID := uuid.New()
	req := twoParamsReq(http.MethodDelete, "/api/events/"+eventID.String()+"/photos/bad",
		"", eventID.String(), "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestDeleteEventPhoto_EventNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	photoID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := twoParamsReq(http.MethodDelete, "/api/events/"+eventID.String()+"/photos/"+photoID.String(),
		"", eventID.String(), photoID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestDeleteEventPhoto_PhotoNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	missingID := uuid.New()

	photosJSON := `[{"id":"11111111-1111-1111-1111-111111111111","url":"x","created_at":"2026-01-01T00:00:00Z"}]`
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID, Photos: &photosJSON}, nil)

	h := eventCoverageHandler(eventRepo)
	req := twoParamsReq(http.MethodDelete, "/api/events/"+eventID.String()+"/photos/"+missingID.String(),
		"", eventID.String(), missingID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
	assert.Contains(t, rr.Body.String(), "Photo not found")
}

func TestDeleteEventPhoto_UpdateFails(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	photoID := uuid.New()

	photosJSON := fmt.Sprintf(`[{"id":"%s","url":"x","created_at":"2026-01-01T00:00:00Z"}]`, photoID)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID, Photos: &photosJSON}, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(errTest)

	h := eventCoverageHandler(eventRepo)
	req := twoParamsReq(http.MethodDelete, "/api/events/"+eventID.String()+"/photos/"+photoID.String(),
		"", eventID.String(), photoID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeleteEventPhoto(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// GetEventSupplies
// ---------------------------------------------------------------------------

func TestGetEventSupplies_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()

	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)
	eventRepo.On("GetSupplies", mock.Anything, eventID).
		Return([]models.EventSupply{{EventID: eventID, InventoryID: uuid.New(), Quantity: 3}}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/supplies",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventSupplies(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetEventSupplies_InvalidEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithIDParam(http.MethodGet, "/api/events/bad/supplies", "", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.GetEventSupplies(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetEventSupplies_EventNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/supplies",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventSupplies(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestGetEventSupplies_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID}, nil)
	eventRepo.On("GetSupplies", mock.Anything, eventID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodGet, "/api/events/"+eventID.String()+"/supplies",
		"", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.GetEventSupplies(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// GetSupplySuggestions (POST variant)
// ---------------------------------------------------------------------------

func TestGetSupplySuggestions_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	productID := uuid.New()

	eventRepo.On("GetSupplySuggestionsFromProducts", mock.Anything, userID,
		mock.MatchedBy(func(pqs []repository.ProductQuantity) bool {
			return len(pqs) == 1 && pqs[0].ID == productID && pqs[0].Quantity == 2
		})).Return([]models.SupplySuggestion{{ID: uuid.New(), IngredientName: "tomato", SuggestedQty: 4}}, nil)

	h := eventCoverageHandler(eventRepo)
	body := fmt.Sprintf(`{"products":[{"product_id":"%s","quantity":2}]}`, productID)
	req := makeReqWithUserID(http.MethodPost, "/api/events/supplies/suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetSupplySuggestions(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetSupplySuggestions_InvalidBody(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodPost, "/api/events/supplies/suggestions", `{bad`, uuid.New())
	rr := httptest.NewRecorder()
	h.GetSupplySuggestions(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetSupplySuggestions_EmptyProductsReturnsEmpty(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodPost, "/api/events/supplies/suggestions",
		`{"products":[]}`, uuid.New())
	rr := httptest.NewRecorder()
	h.GetSupplySuggestions(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "[]")
}

func TestGetSupplySuggestions_BadProductUUID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodPost, "/api/events/supplies/suggestions",
		`{"products":[{"product_id":"not-a-uuid","quantity":1}]}`, uuid.New())
	rr := httptest.NewRecorder()
	h.GetSupplySuggestions(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetSupplySuggestions_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventRepo.On("GetSupplySuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	productID := uuid.New()
	body := fmt.Sprintf(`{"products":[{"product_id":"%s","quantity":1}]}`, productID)
	req := makeReqWithUserID(http.MethodPost, "/api/events/supplies/suggestions", body, userID)
	rr := httptest.NewRecorder()
	h.GetSupplySuggestions(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// GetSupplySuggestionsGET (query-string variant)
// ---------------------------------------------------------------------------

func TestGetSupplySuggestionsGET_Empty(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/supplies/suggestions", "", uuid.New())
	rr := httptest.NewRecorder()
	h.GetSupplySuggestionsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "[]")
}

func TestGetSupplySuggestionsGET_BadUUID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/supplies/suggestions?product_ids=bad", "", uuid.New())
	rr := httptest.NewRecorder()
	h.GetSupplySuggestionsGET(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetSupplySuggestionsGET_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	productID := uuid.New()

	eventRepo.On("GetSupplySuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return([]models.SupplySuggestion{}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/supplies/suggestions?product_ids="+productID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.GetSupplySuggestionsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetSupplySuggestionsGET_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	productID := uuid.New()
	eventRepo.On("GetSupplySuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/supplies/suggestions?product_ids="+productID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.GetSupplySuggestionsGET(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// GetEquipmentSuggestionsGET (query-string variant)
// ---------------------------------------------------------------------------

func TestGetEquipmentSuggestionsGET_Empty(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/equipment/suggestions", "", uuid.New())
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestionsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "[]")
}

func TestGetEquipmentSuggestionsGET_BadUUID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/suggestions?product_ids=bad", "", uuid.New())
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestionsGET(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestGetEquipmentSuggestionsGET_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	productID := uuid.New()
	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return([]models.EquipmentSuggestion{}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/suggestions?product_ids="+productID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestionsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestGetEquipmentSuggestionsGET_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	productID := uuid.New()
	eventRepo.On("GetEquipmentSuggestionsFromProducts", mock.Anything, userID, mock.Anything).
		Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/suggestions?product_ids="+productID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.GetEquipmentSuggestionsGET(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// CheckEquipmentConflictsGET
// ---------------------------------------------------------------------------

func TestCheckEquipmentConflictsGET_Empty(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/equipment/conflicts", "", uuid.New())
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflictsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Contains(t, rr.Body.String(), "[]")
}

func TestCheckEquipmentConflictsGET_BadInventoryUUID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/conflicts?event_date=2026-06-01&inventory_ids=bad", "", uuid.New())
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflictsGET(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCheckEquipmentConflictsGET_BadExcludeEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	invID := uuid.New()
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/conflicts?event_date=2026-06-01&inventory_ids="+invID.String()+"&exclude_event_id=bad",
		"", uuid.New())
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflictsGET(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestCheckEquipmentConflictsGET_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	invID := uuid.New()

	eventRepo.On("CheckEquipmentConflicts", mock.Anything, userID, "2026-06-01",
		mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return([]models.EquipmentConflict{}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/conflicts?event_date=2026-06-01&inventory_ids="+invID.String()+"&start_time=10:00&end_time=14:00",
		"", userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflictsGET(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestCheckEquipmentConflictsGET_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	invID := uuid.New()
	eventRepo.On("CheckEquipmentConflicts", mock.Anything, userID, mock.Anything,
		mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/equipment/conflicts?event_date=2026-06-01&inventory_ids="+invID.String(), "", userID)
	rr := httptest.NewRecorder()
	h.CheckEquipmentConflictsGET(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// SearchEvents — advanced search
// ---------------------------------------------------------------------------

func TestSearchEvents_NoFilters_BadRequest(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/search", "", uuid.New())
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "search filter")
}

func TestSearchEvents_InvalidStatus(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/search?status=bogus", "", uuid.New())
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSearchEvents_InvalidClientID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/search?client_id=bad", "", uuid.New())
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSearchEvents_InvalidFromDate(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/search?from=not-a-date", "", uuid.New())
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSearchEvents_InvalidToDate(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithUserID(http.MethodGet, "/api/events/search?to=not-a-date", "", uuid.New())
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestSearchEvents_Success(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	clientID := uuid.New()

	eventRepo.On("SearchEventsAdvanced", mock.Anything, userID,
		mock.MatchedBy(func(f repository.EventSearchFilters) bool {
			return f.Query == "boda" && f.Status == "confirmed" && f.ClientID != nil && *f.ClientID == clientID
		})).Return([]models.Event{{ID: uuid.New(), UserID: userID}}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet,
		"/api/events/search?q=boda&status=confirmed&from=2026-01-01&to=2026-12-31&client_id="+clientID.String(),
		"", userID)
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestSearchEvents_RepoError(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventRepo.On("SearchEventsAdvanced", mock.Anything, userID, mock.Anything).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithUserID(http.MethodGet, "/api/events/search?q=hello", "", userID)
	rr := httptest.NewRecorder()
	h.SearchEvents(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// UpdateEvent — additional branches
// ---------------------------------------------------------------------------

func TestUpdateEvent_TransitionToConfirmed_TriggersStockDeductAndNotifier(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()

	existing := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ClientID:    clientID,
		EventDate:   "2026-06-01",
		ServiceType: "catering",
		NumPeople:   10,
		Status:      "quoted",
		TotalAmount: 1000,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, clientID).Return(nil)
	eventRepo.On("DeductSupplyStock", mock.Anything, eventID).Return(nil)

	h := eventCoverageHandler(eventRepo)
	h.SetNotifier(stubNotifier{})
	h.SetLiveActivityNotifier(stubLiveActivityNotifier{})

	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-01","service_type":"catering","num_people":10,"status":"confirmed","total_amount":1000}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
}

func TestUpdateEvent_ClientChanged_UpdatesBothClients(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	oldClient := uuid.New()
	newClient := uuid.New()

	existing := &models.Event{
		ID:          eventID,
		UserID:      userID,
		ClientID:    oldClient,
		EventDate:   "2026-06-01",
		ServiceType: "catering",
		NumPeople:   5,
		Status:      "quoted",
		TotalAmount: 500,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, newClient).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, oldClient).Return(nil)

	h := eventCoverageHandler(eventRepo)
	body := `{"client_id":"` + newClient.String() + `","event_date":"2026-06-01","service_type":"catering","num_people":5,"status":"quoted","total_amount":500}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code, rr.Body.String())
	eventRepo.AssertCalled(t, "UpdateClientStats", mock.Anything, oldClient)
	eventRepo.AssertCalled(t, "UpdateClientStats", mock.Anything, newClient)
}

func TestUpdateEvent_InvalidEventID(t *testing.T) {
	h := eventCoverageHandler(new(MockFullEventRepo))
	req := makeReqWithIDParam(http.MethodPut, "/api/events/bad", "{}", "bad", uuid.New())
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateEvent_EventNotFound(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(nil, errTest)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), "{}", eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	assert.Equal(t, http.StatusNotFound, rr.Code)
}

func TestUpdateEvent_InvalidBody(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	eventRepo.On("GetByID", mock.Anything, eventID, userID).
		Return(&models.Event{ID: eventID, UserID: userID, EventDate: "2026-06-01"}, nil)

	h := eventCoverageHandler(eventRepo)
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(),
		`{broken`, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	assert.Equal(t, http.StatusBadRequest, rr.Code)
}

func TestUpdateEvent_UpdateFails(t *testing.T) {
	eventRepo := new(MockFullEventRepo)
	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-06-01", ServiceType: "catering", NumPeople: 5,
		Status: "quoted", TotalAmount: 500,
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(errTest)

	h := eventCoverageHandler(eventRepo)
	body := `{"client_id":"` + clientID.String() + `","event_date":"2026-06-01","service_type":"catering","num_people":5,"status":"quoted","total_amount":500}`
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	assert.Equal(t, http.StatusInternalServerError, rr.Code)
}

// ---------------------------------------------------------------------------
// HandleEventPaymentSuccess — additional branches
// ---------------------------------------------------------------------------

func TestHandleEventPaymentSuccess_MismatchedEventID(t *testing.T) {
	mockStripe := new(MockStripeService)
	h := &EventPaymentHandler{stripe: mockStripe}

	eventID := uuid.New()
	userID := uuid.New()
	otherEventID := uuid.New()

	sess := &stripe.CheckoutSession{
		ID: "cs_1",
		Metadata: map[string]string{
			"event_id": otherEventID.String(),
			"user_id":  userID.String(),
		},
	}
	mockStripe.On("GetCheckoutSession", "cs_1", mock.Anything).Return(sess, nil)

	req := httptest.NewRequest(http.MethodGet,
		"/api/events/"+eventID.String()+"/payment-session?session_id=cs_1", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	req = withURLParam(req, "id", eventID.String())
	rr := httptest.NewRecorder()
	h.HandleEventPaymentSuccess(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	assert.Contains(t, rr.Body.String(), "Session does not match event")
}

func TestHandleEventPaymentSuccess_MismatchedUserID(t *testing.T) {
	mockStripe := new(MockStripeService)
	h := &EventPaymentHandler{stripe: mockStripe}

	eventID := uuid.New()
	userID := uuid.New()
	otherUserID := uuid.New()

	sess := &stripe.CheckoutSession{
		ID: "cs_2",
		Metadata: map[string]string{
			"event_id": eventID.String(),
			"user_id":  otherUserID.String(),
		},
	}
	mockStripe.On("GetCheckoutSession", "cs_2", mock.Anything).Return(sess, nil)

	req := httptest.NewRequest(http.MethodGet,
		"/api/events/"+eventID.String()+"/payment-session?session_id=cs_2", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	req = withURLParam(req, "id", eventID.String())
	rr := httptest.NewRecorder()
	h.HandleEventPaymentSuccess(rr, req)

	assert.Equal(t, http.StatusForbidden, rr.Code)
}

func TestHandleEventPaymentSuccess_WithCustomerDetails(t *testing.T) {
	mockStripe := new(MockStripeService)
	h := &EventPaymentHandler{stripe: mockStripe}

	eventID := uuid.New()
	userID := uuid.New()

	sess := &stripe.CheckoutSession{
		ID:            "cs_3",
		PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
		AmountTotal:   25000,
		CustomerDetails: &stripe.CheckoutSessionCustomerDetails{
			Email: "buyer@example.com",
		},
		Metadata: map[string]string{
			"event_id": eventID.String(),
			"user_id":  userID.String(),
		},
	}
	mockStripe.On("GetCheckoutSession", "cs_3", mock.Anything).Return(sess, nil)

	req := httptest.NewRequest(http.MethodGet,
		"/api/events/"+eventID.String()+"/payment-session?session_id=cs_3", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	req = withURLParam(req, "id", eventID.String())
	rr := httptest.NewRecorder()
	h.HandleEventPaymentSuccess(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)

	var body map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	assert.Equal(t, "buyer@example.com", body["customer_email"])
	assert.Equal(t, 250.0, body["amount_total"])
}

func TestHandleEventPaymentSuccess_NilCustomerDetails(t *testing.T) {
	mockStripe := new(MockStripeService)
	h := &EventPaymentHandler{stripe: mockStripe}

	eventID := uuid.New()
	userID := uuid.New()

	sess := &stripe.CheckoutSession{
		ID:            "cs_4",
		PaymentStatus: stripe.CheckoutSessionPaymentStatusPaid,
		AmountTotal:   10000,
		Metadata: map[string]string{
			"event_id": eventID.String(),
			"user_id":  userID.String(),
		},
	}
	mockStripe.On("GetCheckoutSession", "cs_4", mock.Anything).Return(sess, nil)

	req := httptest.NewRequest(http.MethodGet,
		"/api/events/"+eventID.String()+"/payment-session?session_id=cs_4", nil)
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	req = withURLParam(req, "id", eventID.String())
	rr := httptest.NewRecorder()
	h.HandleEventPaymentSuccess(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var body map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &body)
	assert.Equal(t, "", body["customer_email"])
}

