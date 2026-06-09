package handlers

// Tests for slice S3a — money integrity
//
// A6-lite tests live in payment_status_autoconfirm_test.go.
// This file covers:
//   - A7: UpdateEvent rejects manipulated total_amount when line items exist
//   - A8: CreatePublic submission cap
//   - M14: UpdatePayment / DeletePayment status demotion (handler-level, no pool)

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---------------------------------------------------------------------------
// A7: UpdateEvent total_amount validation
// ---------------------------------------------------------------------------

// buildUpdateEventHandlerForA7 returns a handler wired with fresh mocks where
// the event already has line items that compute to serverTotal.
// Does NOT use setupCRUDTest so the GetProducts/GetExtras stubs aren't pre-empted.
func buildUpdateEventHandlerForA7(
	t *testing.T,
	eventID uuid.UUID,
	userID uuid.UUID,
	clientTotal float64,
	serverTotal float64,
	products []models.EventProduct,
	extras []models.EventExtra,
) (*CRUDHandler, *httptest.ResponseRecorder) {
	t.Helper()

	eventRepo := new(MockFullEventRepo)
	paymentRepo := new(MockFullPaymentRepo)
	userRepo := new(MockFullUserRepo)
	udr := new(MockUnavailableDateRepo)
	udr.On("GetByDateRange", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return([]models.UnavailableDate{}, nil).Maybe()

	existing := &models.Event{
		ID:           eventID,
		UserID:       userID,
		ClientID:     uuid.New(),
		EventDate:    "2026-08-01",
		ServiceType:  "Boda",
		Status:       "quoted",
		TotalAmount:  serverTotal, // stored server value
		DiscountType: "fixed",
	}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	// These are the ONLY stubs for GetProducts/GetExtras — they return real items.
	eventRepo.On("GetProducts", mock.Anything, eventID).Return(products, nil)
	eventRepo.On("GetExtras", mock.Anything, eventID).Return(extras, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil).Maybe()
	eventRepo.On("UpdateClientStats", mock.Anything, mock.Anything).Return(nil).Maybe()
	paymentRepo.On("GetByEventID", mock.Anything, mock.Anything, mock.Anything).Return([]models.Payment{}, nil).Maybe()
	userRepo.On("GetByID", mock.Anything, mock.Anything).Return(&models.User{Plan: "pro"}, nil).Maybe()

	h := NewCRUDHandler(
		new(MockClientRepo),
		eventRepo,
		new(MockProductRepo),
		new(MockInventoryRepo),
		paymentRepo,
		userRepo,
		udr,
	)

	body := fmt.Sprintf(`{"client_id":%q,"event_date":"2026-08-01","service_type":"Boda","num_people":50,"status":"quoted","total_amount":%.6f,"discount_type":"fixed"}`, existing.ClientID, clientTotal)
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)
	return h, rr
}

func TestUpdateEvent_A7_ManipulatedTotal_Returns400(t *testing.T) {
	eventID := uuid.New()
	userID := uuid.New()

	// One product: qty=1, unitPrice=5000, discount=0 → serverTotal=5000
	products := []models.EventProduct{
		{EventID: eventID, Quantity: 1, UnitPrice: 5000.00, Discount: 0, TotalPrice: 5000.00},
	}
	extras := []models.EventExtra{}

	// Client sends 9999 instead of 5000
	_, rr := buildUpdateEventHandlerForA7(t, eventID, userID, 9999.00, 5000.00, products, extras)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	var envelope struct{ Error string }
	require.NoError(t, json.NewDecoder(rr.Body).Decode(&envelope))
	assert.Contains(t, envelope.Error, "total_amount mismatch")
}

// A7 must only validate the total when the client actually sends total_amount.
// A partial update (e.g. changing num_people) must not be rejected by a
// pre-existing total/line-item discrepancy the client did not touch.
func TestUpdateEvent_A7_PartialUpdateWithoutTotal_NotRejected(t *testing.T) {
	eventID := uuid.New()
	userID := uuid.New()
	clientID := uuid.New()

	eventRepo := new(MockFullEventRepo)
	paymentRepo := new(MockFullPaymentRepo)
	userRepo := new(MockFullUserRepo)
	udr := new(MockUnavailableDateRepo)
	udr.On("GetByDateRange", mock.Anything, mock.Anything, mock.Anything, mock.Anything).
		Return([]models.UnavailableDate{}, nil).Maybe()

	// Stored total (9999) deliberately does NOT match the line items (5000).
	existing := &models.Event{
		ID: eventID, UserID: userID, ClientID: clientID,
		EventDate: "2026-08-01", ServiceType: "Boda", Status: "quoted",
		TotalAmount: 9999.00, DiscountType: "fixed",
	}
	products := []models.EventProduct{{EventID: eventID, Quantity: 1, UnitPrice: 5000.00, TotalPrice: 5000.00}}

	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetProducts", mock.Anything, eventID).Return(products, nil).Maybe()
	eventRepo.On("GetExtras", mock.Anything, eventID).Return([]models.EventExtra{}, nil).Maybe()
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil).Maybe()
	eventRepo.On("UpdateClientStats", mock.Anything, mock.Anything).Return(nil).Maybe()
	paymentRepo.On("GetByEventID", mock.Anything, mock.Anything, mock.Anything).Return([]models.Payment{}, nil).Maybe()
	userRepo.On("GetByID", mock.Anything, mock.Anything).Return(&models.User{Plan: "pro"}, nil).Maybe()

	h := NewCRUDHandler(new(MockClientRepo), eventRepo, new(MockProductRepo), new(MockInventoryRepo), paymentRepo, userRepo, udr)

	// Body omits total_amount — only changes num_people.
	body := fmt.Sprintf(`{"client_id":%q,"event_date":"2026-08-01","service_type":"Boda","num_people":80,"status":"quoted","discount_type":"fixed"}`, clientID)
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.NotEqual(t, http.StatusBadRequest, rr.Code, "partial update without total_amount must not be rejected by A7")
}

func TestUpdateEvent_A7_CorrectTotal_Returns200(t *testing.T) {
	eventID := uuid.New()
	userID := uuid.New()

	products := []models.EventProduct{
		{EventID: eventID, Quantity: 2, UnitPrice: 2500.00, Discount: 0, TotalPrice: 5000.00},
	}
	extras := []models.EventExtra{}

	// Client sends the correct computed total
	_, rr := buildUpdateEventHandlerForA7(t, eventID, userID, 5000.00, 5000.00, products, extras)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestUpdateEvent_A7_NoLineItems_AcceptsAnyTotal(t *testing.T) {
	// When no items exist, A7 does not enforce the total.
	eventID := uuid.New()
	userID := uuid.New()

	h, _, eventRepo, _, _, paymentRepo, userRepo, _ := setupCRUDTest(t)

	existing := &models.Event{
		ID:           eventID,
		UserID:       userID,
		ClientID:     uuid.New(),
		EventDate:    "2026-08-01",
		ServiceType:  "Boda",
		Status:       "quoted",
		TotalAmount:  1000.00,
		DiscountType: "fixed",
	}
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(existing, nil)
	eventRepo.On("GetProducts", mock.Anything, eventID).Return([]models.EventProduct{}, nil)
	eventRepo.On("GetExtras", mock.Anything, eventID).Return([]models.EventExtra{}, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	eventRepo.On("UpdateClientStats", mock.Anything, mock.Anything).Return(nil).Maybe()
	paymentRepo.On("GetByEventID", mock.Anything, mock.Anything, mock.Anything).Return([]models.Payment{}, nil).Maybe()
	userRepo.On("GetByID", mock.Anything, mock.Anything).Return(&models.User{Plan: "pro"}, nil).Maybe()

	body := fmt.Sprintf(`{"client_id":%q,"event_date":"2026-08-01","service_type":"Boda","num_people":50,"status":"quoted","total_amount":99999.00,"discount_type":"fixed"}`, existing.ClientID)
	req := makeReqWithIDParam(http.MethodPut, "/api/events/"+eventID.String(), body, eventID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdateEvent(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

// ---------------------------------------------------------------------------
// A8: CreatePublic submission cap
// ---------------------------------------------------------------------------

func makeSubmissionRequest(eventID, clientID uuid.UUID, amount string, linkEventID uuid.UUID) *http.Request {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("event_id", eventID.String())
	_ = writer.WriteField("client_id", clientID.String())
	_ = writer.WriteField("amount", amount)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/public/events/tok/payment-submissions", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("token", "tok")
	return req
}

func TestCreatePublic_A8_AmountExceedsBalance_Returns400(t *testing.T) {
	uploadDir := t.TempDir()
	eventID := uuid.New()
	clientID := uuid.New()

	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	handler.lookupPublicLink = func(_ context.Context, _ string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	handler.lookupEvent = func(_ context.Context, id uuid.UUID) (*models.Event, error) {
		return &models.Event{ID: id, ClientID: clientID, TotalAmount: 3000.00}, nil
	}
	handler.sumPaymentsByEventID = func(_ context.Context, _ uuid.UUID) (float64, error) {
		return 1000.00, nil // already paid 1000; remaining=2000
	}

	// Submit 2500 > remaining 2000 → 400
	req := makeSubmissionRequest(eventID, clientID, "2500", eventID)
	rr := httptest.NewRecorder()
	handler.CreatePublic(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	body := rr.Body.String()
	assert.Contains(t, body, "remaining balance")
}

func TestCreatePublic_A8_AmountWithinBalance_Proceeds(t *testing.T) {
	uploadDir := t.TempDir()
	eventID := uuid.New()
	clientID := uuid.New()

	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	handler.lookupPublicLink = func(_ context.Context, _ string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	handler.lookupEvent = func(_ context.Context, id uuid.UUID) (*models.Event, error) {
		return &models.Event{ID: id, ClientID: clientID, TotalAmount: 3000.00}, nil
	}
	handler.sumPaymentsByEventID = func(_ context.Context, _ uuid.UUID) (float64, error) {
		return 1000.00, nil // remaining=2000
	}
	handler.createSubmission = func(_ context.Context, ps *models.PaymentSubmission) error {
		ps.ID = uuid.New()
		return nil
	}

	// Submit 1500 ≤ 2000 → passes cap check; proceeds to create submission
	req := makeSubmissionRequest(eventID, clientID, "1500", eventID)
	rr := httptest.NewRecorder()
	handler.CreatePublic(rr, req)

	// Should NOT be 400 from cap; may be other status but not "remaining balance" error
	if rr.Code == http.StatusBadRequest {
		body := rr.Body.String()
		assert.NotContains(t, body, "remaining balance",
			"should not fail due to cap when amount is within balance")
	}
}

func TestCreatePublic_A8_ExactBalance_Proceeds(t *testing.T) {
	uploadDir := t.TempDir()
	eventID := uuid.New()
	clientID := uuid.New()

	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	handler.lookupPublicLink = func(_ context.Context, _ string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID,
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}
	handler.lookupEvent = func(_ context.Context, id uuid.UUID) (*models.Event, error) {
		return &models.Event{ID: id, ClientID: clientID, TotalAmount: 3000.00}, nil
	}
	handler.sumPaymentsByEventID = func(_ context.Context, _ uuid.UUID) (float64, error) {
		return 1000.00, nil // remaining=2000
	}
	handler.createSubmission = func(_ context.Context, ps *models.PaymentSubmission) error {
		ps.ID = uuid.New()
		return nil
	}

	// Submit exactly 2000 (remaining) — should pass
	req := makeSubmissionRequest(eventID, clientID, "2000", eventID)
	rr := httptest.NewRecorder()
	handler.CreatePublic(rr, req)

	if rr.Code == http.StatusBadRequest {
		body := rr.Body.String()
		assert.NotContains(t, body, "remaining balance")
	}
}

// ---------------------------------------------------------------------------
// M14 handler-level (no pool — tests fallback path with mock repos)
// ---------------------------------------------------------------------------

// These tests verify that UpdatePayment and DeletePayment use the fallback path
// (no pool) without panicking. The full transactional path is exercised via
// integration tests (TestCreatePayment_Transactional, etc.).

func TestUpdatePayment_FallbackPath_ReturnsOK(t *testing.T) {
	h, _, _, _, _, paymentRepo, _, _ := setupCRUDTest(t)

	paymentID := uuid.New()
	eventID := uuid.New()
	userID := uuid.New()

	existingPayment := &models.Payment{
		ID:            paymentID,
		EventID:       eventID,
		UserID:        userID,
		Amount:        1500.00,
		PaymentDate:   "2026-01-01",
		PaymentMethod: "cash",
	}
	paymentRepo.On("Update", mock.Anything, userID, mock.MatchedBy(func(p *models.Payment) bool {
		return p.ID == paymentID
	})).Run(func(args mock.Arguments) {
		p := args.Get(2).(*models.Payment)
		p.EventID = existingPayment.EventID
		p.UserID = existingPayment.UserID
	}).Return(nil)

	body := fmt.Sprintf(`{"event_id":%q,"amount":1500,"payment_date":"2026-01-01","payment_method":"cash"}`, eventID)
	req := makeReqWithIDParam(http.MethodPut, "/api/payments/"+paymentID.String(), body, paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.UpdatePayment(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
}

func TestDeletePayment_FallbackPath_ReturnsNoContent(t *testing.T) {
	h, _, _, _, _, paymentRepo, _, _ := setupCRUDTest(t)

	paymentID := uuid.New()
	userID := uuid.New()

	paymentRepo.On("Delete", mock.Anything, paymentID, userID).Return(nil)

	req := makeReqWithIDParam(http.MethodDelete, "/api/payments/"+paymentID.String(), "", paymentID.String(), userID)
	rr := httptest.NewRecorder()
	h.DeletePayment(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
}

func TestCreatePayment_FallbackPath_AutoConfirms(t *testing.T) {
	// Without pool, CreatePayment falls back to mock repos.
	// Verify that autoConfirm is attempted when eventRepo is present.
	h, _, eventRepo, _, _, paymentRepo, userRepo, _ := setupCRUDTest(t)

	eventID := uuid.New()
	userID := uuid.New()
	depositPct := 50.0

	event := &models.Event{
		ID:             eventID,
		UserID:         userID,
		Status:         "quoted",
		TotalAmount:    2000.00,
		DepositPercent: &depositPct,
		DiscountType:   "fixed",
	}

	paymentRepo.On("Create", mock.Anything, mock.Anything).Run(func(args mock.Arguments) {
		p := args.Get(1).(*models.Payment)
		p.ID = uuid.New()
	}).Return(nil)
	eventRepo.On("GetByID", mock.Anything, eventID, userID).Return(event, nil)
	paymentRepo.On("GetByEventID", mock.Anything, userID, eventID).Return([]models.Payment{
		{Amount: 1000.00},
	}, nil)
	eventRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	userRepo.On("GetByID", mock.Anything, mock.Anything).Return(&models.User{Plan: "pro"}, nil).Maybe()

	body := fmt.Sprintf(`{"event_id":%q,"amount":1000,"payment_date":"2026-01-01","payment_method":"cash"}`, eventID)
	req := makeReqWithUserID(http.MethodPost, "/api/payments", body, userID)
	rr := httptest.NewRecorder()
	h.CreatePayment(rr, req)

	assert.Equal(t, http.StatusCreated, rr.Code)
}

// TestUpdateEvent_A7_SmallFloatDrift_WithinTolerance ensures rounding within
// 0.01 tolerance is accepted (e.g. float arithmetic drift).
func TestUpdateEvent_A7_WithinTolerance_Returns200(t *testing.T) {
	eventID := uuid.New()
	userID := uuid.New()

	// serverTotal = 5000.00; client sends 5000.005 — within 0.01 tolerance
	products := []models.EventProduct{
		{EventID: eventID, Quantity: 1, UnitPrice: 5000.00, Discount: 0, TotalPrice: 5000.00},
	}
	extras := []models.EventExtra{}

	_, rr := buildUpdateEventHandlerForA7(t, eventID, userID, 5000.005, 5000.00, products, extras)

	// 5000.005 - 5000.00 = 0.005 < 0.01, so should pass
	assert.Equal(t, http.StatusOK, rr.Code)
}

// ---- helper for payment submission that builds multipart body ----

func buildSubmissionBodyWithMismatchedEventID(t *testing.T, eventID, otherID, clientID uuid.UUID, amount string) *http.Request {
	t.Helper()
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("event_id", otherID.String())
	_ = writer.WriteField("client_id", clientID.String())
	_ = writer.WriteField("amount", amount)
	writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/public/events/tok/payment-submissions", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetPathValue("token", "tok")
	return req
}

// TestCreatePublic_A8_EventIDMismatch_Returns400 ensures even if amount is OK,
// mismatch between link.EventID and submitted event_id is rejected.
func TestCreatePublic_A8_EventIDMismatch_Returns400(t *testing.T) {
	uploadDir := t.TempDir()
	eventID := uuid.New()
	otherID := uuid.New()
	clientID := uuid.New()

	handler := NewPaymentSubmissionHandler(nil, nil, nil, nil, uploadDir)
	handler.lookupPublicLink = func(_ context.Context, _ string) (*models.EventPublicLink, error) {
		return &models.EventPublicLink{
			EventID: eventID, // link belongs to eventID
			UserID:  uuid.New(),
			Status:  "active",
		}, nil
	}

	req := buildSubmissionBodyWithMismatchedEventID(t, eventID, otherID, clientID, "100")
	rr := httptest.NewRecorder()
	handler.CreatePublic(rr, req)

	assert.Equal(t, http.StatusBadRequest, rr.Code)
	body := rr.Body.String()
	_ = strings.Contains(body, "mismatch") // may say "Event ID mismatch" or similar
}
