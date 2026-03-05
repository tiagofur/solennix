package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type PaymentRepo struct {
	pool *pgxpool.Pool
}

const paymentSelectFields = `id, event_id, user_id, amount,
	to_char(payment_date, 'YYYY-MM-DD') as payment_date,
	payment_method, notes, created_at`

func NewPaymentRepo(pool *pgxpool.Pool) *PaymentRepo {
	return &PaymentRepo{pool: pool}
}

func (r *PaymentRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Payment, error) {
	query := `SELECT ` + paymentSelectFields + `
		FROM payments WHERE user_id = $1 ORDER BY payment_date DESC`
	return r.queryPayments(ctx, query, userID)
}

func (r *PaymentRepo) GetByEventID(ctx context.Context, userID, eventID uuid.UUID) ([]models.Payment, error) {
	query := `SELECT ` + paymentSelectFields + `
		FROM payments WHERE user_id = $1 AND event_id = $2 ORDER BY payment_date DESC`
	return r.queryPayments(ctx, query, userID, eventID)
}

func (r *PaymentRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.Payment, error) {
	query := `SELECT ` + paymentSelectFields + `
		FROM payments WHERE user_id = $1 AND payment_date >= $2::date AND payment_date <= $3::date ORDER BY payment_date DESC`
	return r.queryPayments(ctx, query, userID, start, end)
}

func (r *PaymentRepo) GetByEventIDs(ctx context.Context, userID uuid.UUID, eventIDs []uuid.UUID) ([]models.Payment, error) {
	if len(eventIDs) == 0 {
		return []models.Payment{}, nil
	}
	query := `SELECT ` + paymentSelectFields + `
		FROM payments WHERE user_id = $1 AND event_id = ANY($2) ORDER BY payment_date DESC`
	return r.queryPayments(ctx, query, userID, eventIDs)
}

func (r *PaymentRepo) Create(ctx context.Context, p *models.Payment) error {
	query := `INSERT INTO payments (event_id, user_id, amount, payment_date, payment_method, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at`
	return r.pool.QueryRow(ctx, query,
		p.EventID, p.UserID, p.Amount, p.PaymentDate, p.PaymentMethod, p.Notes,
	).Scan(&p.ID, &p.CreatedAt)
}

func (r *PaymentRepo) Update(ctx context.Context, userID uuid.UUID, p *models.Payment) error {
	query := `UPDATE payments SET amount=$2, payment_date=$3, payment_method=$4, notes=$5
		WHERE id=$1 AND user_id=$6
		RETURNING event_id, user_id, created_at`
	return r.pool.QueryRow(ctx, query,
		p.ID, p.Amount, p.PaymentDate, p.PaymentMethod, p.Notes, userID,
	).Scan(&p.EventID, &p.UserID, &p.CreatedAt)
}

func (r *PaymentRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM payments WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("payment not found")
	}
	return nil
}

func (r *PaymentRepo) queryPayments(ctx context.Context, query string, args ...interface{}) ([]models.Payment, error) {
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		var p models.Payment
		if err := rows.Scan(&p.ID, &p.EventID, &p.UserID, &p.Amount,
			&p.PaymentDate, &p.PaymentMethod, &p.Notes, &p.CreatedAt); err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating payments: %w", err)
	}
	return payments, nil
}
