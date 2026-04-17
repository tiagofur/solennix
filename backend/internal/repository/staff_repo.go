package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type StaffRepo struct {
	pool *pgxpool.Pool
}

func NewStaffRepo(pool *pgxpool.Pool) *StaffRepo {
	return &StaffRepo{pool: pool}
}

func (r *StaffRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}

const staffColumns = `id, user_id, name, role_label, phone, email, notes,
	notification_email_opt_in, invited_user_id, created_at, updated_at`

func scanStaff(rows interface {
	Scan(...any) error
}, s *models.Staff) error {
	return rows.Scan(&s.ID, &s.UserID, &s.Name, &s.RoleLabel, &s.Phone, &s.Email,
		&s.Notes, &s.NotificationEmailOptIn, &s.InvitedUserID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *StaffRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Staff, error) {
	query := fmt.Sprintf(`SELECT %s FROM staff WHERE user_id = $1 ORDER BY name LIMIT %d`,
		staffColumns, GetAllSafetyLimit)
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating staff: %w", err)
	}
	return result, nil
}

var staffAllowedSortCols = []string{"name", "created_at", "role_label"}

func (r *StaffRepo) GetAllPaginated(ctx context.Context, userID uuid.UUID, offset, limit int, sortCol, order string) ([]models.Staff, int, error) {
	sortCol = safeSortColumn(sortCol, staffAllowedSortCols, "name")
	order = safeSortOrder(order)

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM staff WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count staff: %w", err)
	}

	query := fmt.Sprintf(`SELECT %s FROM staff WHERE user_id = $1
		ORDER BY %s %s LIMIT $2 OFFSET $3`, staffColumns, sortCol, order)
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, 0, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating paginated staff: %w", err)
	}
	return result, total, nil
}

func (r *StaffRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Staff, error) {
	s := &models.Staff{}
	query := fmt.Sprintf(`SELECT %s FROM staff WHERE id = $1 AND user_id = $2`, staffColumns)
	row := r.pool.QueryRow(ctx, query, id, userID)
	if err := scanStaff(row, s); err != nil {
		return nil, fmt.Errorf("staff not found: %w", err)
	}
	return s, nil
}

func (r *StaffRepo) Create(ctx context.Context, s *models.Staff) error {
	query := `INSERT INTO staff (user_id, name, role_label, phone, email, notes, notification_email_opt_in)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		s.UserID, s.Name, s.RoleLabel, s.Phone, s.Email, s.Notes, s.NotificationEmailOptIn,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *StaffRepo) Update(ctx context.Context, s *models.Staff) error {
	query := `UPDATE staff SET name=$3, role_label=$4, phone=$5, email=$6, notes=$7,
		notification_email_opt_in=$8, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		s.ID, s.UserID, s.Name, s.RoleLabel, s.Phone, s.Email, s.Notes, s.NotificationEmailOptIn,
	).Scan(&s.CreatedAt, &s.UpdatedAt)
}

func (r *StaffRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM staff WHERE id=$1 AND user_id=$2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("staff not found")
	}
	return nil
}

// Search performs a fuzzy search on staff using ILIKE + pg_trgm similarity.
func (r *StaffRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Staff, error) {
	sqlQuery := fmt.Sprintf(`SELECT %s FROM staff
		WHERE user_id = $1
		AND (
			name ILIKE '%%' || $2 || '%%' OR
			role_label ILIKE '%%' || $2 || '%%' OR
			email ILIKE '%%' || $2 || '%%' OR
			phone ILIKE '%%' || $2 || '%%' OR
			similarity(name, $2) > 0.3
		)
		ORDER BY similarity(name, $2) DESC, created_at DESC
		LIMIT 10`, staffColumns)

	rows, err := r.pool.Query(ctx, sqlQuery, userID, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]models.Staff, 0)
	for rows.Next() {
		var s models.Staff
		if err := scanStaff(rows, &s); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating staff search: %w", err)
	}
	return result, nil
}
