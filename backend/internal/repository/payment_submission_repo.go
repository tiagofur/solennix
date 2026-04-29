package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type PaymentSubmissionRepo struct {
	pool *pgxpool.Pool
}

func NewPaymentSubmissionRepo(pool *pgxpool.Pool) *PaymentSubmissionRepo {
	return &PaymentSubmissionRepo{pool: pool}
}

const paymentSubmissionSelectFields = `ps.id, ps.event_id, ps.client_id, ps.user_id,
	ps.amount, ps.transfer_ref, ps.receipt_file_url, ps.status,
	ps.submitted_at, ps.reviewed_by, ps.reviewed_at, ps.rejection_reason,
	ps.linked_payment_id, ps.created_at, ps.updated_at`

func scanPaymentSubmission(row pgx.Row) (*models.PaymentSubmission, error) {
	ps := &models.PaymentSubmission{}
	err := row.Scan(
		&ps.ID, &ps.EventID, &ps.ClientID, &ps.UserID,
		&ps.Amount, &ps.TransferRef, &ps.ReceiptFileURL, &ps.Status,
		&ps.SubmittedAt, &ps.ReviewedBy, &ps.ReviewedAt, &ps.RejectionReason,
		&ps.LinkedPaymentID, &ps.CreatedAt, &ps.UpdatedAt,
	)
	return ps, err
}

func scanPaymentSubmissionWithJoins(row pgx.Row) (*models.PaymentSubmission, error) {
	ps := &models.PaymentSubmission{}
	err := row.Scan(
		&ps.ID, &ps.EventID, &ps.ClientID, &ps.UserID,
		&ps.Amount, &ps.TransferRef, &ps.ReceiptFileURL, &ps.Status,
		&ps.SubmittedAt, &ps.ReviewedBy, &ps.ReviewedAt, &ps.RejectionReason,
		&ps.LinkedPaymentID, &ps.CreatedAt, &ps.UpdatedAt,
		&ps.ClientName, &ps.EventLabel,
	)
	return ps, err
}

// Create inserts a new payment submission.
func (r *PaymentSubmissionRepo) Create(ctx context.Context, ps *models.PaymentSubmission) error {
	query := `INSERT INTO payment_submissions
		(event_id, client_id, user_id, amount, transfer_ref, receipt_file_url, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, submitted_at, created_at, updated_at`

	err := r.pool.QueryRow(ctx, query,
		ps.EventID, ps.ClientID, ps.UserID, ps.Amount,
		ps.TransferRef, ps.ReceiptFileURL, ps.Status,
	).Scan(&ps.ID, &ps.SubmittedAt, &ps.CreatedAt, &ps.UpdatedAt)

	return err
}

// GetByID retrieves a payment submission with client/event details.
func (r *PaymentSubmissionRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.PaymentSubmission, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, e.service_type as event_label
		FROM payment_submissions ps
		LEFT JOIN clients c ON ps.client_id = c.id
		LEFT JOIN events e ON ps.event_id = e.id
		WHERE ps.id = $1`, paymentSubmissionSelectFields)

	row := r.pool.QueryRow(ctx, query, id)
	return scanPaymentSubmissionWithJoins(row)
}

// GetByEventID retrieves all submissions for an event.
func (r *PaymentSubmissionRepo) GetByEventID(ctx context.Context, eventID uuid.UUID) ([]*models.PaymentSubmission, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, e.service_type as event_label
		FROM payment_submissions ps
		LEFT JOIN clients c ON ps.client_id = c.id
		LEFT JOIN events e ON ps.event_id = e.id
		WHERE ps.event_id = $1
		ORDER BY ps.submitted_at DESC`, paymentSubmissionSelectFields)

	rows, err := r.pool.Query(ctx, query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	submissions := make([]*models.PaymentSubmission, 0)
	for rows.Next() {
		ps, err := scanPaymentSubmissionWithJoins(rows)
		if err != nil {
			return nil, err
		}
		submissions = append(submissions, ps)
	}

	return submissions, rows.Err()
}

// GetPendingByOrganizerID retrieves all pending submissions for an organizer (ordered by date).
func (r *PaymentSubmissionRepo) GetPendingByOrganizerID(ctx context.Context, userID uuid.UUID) ([]*models.PaymentSubmission, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, e.service_type as event_label
		FROM payment_submissions ps
		LEFT JOIN clients c ON ps.client_id = c.id
		LEFT JOIN events e ON ps.event_id = e.id
		WHERE ps.user_id = $1 AND ps.status = 'pending'
		ORDER BY ps.submitted_at DESC
		LIMIT %d`, paymentSubmissionSelectFields, GetAllSafetyLimit)

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	submissions := make([]*models.PaymentSubmission, 0)
	for rows.Next() {
		ps, err := scanPaymentSubmissionWithJoins(rows)
		if err != nil {
			return nil, err
		}
		submissions = append(submissions, ps)
	}

	return submissions, rows.Err()
}

// Update modifies a payment submission (used for approval/rejection).
func (r *PaymentSubmissionRepo) Update(ctx context.Context, ps *models.PaymentSubmission) error {
	query := `UPDATE payment_submissions
		SET status = $1, reviewed_by = $2, reviewed_at = $3,
			rejection_reason = $4, linked_payment_id = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING updated_at`

	err := r.pool.QueryRow(ctx, query,
		ps.Status, ps.ReviewedBy, ps.ReviewedAt, ps.RejectionReason, ps.LinkedPaymentID, ps.ID,
	).Scan(&ps.UpdatedAt)

	return err
}

// GetHistoryByClientEventID retrieves client's submission history for an event.
func (r *PaymentSubmissionRepo) GetHistoryByClientEventID(ctx context.Context, clientID, eventID uuid.UUID) ([]*models.PaymentSubmission, error) {
	query := fmt.Sprintf(`SELECT %s, c.name as client_name, e.service_type as event_label
		FROM payment_submissions ps
		LEFT JOIN clients c ON ps.client_id = c.id
		LEFT JOIN events e ON ps.event_id = e.id
		WHERE ps.client_id = $1 AND ps.event_id = $2
		ORDER BY ps.submitted_at DESC`, paymentSubmissionSelectFields)

	rows, err := r.pool.Query(ctx, query, clientID, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	submissions := make([]*models.PaymentSubmission, 0)
	for rows.Next() {
		ps, err := scanPaymentSubmissionWithJoins(rows)
		if err != nil {
			return nil, err
		}
		submissions = append(submissions, ps)
	}

	return submissions, rows.Err()
}
