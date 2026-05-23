package handlers

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tiagofur/solennix-backend/internal/models"
	"github.com/tiagofur/solennix-backend/internal/repository"
)

const depositCoverageTolerance = 0.1

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

	requiredDeposit := event.TotalAmount * (*event.DepositPercent / 100)
	if requiredDeposit <= 0 {
		return false, nil
	}

	payments, err := paymentRepo.GetByEventID(ctx, userID, eventID)
	if err != nil {
		return false, err
	}

	totalPaid := 0.0
	for _, payment := range payments {
		totalPaid += payment.Amount
	}

	if totalPaid+depositCoverageTolerance < requiredDeposit {
		return false, nil
	}

	event.Status = "confirmed"
	if err := eventRepo.Update(ctx, event); err != nil {
		return false, err
	}

	return true, nil
}
