package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type fakePaymentSubmissionReviewStore struct {
	submission             *models.PaymentSubmission
	getSubmissionErr       error
	createPaymentErr       error
	autoConfirmErr         error
	updateSubmissionErr    error
	commitErr              error
	createdPayment         *models.Payment
	updatedSubmission      *models.PaymentSubmission
	autoConfirmEventID     uuid.UUID
	autoConfirmUserID      uuid.UUID
	commitCalled           bool
	rollbackCalled         bool
	createPaymentCalled    bool
	autoConfirmCalled      bool
	updateSubmissionCalled bool
	getSubmissionCalled    bool
}

func (f *fakePaymentSubmissionReviewStore) GetSubmissionForUpdate(context.Context, uuid.UUID) (*models.PaymentSubmission, error) {
	f.getSubmissionCalled = true
	if f.getSubmissionErr != nil {
		return nil, f.getSubmissionErr
	}
	if f.submission == nil {
		return nil, errors.New("missing submission")
	}
	copy := *f.submission
	return &copy, nil
}

func (f *fakePaymentSubmissionReviewStore) CreatePayment(_ context.Context, payment *models.Payment) error {
	f.createPaymentCalled = true
	if f.createPaymentErr != nil {
		return f.createPaymentErr
	}
	copy := *payment
	if copy.ID == uuid.Nil {
		copy.ID = uuid.New()
		payment.ID = copy.ID
	}
	f.createdPayment = &copy
	return nil
}

func (f *fakePaymentSubmissionReviewStore) AutoConfirmQuotedEventIfDepositCovered(_ context.Context, eventID, userID uuid.UUID) (bool, error) {
	f.autoConfirmCalled = true
	f.autoConfirmEventID = eventID
	f.autoConfirmUserID = userID
	if f.autoConfirmErr != nil {
		return false, f.autoConfirmErr
	}
	return true, nil
}

func (f *fakePaymentSubmissionReviewStore) UpdateSubmission(_ context.Context, ps *models.PaymentSubmission) error {
	f.updateSubmissionCalled = true
	if f.updateSubmissionErr != nil {
		return f.updateSubmissionErr
	}
	copy := *ps
	f.updatedSubmission = &copy
	return nil
}

func (f *fakePaymentSubmissionReviewStore) Commit(context.Context) error {
	f.commitCalled = true
	return f.commitErr
}

func (f *fakePaymentSubmissionReviewStore) Rollback(context.Context) error {
	f.rollbackCalled = true
	return nil
}

type paymentSubmissionEnvelope struct {
	Data models.PaymentSubmission `json:"data"`
}

type errorEnvelope struct {
	Error string `json:"error"`
}

func reviewSubmissionRequest(t *testing.T, submissionID uuid.UUID, userID uuid.UUID, body map[string]any) (*http.Request, *httptest.ResponseRecorder) {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPatch, "/api/payment-submissions/"+submissionID.String(), bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", submissionID.String())
	req = req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
	return req, httptest.NewRecorder()
}

func TestPaymentSubmissionReviewSubmissionApproveTransactionalSuccess(t *testing.T) {
	organizerID := uuid.New()
	submissionID := uuid.New()
	now := time.Now().UTC().Add(-time.Hour)
	store := &fakePaymentSubmissionReviewStore{
		submission: &models.PaymentSubmission{
			ID:          submissionID,
			EventID:     uuid.New(),
			ClientID:    uuid.New(),
			UserID:      organizerID,
			Amount:      2500,
			Status:      "pending",
			TransferRef: ptr("SPEI-123"),
			SubmittedAt: now,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
	handler := &PaymentSubmissionHandler{
		beginReviewTx: func(context.Context) (paymentSubmissionReviewStore, error) {
			return store, nil
		},
	}

	req, w := reviewSubmissionRequest(t, submissionID, organizerID, map[string]any{"status": "approved"})
	handler.ReviewSubmission(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	if !store.getSubmissionCalled || !store.createPaymentCalled || !store.autoConfirmCalled || !store.updateSubmissionCalled || !store.commitCalled {
		t.Fatalf("expected transactional approval path to run completely: %+v", store)
	}
	if store.updatedSubmission == nil || store.updatedSubmission.LinkedPaymentID == nil {
		t.Fatalf("expected linked payment ID on updated submission: %+v", store.updatedSubmission)
	}
	if store.updatedSubmission.Status != "approved" {
		t.Fatalf("expected approved status, got %q", store.updatedSubmission.Status)
	}
	var envelope paymentSubmissionEnvelope
	if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if envelope.Data.Status != "approved" || envelope.Data.LinkedPaymentID == nil {
		t.Fatalf("unexpected response payload: %+v", envelope.Data)
	}
}

func TestPaymentSubmissionReviewSubmissionRejectDoesNotCreatePayment(t *testing.T) {
	organizerID := uuid.New()
	submissionID := uuid.New()
	now := time.Now().UTC().Add(-time.Hour)
	reason := "Transferencia no encontrada"
	store := &fakePaymentSubmissionReviewStore{
		submission: &models.PaymentSubmission{
			ID:          submissionID,
			EventID:     uuid.New(),
			ClientID:    uuid.New(),
			UserID:      organizerID,
			Amount:      800,
			Status:      "pending",
			SubmittedAt: now,
			CreatedAt:   now,
			UpdatedAt:   now,
		},
	}
	handler := &PaymentSubmissionHandler{
		beginReviewTx: func(context.Context) (paymentSubmissionReviewStore, error) {
			return store, nil
		},
	}

	req, w := reviewSubmissionRequest(t, submissionID, organizerID, map[string]any{"status": "rejected", "rejection_reason": reason})
	handler.ReviewSubmission(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	if store.createPaymentCalled || store.autoConfirmCalled {
		t.Fatalf("reject flow should not create payment or auto-confirm: %+v", store)
	}
	if !store.updateSubmissionCalled || !store.commitCalled {
		t.Fatalf("reject flow should update submission and commit: %+v", store)
	}
	if store.updatedSubmission == nil || store.updatedSubmission.Status != "rejected" {
		t.Fatalf("expected rejected submission update, got %+v", store.updatedSubmission)
	}
	if store.updatedSubmission.RejectionReason == nil || *store.updatedSubmission.RejectionReason != reason {
		t.Fatalf("expected rejection reason, got %+v", store.updatedSubmission)
	}
}

func TestPaymentSubmissionReviewSubmissionGetSubmissionFailureResponses(t *testing.T) {
	organizerID := uuid.New()
	submissionID := uuid.New()

	tests := []struct {
		name           string
		getErr         error
		expectedStatus int
		expectedError  string
	}{
		{name: "not found returns 404", getErr: pgx.ErrNoRows, expectedStatus: http.StatusNotFound, expectedError: "Submission not found"},
		{name: "backend failure returns 500", getErr: errors.New("lock timeout"), expectedStatus: http.StatusInternalServerError, expectedError: "Failed to load submission"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakePaymentSubmissionReviewStore{getSubmissionErr: tt.getErr}
			handler := &PaymentSubmissionHandler{
				beginReviewTx: func(context.Context) (paymentSubmissionReviewStore, error) {
					return store, nil
				},
			}

			req, w := reviewSubmissionRequest(t, submissionID, organizerID, map[string]any{"status": "approved"})
			handler.ReviewSubmission(w, req)

			if w.Code != tt.expectedStatus {
				t.Fatalf("expected %d, got %d body=%s", tt.expectedStatus, w.Code, w.Body.String())
			}
			var envelope errorEnvelope
			if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if envelope.Error != tt.expectedError {
				t.Fatalf("expected error %q, got %q", tt.expectedError, envelope.Error)
			}
			if store.commitCalled {
				t.Fatalf("commit should not happen when loading submission fails")
			}
			if !store.rollbackCalled {
				t.Fatalf("rollback should happen when loading submission fails")
			}
		})
	}
}

func TestPaymentSubmissionReviewSubmissionAlreadyReviewedConflictsInsideTransaction(t *testing.T) {
	organizerID := uuid.New()
	submissionID := uuid.New()
	store := &fakePaymentSubmissionReviewStore{
		submission: &models.PaymentSubmission{
			ID:     submissionID,
			UserID: organizerID,
			Status: "approved",
		},
	}
	handler := &PaymentSubmissionHandler{
		beginReviewTx: func(context.Context) (paymentSubmissionReviewStore, error) {
			return store, nil
		},
	}

	req, w := reviewSubmissionRequest(t, submissionID, organizerID, map[string]any{"status": "approved"})
	handler.ReviewSubmission(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d body=%s", w.Code, w.Body.String())
	}
	if store.createPaymentCalled || store.updateSubmissionCalled || store.commitCalled {
		t.Fatalf("conflict path should not mutate: %+v", store)
	}
	if !store.rollbackCalled {
		t.Fatalf("expected rollback on conflict path")
	}
}

func TestPaymentSubmissionReviewSubmissionRollsBackOnApprovalFailures(t *testing.T) {
	tests := []struct {
		name                string
		createPaymentErr    error
		autoConfirmErr      error
		updateSubmissionErr error
		expectedMessage     string
	}{
		{name: "payment create failure", createPaymentErr: errors.New("insert payment"), expectedMessage: "Failed to create payment record"},
		{name: "auto confirm failure", autoConfirmErr: errors.New("update event"), expectedMessage: "Failed to update event status"},
		{name: "submission update failure", updateSubmissionErr: errors.New("update submission"), expectedMessage: "Failed to update submission"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			organizerID := uuid.New()
			submissionID := uuid.New()
			store := &fakePaymentSubmissionReviewStore{
				submission: &models.PaymentSubmission{
					ID:      submissionID,
					EventID: uuid.New(),
					UserID:  organizerID,
					Amount:  1200,
					Status:  "pending",
				},
				createPaymentErr:    tt.createPaymentErr,
				autoConfirmErr:      tt.autoConfirmErr,
				updateSubmissionErr: tt.updateSubmissionErr,
			}
			handler := &PaymentSubmissionHandler{
				beginReviewTx: func(context.Context) (paymentSubmissionReviewStore, error) {
					return store, nil
				},
			}

			wReq, w := reviewSubmissionRequest(t, submissionID, organizerID, map[string]any{"status": "approved"})
			handler.ReviewSubmission(w, wReq)

			if w.Code != http.StatusInternalServerError {
				t.Fatalf("expected 500, got %d body=%s", w.Code, w.Body.String())
			}
			var envelope errorEnvelope
			if err := json.NewDecoder(w.Body).Decode(&envelope); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if envelope.Error != tt.expectedMessage {
				t.Fatalf("expected error %q, got %q", tt.expectedMessage, envelope.Error)
			}
			if store.commitCalled {
				t.Fatalf("commit should not happen on failure: %+v", store)
			}
			if !store.rollbackCalled {
				t.Fatalf("rollback should happen on failure")
			}
			if tt.createPaymentErr != nil && store.updateSubmissionCalled {
				t.Fatalf("submission update should not run after payment create failure")
			}
			if tt.autoConfirmErr != nil && store.updateSubmissionCalled {
				t.Fatalf("submission update should not run after auto-confirm failure")
			}
		})
	}
}

func ptr[T any](v T) *T { return &v }
