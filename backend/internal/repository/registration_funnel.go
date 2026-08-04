package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RegistrationFunnelEvent is one step in the registration conversion funnel (analytics slice 3).
type RegistrationFunnelEvent struct {
	Step        string
	Method      string
	Platform    string
	VisitorHash string
	UserID      *uuid.UUID
	DeviceClass string
	CountryCode *string
	OccurredAt  time.Time
}

// RegistrationFunnelRepo records registration funnel steps.
type RegistrationFunnelRepo struct {
	pool *pgxpool.Pool
}

func NewRegistrationFunnelRepo(pool *pgxpool.Pool) *RegistrationFunnelRepo {
	return &RegistrationFunnelRepo{pool: pool}
}

// Record inserts one funnel event. For durable steps (registered / email_verified /
// first_login) partial unique indexes enforce once-per-user; unique violations are ignored.
func (r *RegistrationFunnelRepo) Record(ctx context.Context, e RegistrationFunnelEvent) error {
	if e.Step == "" {
		return fmt.Errorf("registration funnel: missing step")
	}
	method := e.Method
	if method == "" {
		method = "unknown"
	}
	platform := e.Platform
	if platform == "" {
		platform = "unknown"
	}
	device := e.DeviceClass
	if device == "" {
		device = "unknown"
	}

	var visitor any
	if e.VisitorHash != "" {
		visitor = e.VisitorHash
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO registration_funnel_events (
			step, method, platform, visitor_hash, user_id, device_class, country_code, occurred_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))`,
		e.Step, method, platform, visitor, e.UserID, device, e.CountryCode, nullTime(e.OccurredAt),
	)
	if err != nil {
		// Once-per-user steps: treat unique violation as success (idempotent).
		if isUniqueViolation(err) {
			return nil
		}
		return fmt.Errorf("record registration funnel: %w", err)
	}
	return nil
}
