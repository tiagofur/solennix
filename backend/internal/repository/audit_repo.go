package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// AuditRepo implements audit log persistence using PostgreSQL.
type AuditRepo struct {
	pool *pgxpool.Pool
}

// NewAuditRepo creates a new AuditRepo.
func NewAuditRepo(pool *pgxpool.Pool) *AuditRepo {
	return &AuditRepo{pool: pool}
}

// Create inserts a new audit log entry.
func (r *AuditRepo) Create(ctx context.Context, log *models.AuditLog) error {
	query := `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.pool.Exec(ctx, query,
		log.UserID, log.Action, log.ResourceType, log.ResourceID,
		log.Details, log.IPAddress, log.UserAgent,
	)
	if err != nil {
		return fmt.Errorf("audit create: %w", err)
	}
	return nil
}

// GetByUser returns paginated audit logs for a specific user, ordered by created_at DESC.
func (r *AuditRepo) GetByUser(ctx context.Context, userID uuid.UUID, offset, limit int) ([]models.AuditLog, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("audit count by user: %w", err)
	}

	query := `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
		FROM audit_logs WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("audit get by user: %w", err)
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.ResourceType, &l.ResourceID,
			&l.Details, &l.IPAddress, &l.UserAgent, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("audit scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("audit rows: %w", err)
	}
	return logs, total, nil
}

// GetByResource returns audit logs for a specific resource belonging to a user.
func (r *AuditRepo) GetByResource(ctx context.Context, userID uuid.UUID, resourceType string, resourceID uuid.UUID) ([]models.AuditLog, error) {
	query := `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
		FROM audit_logs WHERE user_id = $1 AND resource_type = $2 AND resource_id = $3
		ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, query, userID, resourceType, resourceID)
	if err != nil {
		return nil, fmt.Errorf("audit get by resource: %w", err)
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.ResourceType, &l.ResourceID,
			&l.Details, &l.IPAddress, &l.UserAgent, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("audit scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("audit rows: %w", err)
	}
	return logs, nil
}

// GetAll returns paginated audit logs across all users, ordered by created_at DESC.
func (r *AuditRepo) GetAll(ctx context.Context, offset, limit int) ([]models.AuditLog, int, error) {
	var total int
	countQuery := `SELECT COUNT(*) FROM audit_logs`
	if err := r.pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("audit count all: %w", err)
	}

	query := `SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`
	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("audit get all: %w", err)
	}
	defer rows.Close()

	logs := make([]models.AuditLog, 0)
	for rows.Next() {
		var l models.AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.ResourceType, &l.ResourceID,
			&l.Details, &l.IPAddress, &l.UserAgent, &l.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("audit scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("audit rows: %w", err)
	}
	return logs, total, nil
}
