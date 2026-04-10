package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

type DeviceRepo struct {
	pool *pgxpool.Pool
}

func NewDeviceRepo(pool *pgxpool.Pool) *DeviceRepo {
	return &DeviceRepo{pool: pool}
}

// Register registers a device token for push notifications.
// If the token already exists for the user, it updates the timestamp.
func (r *DeviceRepo) Register(ctx context.Context, userID uuid.UUID, token, platform string) (*models.DeviceToken, error) {
	query := `
		INSERT INTO device_tokens (user_id, token, platform)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, token) DO UPDATE SET
			platform = EXCLUDED.platform,
			updated_at = NOW()
		RETURNING id, user_id, token, platform, created_at, updated_at`

	device := &models.DeviceToken{}
	err := r.pool.QueryRow(ctx, query, userID, token, platform).Scan(
		&device.ID, &device.UserID, &device.Token, &device.Platform, &device.CreatedAt, &device.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register device: %w", err)
	}
	return device, nil
}

// Unregister removes a device token from push notification registration.
func (r *DeviceRepo) Unregister(ctx context.Context, userID uuid.UUID, token string) error {
	query := `DELETE FROM device_tokens WHERE user_id = $1 AND token = $2`
	tag, err := r.pool.Exec(ctx, query, userID, token)
	if err != nil {
		return fmt.Errorf("failed to unregister device: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("device token not found")
	}
	return nil
}

// GetByUserID returns all device tokens for a user.
func (r *DeviceRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.DeviceToken, error) {
	query := `
		SELECT id, user_id, token, platform, created_at, updated_at
		FROM device_tokens
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device tokens: %w", err)
	}
	defer rows.Close()

	devices := make([]models.DeviceToken, 0)
	for rows.Next() {
		var d models.DeviceToken
		if err := rows.Scan(&d.ID, &d.UserID, &d.Token, &d.Platform, &d.CreatedAt, &d.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan device token: %w", err)
		}
		devices = append(devices, d)
	}
	return devices, nil
}

// UnregisterAllForUser removes all device tokens for a user (e.g., on logout everywhere).
func (r *DeviceRepo) UnregisterAllForUser(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM device_tokens WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to unregister all devices: %w", err)
	}
	return nil
}
