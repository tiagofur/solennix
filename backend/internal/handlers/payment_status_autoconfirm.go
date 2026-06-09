package handlers

import (
	"context"
	"math"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

// roundCents rounds a float64 value to 2 decimal places (cent precision).
func roundCents(v float64) float64 { return math.Round(v*100) / 100 }

type eventStatusEventRepo interface {
	GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error)
	Update(ctx context.Context, e *models.Event) error
}

type eventStatusPaymentRepo interface {
	GetByEventID(ctx context.Context, userID, eventID uuid.UUID) ([]models.Payment, error)
}

type txEventStatusRepo struct {
	repo *repository.EventRepo
	tx   pgx.Tx
}

func (r txEventStatusRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Event, error) {
	return r.repo.GetByIDTx(ctx, r.tx, id, userID)
}

func (r txEventStatusRepo) Update(ctx context.Context, e *models.Event) error {
	return r.repo.UpdateTx(ctx, r.tx, e)
}

type txPaymentStatusRepo struct {
	repo *repository.PaymentRepo
	tx   pgx.Tx
}

func (r txPaymentStatusRepo) GetByEventID(ctx context.Context, userID, eventID uuid.UUID) ([]models.Payment, error) {
	return r.repo.GetByEventIDTx(ctx, r.tx, userID, eventID)
}

// reEvaluateEventStatus re-computes whether the event should be confirmed or
// demoted to quoted based on total payments vs. required deposit.
// Returns (true, nil) when the status was changed, (false, nil) when no
// change was needed, and (false, err) on any repository error.
func reEvaluateEventStatus(
	ctx context.Context,
	eventRepo eventStatusEventRepo,
	paymentRepo eventStatusPaymentRepo,
	eventID uuid.UUID,
	userID uuid.UUID,
) (bool, error) {
	event, err := eventRepo.GetByID(ctx, eventID, userID)
	if err != nil {
		return false, err
	}

	if event.DepositPercent == nil || *event.DepositPercent <= 0 {
		return false, nil
	}

	requiredDeposit := roundCents(event.TotalAmount * (*event.DepositPercent / 100))
	if requiredDeposit <= 0 {
		return false, nil
	}

	payments, err := paymentRepo.GetByEventID(ctx, userID, eventID)
	if err != nil {
		return false, err
	}

	sum := 0.0
	for _, p := range payments {
		sum += p.Amount
	}
	totalPaid := roundCents(sum)

	switch {
	case event.Status == "confirmed" && totalPaid < requiredDeposit:
		event.Status = "quoted"
		if err := eventRepo.Update(ctx, event); err != nil {
			return false, err
		}
		return true, nil
	case event.Status == "quoted" && totalPaid >= requiredDeposit:
		event.Status = "confirmed"
		if err := eventRepo.Update(ctx, event); err != nil {
			return false, err
		}
		return true, nil
	default:
		return false, nil
	}
}

// autoConfirmQuotedEventIfDepositCovered promotes quoted -> confirmed when
// the accumulated payments cover the event's required deposit.
func autoConfirmQuotedEventIfDepositCovered(
	ctx context.Context,
	eventRepo eventStatusEventRepo,
	paymentRepo eventStatusPaymentRepo,
	eventID uuid.UUID,
	userID uuid.UUID,
) (bool, error) {
	event, err := eventRepo.GetByID(ctx, eventID, userID)
	if err != nil {
		return false, err
	}

	if event.Status != "quoted" {
		return false, nil
	}

	if event.DepositPercent == nil || *event.DepositPercent <= 0 {
		return false, nil
	}

	requiredDeposit := roundCents(event.TotalAmount * (*event.DepositPercent / 100))
	if requiredDeposit <= 0 {
		return false, nil
	}

	payments, err := paymentRepo.GetByEventID(ctx, userID, eventID)
	if err != nil {
		return false, err
	}

	sum := 0.0
	for _, payment := range payments {
		sum += payment.Amount
	}
	totalPaid := roundCents(sum)

	if totalPaid < requiredDeposit {
		return false, nil
	}

	event.Status = "confirmed"
	if err := eventRepo.Update(ctx, event); err != nil {
		return false, err
	}

	return true, nil
}
