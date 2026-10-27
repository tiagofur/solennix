package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

func stockConfirmFixture(t *testing.T) (*MockFullEventRepo, *CRUDHandler, uuid.UUID, uuid.UUID, uuid.UUID, *models.Event) {
	t.Helper()
	mockRepo := new(MockFullEventRepo)
	h := &CRUDHandler{eventRepo: mockRepo}

	userID := uuid.New()
	eventID := uuid.New()
	clientID := uuid.New()

	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2030-01-15", ServiceType: "catering", NumPeople: 10,
		Status: "quoted", TaxRate: 16, TaxAmount: 0, TotalAmount: 0,
		Discount: 0, DiscountType: "percent", Currency: "MXN",
	}

	mockRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil).Once()
	// UpdateEvent reads line items unconditionally (A7 guards only the
	// validation, not the reads).
	mockRepo.On("GetProducts", mock.Anything, eventID).Return([]models.EventProduct{}, nil).Maybe()
	mockRepo.On("GetExtras", mock.Anything, eventID).Return([]models.EventExtra{}, nil).Maybe()

	return mockRepo, h, userID, eventID, clientID, existing
}

func stockConfirmRequest(t *testing.T, userID, eventID uuid.UUID, body string) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPut, "/api/events/"+eventID.String(), strings.NewReader(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", eventID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	return req, httptest.NewRecorder()
}

// S6 (audit): a failing stock deduction when an event transitions to
// 'confirmed' must surface as 500 — the atomic side-effect update fails and
// the status change rolls back instead of saving 'confirmed' with
// silently overstated inventory.
func TestUpdateEvent_ConfirmStockFailure_SurfacesError(t *testing.T) {
	mockRepo, h, userID, eventID, clientID, _ := stockConfirmFixture(t)
	mockRepo.On("UpdateEventWithSideEffects", mock.Anything, mock.Anything, clientID, true).Return(errors.New("stock write failed")).Once()

	req, rr := stockConfirmRequest(t, userID, eventID, `{"status":"confirmed"}`)
	h.UpdateEvent(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s, want 500", rr.Code, rr.Body.String())
	}
	assert.Contains(t, rr.Body.String(), "Failed to update event")
	mockRepo.AssertExpectations(t)
}

// Previous behavior holds through the atomic path: a clean confirm returns
// 200 with the side-effect call made exactly once with the transition flag.
func TestUpdateEvent_ConfirmSuccess_AtomicSideEffects(t *testing.T) {
	mockRepo, h, userID, eventID, clientID, _ := stockConfirmFixture(t)
	mockRepo.On("UpdateEventWithSideEffects", mock.Anything, mock.Anything, clientID, true).Return(nil).Once()

	req, rr := stockConfirmRequest(t, userID, eventID, `{"status":"confirmed"}`)
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockRepo.AssertExpectations(t)
}

// A non-confirm update must not trigger the stock deduction transition.
func TestUpdateEvent_NoTransition_SkipsStockDeduction(t *testing.T) {
	mockRepo, h, userID, eventID, clientID, _ := stockConfirmFixture(t)
	mockRepo.On("UpdateEventWithSideEffects", mock.Anything, mock.Anything, clientID, false).Return(nil).Once()

	req, rr := stockConfirmRequest(t, userID, eventID, `{"status":"quoted"}`)
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	mockRepo.AssertExpectations(t)
}
