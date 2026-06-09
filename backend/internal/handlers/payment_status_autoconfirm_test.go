package handlers

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// ---- minimal in-process mocks ------------------------------------------------

type memEventRepo struct {
	event *models.Event
	saved *models.Event
	err   error
}

func (m *memEventRepo) GetByID(_ context.Context, _, _ uuid.UUID) (*models.Event, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.event, nil
}

func (m *memEventRepo) Update(_ context.Context, e *models.Event) error {
	m.saved = e
	return nil
}

type memPaymentRepo struct {
	payments []models.Payment
	err      error
}

func (m *memPaymentRepo) GetByEventID(_ context.Context, _, _ uuid.UUID) ([]models.Payment, error) {
	return m.payments, m.err
}

// ---- helpers -----------------------------------------------------------------

func pf64(v float64) *float64 { return &v }

func makeEvent(status string, total float64, depositPct float64) *models.Event {
	return &models.Event{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Status:         status,
		TotalAmount:    total,
		DepositPercent: pf64(depositPct),
	}
}

func payments(amounts ...float64) []models.Payment {
	ps := make([]models.Payment, len(amounts))
	for i, a := range amounts {
		ps[i] = models.Payment{Amount: a}
	}
	return ps
}

// ---- roundCents --------------------------------------------------------------

func TestRoundCents(t *testing.T) {
	tests := []struct {
		in   float64
		want float64
	}{
		// 1.005 in float64 is actually ~1.00499..., so rounds down to 1.00
		{1.005, 1.00},
		{1.006, 1.01},
		{1.004, 1.00},
		{0.999, 1.00},
		{1500.0, 1500.00},
		{1499.999, 1500.00},
		{0.005, 0.01}, // 0.005 is representable exactly → rounds to 0.01
	}
	for _, tc := range tests {
		got := roundCents(tc.in)
		if got != tc.want {
			t.Errorf("roundCents(%.6f) = %.6f; want %.6f", tc.in, got, tc.want)
		}
	}
}

// ---- A6-lite: autoConfirmQuotedEventIfDepositCovered -------------------------

func TestAutoConfirm_ExactDeposit_Confirms(t *testing.T) {
	// deposit=50% of 3000 = 1500; totalPaid=1500 → confirm
	event := makeEvent("quoted", 3000.00, 50)
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(1500.00)}

	changed, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected status change, got none")
	}
	if er.saved == nil || er.saved.Status != "confirmed" {
		t.Fatalf("expected saved status=confirmed, got %+v", er.saved)
	}
}

func TestAutoConfirm_OneCentShort_DoesNotConfirm(t *testing.T) {
	// deposit=50% of 3000 = 1500; totalPaid=1499.99 → no confirm
	event := makeEvent("quoted", 3000.00, 50)
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(1499.99)}

	changed, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if changed {
		t.Fatal("expected no status change, got change")
	}
}

func TestAutoConfirm_AlreadyConfirmed_NoOp(t *testing.T) {
	event := makeEvent("confirmed", 3000.00, 50)
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(1500.00)}

	changed, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || changed {
		t.Fatalf("expected no-op; changed=%v err=%v", changed, err)
	}
}

func TestAutoConfirm_NoDepositPercent_NoOp(t *testing.T) {
	event := &models.Event{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Status:         "quoted",
		TotalAmount:    3000.00,
		DepositPercent: nil,
	}
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(3000.00)}

	changed, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || changed {
		t.Fatalf("expected no-op; changed=%v err=%v", changed, err)
	}
}

func TestAutoConfirm_MultiplePaymentsExactDeposit(t *testing.T) {
	// 3 payments summing exactly to deposit
	event := makeEvent("quoted", 3000.00, 50) // deposit=1500
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(500.00, 600.00, 400.00)} // sum=1500

	changed, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || !changed {
		t.Fatalf("expected confirm; changed=%v err=%v", changed, err)
	}
}

func TestAutoConfirm_RepoError_Propagates(t *testing.T) {
	er := &memEventRepo{err: errors.New("db error")}
	pr := &memPaymentRepo{}
	_, err := autoConfirmQuotedEventIfDepositCovered(context.Background(), er, pr, uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error to propagate")
	}
}

// ---- M14: reEvaluateEventStatus ---------------------------------------------

func TestReEvaluate_ConfirmedBelowDeposit_DemotesToQuoted(t *testing.T) {
	event := makeEvent("confirmed", 3000.00, 50) // requiredDeposit=1500
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(1000.00)} // totalPaid=1000 < 1500

	changed, err := reEvaluateEventStatus(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected demotion, got no change")
	}
	if er.saved == nil || er.saved.Status != "quoted" {
		t.Fatalf("expected saved status=quoted, got %+v", er.saved)
	}
}

func TestReEvaluate_QuotedAtDeposit_PromotesToConfirmed(t *testing.T) {
	event := makeEvent("quoted", 3000.00, 50) // requiredDeposit=1500
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(1500.00)}

	changed, err := reEvaluateEventStatus(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || !changed {
		t.Fatalf("expected promotion; changed=%v err=%v", changed, err)
	}
	if er.saved == nil || er.saved.Status != "confirmed" {
		t.Fatalf("expected confirmed, got %+v", er.saved)
	}
}

func TestReEvaluate_ConfirmedAboveDeposit_NoChange(t *testing.T) {
	event := makeEvent("confirmed", 3000.00, 50) // requiredDeposit=1500
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(2000.00)}

	changed, err := reEvaluateEventStatus(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || changed {
		t.Fatalf("expected no-op; changed=%v err=%v", changed, err)
	}
}

func TestReEvaluate_QuotedBelowDeposit_NoChange(t *testing.T) {
	event := makeEvent("quoted", 3000.00, 50) // requiredDeposit=1500
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(500.00)}

	changed, err := reEvaluateEventStatus(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || changed {
		t.Fatalf("expected no-op; changed=%v err=%v", changed, err)
	}
}

func TestReEvaluate_NoDepositPercent_NoOp(t *testing.T) {
	event := &models.Event{
		ID:             uuid.New(),
		UserID:         uuid.New(),
		Status:         "confirmed",
		TotalAmount:    3000.00,
		DepositPercent: nil,
	}
	er := &memEventRepo{event: event}
	pr := &memPaymentRepo{payments: payments(0)}

	changed, err := reEvaluateEventStatus(context.Background(), er, pr, event.ID, event.UserID)
	if err != nil || changed {
		t.Fatalf("expected no-op; changed=%v err=%v", changed, err)
	}
}
