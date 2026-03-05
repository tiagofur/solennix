package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type ClientRepo struct {
	pool *pgxpool.Pool
}

func NewClientRepo(pool *pgxpool.Pool) *ClientRepo {
	return &ClientRepo{pool: pool}
}
func (r *ClientRepo) CountByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM clients WHERE user_id = $1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (r *ClientRepo) GetAll(ctx context.Context, userID uuid.UUID) ([]models.Client, error) {
	query := `SELECT id, user_id, name, phone, email, address, city, notes, photo_url,
		total_events, total_spent, created_at, updated_at
		FROM clients WHERE user_id = $1 ORDER BY name`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []models.Client
	for rows.Next() {
		var c models.Client
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.Email,
			&c.Address, &c.City, &c.Notes, &c.PhotoURL, &c.TotalEvents, &c.TotalSpent,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		clients = append(clients, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clients: %w", err)
	}
	return clients, nil
}

func (r *ClientRepo) GetByID(ctx context.Context, id, userID uuid.UUID) (*models.Client, error) {
	c := &models.Client{}
	query := `SELECT id, user_id, name, phone, email, address, city, notes, photo_url,
		total_events, total_spent, created_at, updated_at
		FROM clients WHERE id = $1 AND user_id = $2`
	err := r.pool.QueryRow(ctx, query, id, userID).Scan(
		&c.ID, &c.UserID, &c.Name, &c.Phone, &c.Email,
		&c.Address, &c.City, &c.Notes, &c.PhotoURL, &c.TotalEvents, &c.TotalSpent,
		&c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("client not found: %w", err)
	}
	return c, nil
}

func (r *ClientRepo) Create(ctx context.Context, c *models.Client) error {
	query := `INSERT INTO clients (user_id, name, phone, email, address, city, notes, photo_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, total_events, total_spent, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		c.UserID, c.Name, c.Phone, c.Email, c.Address, c.City, c.Notes, c.PhotoURL,
	).Scan(&c.ID, &c.TotalEvents, &c.TotalSpent, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ClientRepo) Update(ctx context.Context, c *models.Client) error {
	query := `UPDATE clients SET name=$3, phone=$4, email=$5, address=$6, city=$7, notes=$8, photo_url=$9, updated_at=NOW()
		WHERE id=$1 AND user_id=$2
		RETURNING total_events, total_spent, created_at, updated_at`
	return r.pool.QueryRow(ctx, query,
		c.ID, c.UserID, c.Name, c.Phone, c.Email, c.Address, c.City, c.Notes, c.PhotoURL,
	).Scan(&c.TotalEvents, &c.TotalSpent, &c.CreatedAt, &c.UpdatedAt)
}

func (r *ClientRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM clients WHERE id=$1 AND user_id=$2", id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("client not found")
	}
	return nil
}

// Search performs a full-text search on clients for the given user
func (r *ClientRepo) Search(ctx context.Context, userID uuid.UUID, query string) ([]models.Client, error) {
	searchPattern := "%" + query + "%"
	sqlQuery := `SELECT id, user_id, name, phone, email, address, city, notes, photo_url,
		total_events, total_spent, created_at, updated_at
		FROM clients
		WHERE user_id = $1
		AND (
			name ILIKE $2 OR
			email ILIKE $2 OR
			phone ILIKE $2 OR
			city ILIKE $2
		)
		ORDER BY created_at DESC
		LIMIT 10`

	rows, err := r.pool.Query(ctx, sqlQuery, userID, searchPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []models.Client
	for rows.Next() {
		var c models.Client
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Phone, &c.Email,
			&c.Address, &c.City, &c.Notes, &c.PhotoURL, &c.TotalEvents, &c.TotalSpent,
			&c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		clients = append(clients, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating client search: %w", err)
	}

	if clients == nil {
		clients = []models.Client{}
	}

	return clients, nil
}
