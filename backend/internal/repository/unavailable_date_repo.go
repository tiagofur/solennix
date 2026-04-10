package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type UnavailableDateRepo struct {
	pool *pgxpool.Pool
}

func NewUnavailableDateRepo(pool *pgxpool.Pool) *UnavailableDateRepo {
	return &UnavailableDateRepo{pool: pool}
}

func (r *UnavailableDateRepo) Create(ctx context.Context, u *models.UnavailableDate) error {
	query := `INSERT INTO unavailable_dates (user_id, start_date, end_date, reason)
		VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, query, u.UserID, u.StartDate, u.EndDate, u.Reason).
		Scan(&u.ID, &u.CreatedAt, &u.UpdatedAt)
}

func (r *UnavailableDateRepo) GetByDateRange(ctx context.Context, userID uuid.UUID, start, end string) ([]models.UnavailableDate, error) {
	query := `SELECT id, user_id, to_char(start_date, 'YYYY-MM-DD'), to_char(end_date, 'YYYY-MM-DD'), reason, created_at, updated_at
		FROM unavailable_dates
		WHERE user_id = $1 AND start_date <= $3::date AND end_date >= $2::date
		ORDER BY start_date ASC`
	rows, err := r.pool.Query(ctx, query, userID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dates := make([]models.UnavailableDate, 0)
	for rows.Next() {
		var u models.UnavailableDate
		if err := rows.Scan(&u.ID, &u.UserID, &u.StartDate, &u.EndDate, &u.Reason, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, err
		}
		dates = append(dates, u)
	}
	// Return empty slice explicitly instead of nil
	if len(dates) == 0 {
		return []models.UnavailableDate{}, nil
	}
	return dates, nil
}

func (r *UnavailableDateRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM unavailable_dates WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("unavailable date not found")
	}
	return nil
}
