package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/middleware"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

type reviewAttemptResult struct {
	status int
	body   string
}

func seedPaymentSubmissionApprovalFixture(t *testing.T, pool *pgxpool.Pool) (uuid.UUID, uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	organizerID := seedHandlersUser(t, pool, "approval-concurrency-"+uuid.NewString()+"@test.dev")

	client := &models.Client{
		UserID: organizerID,
		Name:   "Cliente Concurrency",
		Phone:  "555-4290",
	}
	if err := repository.NewClientRepo(pool).Create(ctx, client); err != nil {
		t.Fatalf("failed to seed client: %v", err)
	}

	var eventID uuid.UUID
	depositPercent := 50.0
	err := pool.QueryRow(ctx, `
		INSERT INTO events (
			user_id, client_id, event_date, service_type, num_people, status,
			total_amount, tax_rate, tax_amount, discount, discount_type,
			requires_invoice, deposit_percent
		) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, 'fixed', false, $8)
		RETURNING id
	`, organizerID, client.ID, "2026-06-15", "banquete", 50, "quoted", 1000.0, depositPercent).Scan(&eventID)
	if err != nil {
		t.Fatalf("failed to seed event: %v", err)
	}

	submission := &models.PaymentSubmission{
		EventID:     eventID,
		ClientID:    client.ID,
		UserID:      organizerID,
		Amount:      500,
		Status:      "pending",
		TransferRef: ptr("SPEI-CONCURRENCY"),
		SubmittedAt: time.Now().UTC(),
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	if err := repository.NewPaymentSubmissionRepo(pool).Create(ctx, submission); err != nil {
		t.Fatalf("failed to seed payment submission: %v", err)
	}

	return organizerID, eventID, submission.ID
}

func requestWithUser(req *http.Request, userID uuid.UUID) *http.Request {
	return req.WithContext(context.WithValue(req.Context(), middleware.UserIDKey, userID))
}

func TestPaymentSubmissionReviewSubmissionConcurrentApprovalsCreateSinglePayment(t *testing.T) {
	pool := openHandlersTestPool(t)
	defer pool.Close()
	resetHandlersTestDB(t, pool)

	organizerID, eventID, submissionID := seedPaymentSubmissionApprovalFixture(t, pool)
	handler := NewPaymentSubmissionHandler(
		repository.NewPaymentSubmissionRepo(pool),
		repository.NewPaymentRepo(pool),
		nil,
		pool,
		t.TempDir(),
	)
	enteredCriticalSection := make(chan struct{}, 2)
	releaseCriticalSection := make(chan struct{})
	handler.beforeReviewSelectForUpdate = func() {
		enteredCriticalSection <- struct{}{}
		<-releaseCriticalSection
	}

	payload, err := json.Marshal(map[string]any{"status": "approved"})
	if err != nil {
		t.Fatalf("marshal review payload: %v", err)
	}

	lockTx, err := pool.Begin(context.Background())
	if err != nil {
		t.Fatalf("begin lock tx: %v", err)
	}
	defer func() {
		_ = lockTx.Rollback(context.Background())
	}()
	if _, err := lockTx.Exec(context.Background(), `SELECT 1 FROM payment_submissions WHERE id = $1 FOR UPDATE`, submissionID); err != nil {
		t.Fatalf("lock submission row: %v", err)
	}

	start := make(chan struct{})
	ready := make(chan struct{}, 2)
	results := make(chan reviewAttemptResult, 2)
	var wg sync.WaitGroup

	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPatch, "/api/payment-submissions/"+submissionID.String(), bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")
			req.SetPathValue("id", submissionID.String())
			req = requestWithUser(req, organizerID)
			w := httptest.NewRecorder()
			ready <- struct{}{}
			<-start
			handler.ReviewSubmission(w, req)
			results <- reviewAttemptResult{status: w.Code, body: w.Body.String()}
		}()
	}

	<-ready
	<-ready
	close(start)
	<-enteredCriticalSection
	<-enteredCriticalSection
	close(releaseCriticalSection)
	if err := lockTx.Rollback(context.Background()); err != nil {
		t.Fatalf("release submission row lock: %v", err)
	}
	wg.Wait()
	close(results)

	var successCount, conflictCount int
	for result := range results {
		switch result.status {
		case http.StatusOK:
			successCount++
			var envelope paymentSubmissionEnvelope
			if err := json.Unmarshal([]byte(result.body), &envelope); err != nil {
				t.Fatalf("decode success response: %v", err)
			}
			if envelope.Data.Status != "approved" || envelope.Data.LinkedPaymentID == nil {
				t.Fatalf("unexpected success payload: %+v", envelope.Data)
			}
		case http.StatusConflict:
			conflictCount++
			var envelope errorEnvelope
			if err := json.Unmarshal([]byte(result.body), &envelope); err != nil {
				t.Fatalf("decode conflict response: %v", err)
			}
			if envelope.Error != "Submission has already been reviewed" {
				t.Fatalf("unexpected conflict payload: %+v", envelope)
			}
		default:
			t.Fatalf("unexpected status %d body=%s", result.status, result.body)
		}
	}

	if successCount != 1 || conflictCount != 1 {
		t.Fatalf("expected one success and one conflict, got success=%d conflict=%d", successCount, conflictCount)
	}

	ctx := context.Background()
	var paymentCount int
	var paymentID uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT COUNT(*), MIN(id) FROM payments WHERE event_id = $1 AND user_id = $2`, eventID, organizerID).Scan(&paymentCount, &paymentID); err != nil {
		t.Fatalf("load payments: %v", err)
	}
	if paymentCount != 1 {
		t.Fatalf("payment count = %d, want 1", paymentCount)
	}

	submission, err := repository.NewPaymentSubmissionRepo(pool).GetByID(ctx, submissionID)
	if err != nil {
		t.Fatalf("load submission: %v", err)
	}
	if submission.Status != "approved" {
		t.Fatalf("submission status = %q, want approved", submission.Status)
	}
	if submission.LinkedPaymentID == nil {
		t.Fatal("expected linked payment id after concurrent approval")
	}
	if *submission.LinkedPaymentID != paymentID {
		t.Fatalf("linked payment id = %s, want %s", submission.LinkedPaymentID.String(), paymentID.String())
	}
	if submission.ReviewedBy == nil || *submission.ReviewedBy != organizerID {
		t.Fatalf("unexpected reviewed_by: %+v", submission.ReviewedBy)
	}

	var eventStatus string
	if err := pool.QueryRow(ctx, `SELECT status FROM events WHERE id = $1`, eventID).Scan(&eventStatus); err != nil {
		t.Fatalf("load event status: %v", err)
	}
	if eventStatus != "confirmed" {
		t.Fatalf("event status = %q, want confirmed", eventStatus)
	}
}
