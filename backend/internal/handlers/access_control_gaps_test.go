package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// M15 — Public Payment Portal Fail-Closed Client Validation (Task 3.5)
// ---------------------------------------------------------------------------

func TestCreatePublic_LookupEventError_ReturnsForbidden(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()
	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		// EventID matches what's in the form body so event-ID gate passes first.
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	// lookupEvent fails: fail-closed must return 403, not let the request through
	handler.lookupEvent = func(context.Context, uuid.UUID) (*models.Event, error) {
		return nil, errors.New("db connection lost")
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestCreatePublic_LookupEventNilEvent_ReturnsForbidden(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()
	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	// lookupEvent returns nil event (e.g. row deleted between link lookup and event lookup)
	handler.lookupEvent = func(context.Context, uuid.UUID) (*models.Event, error) {
		return nil, nil
	}

	body, contentType := buildPaymentSubmissionMultipart(t, eventID, clientID, "1500", "receipt.png", pngFixtureBytes())
	req := httptest.NewRequest(http.MethodPost, "/api/public/events/token-123/payment-submissions", body)
	req.Header.Set("Content-Type", contentType)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.CreatePublic(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetHistoryPublic_LookupEventError_ReturnsForbidden(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()
	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	handler.lookupEvent = func(context.Context, uuid.UUID) (*models.Event, error) {
		return nil, errors.New("db connection lost")
	}

	req := httptest.NewRequest(http.MethodGet,
		"/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.GetHistoryPublic(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestGetHistoryPublic_LookupEventNilEvent_ReturnsForbidden(t *testing.T) {
	uploadDir := t.TempDir()
	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	eventID := uuid.New()
	clientID := uuid.New()
	handler.lookupPublicLink = func(context.Context, string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	handler.lookupEvent = func(context.Context, uuid.UUID) (*models.Event, error) {
		return nil, nil
	}

	req := httptest.NewRequest(http.MethodGet,
		"/api/public/events/token-123/payment-submissions?event_id="+eventID.String()+"&client_id="+clientID.String(), nil)
	req.SetPathValue("token", "token-123")
	w := httptest.NewRecorder()

	handler.GetHistoryPublic(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

// ---------------------------------------------------------------------------
// C6 — Event Review Tenant Isolation (Task 3.6)
// ---------------------------------------------------------------------------

// buildReviewHandlerWithInjectedGetters creates an EventReviewHandler with
// injectable getReviewForReply and getReviewForVisibility for unit testing.
func buildReviewHandlerWithGetters(
	getForReply func(ctx context.Context, id uuid.UUID) (*models.EventReview, error),
	getForVisibility func(ctx context.Context, id uuid.UUID) (*models.EventReview, error),
) *EventReviewHandler {
	h := &EventReviewHandler{
		userRepo:               nil,
		getReviewForReply:      getForReply,
		getReviewForVisibility: getForVisibility,
	}
	return h
}

func TestUpdateOrganizerReply_WrongTenant_ReturnsForbidden(t *testing.T) {
	ownerID := uuid.New()
	attackerID := uuid.New()
	reviewID := uuid.New()

	// The review belongs to ownerID; the request comes from attackerID
	review := &models.EventReview{
		ID:     reviewID,
		UserID: ownerID,
	}

	mockRepo := new(MockFullUserRepo)
	// The handler calls GetByID to check the ATTACKER's plan (feature gate)
	// before it checks the review tenant. Provide a pro user so the gate passes
	// and the isolation check is reached.
	mockRepo.On("GetByID", mock.Anything, attackerID).
		Return(&models.User{ID: attackerID, Plan: "pro"}, nil)

	h := buildReviewHandlerWithGetters(
		func(_ context.Context, _ uuid.UUID) (*models.EventReview, error) {
			return review, nil
		},
		nil,
	)
	h.userRepo = mockRepo

	body := `{"response":"fake reply"}`
	req := httptest.NewRequest(http.MethodPut, "/api/reviews/"+reviewID.String()+"/response", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, attackerID))
	req.SetPathValue("id", reviewID.String())
	w := httptest.NewRecorder()

	h.UpdateOrganizerResponse(w, req)

	// Must block cross-tenant access: review.UserID (ownerID) != request userID (attackerID)
	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "permission")
	mockRepo.AssertExpectations(t)
}

func TestUpdateReviewVisibility_WrongTenant_ReturnsForbidden(t *testing.T) {
	ownerID := uuid.New()
	attackerID := uuid.New()
	reviewID := uuid.New()

	review := &models.EventReview{
		ID:     reviewID,
		UserID: ownerID,
	}

	h := buildReviewHandlerWithGetters(
		nil,
		func(_ context.Context, _ uuid.UUID) (*models.EventReview, error) {
			return review, nil
		},
	)

	body := `{"visibility":"public"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/reviews/"+reviewID.String()+"/visibility", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, attackerID))
	req.SetPathValue("id", reviewID.String())
	w := httptest.NewRecorder()

	h.UpdateReviewVisibility(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
	assert.Contains(t, w.Body.String(), "permission")
}

func TestUpdateOrganizerResponse_CorrectTenant_PassesIsolationCheck(t *testing.T) {
	ownerID := uuid.New()
	reviewID := uuid.New()

	review := &models.EventReview{
		ID:     reviewID,
		UserID: ownerID,
	}

	mockRepo := new(MockFullUserRepo)
	// userRepo.GetByID is called to check plan for the feature gate
	mockRepo.On("GetByID", mock.Anything, ownerID).
		Return(&models.User{ID: ownerID, Plan: "pro"}, nil)

	h := buildReviewHandlerWithGetters(
		func(_ context.Context, _ uuid.UUID) (*models.EventReview, error) {
			return review, nil
		},
		nil,
	)
	h.userRepo = mockRepo

	body := `{"response":"Thank you for your feedback!"}`
	req := httptest.NewRequest(http.MethodPut, "/api/reviews/"+reviewID.String()+"/response", strings.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, ownerID))
	req.SetPathValue("id", reviewID.String())
	w := httptest.NewRecorder()

	// The handler passes the isolation check and panics on nil repo.UpdateOrganizerReply.
	// Recover to confirm the isolation gate itself did NOT block this correct-tenant request.
	isolationBlocked := false
	func() {
		defer func() { recover() }()
		h.UpdateOrganizerResponse(w, req)
		if w.Code == http.StatusForbidden || w.Code == http.StatusUnauthorized {
			isolationBlocked = true
		}
	}()

	assert.False(t, isolationBlocked, "correct-tenant request must not be blocked by isolation check")
}
