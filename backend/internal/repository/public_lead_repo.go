package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// PublicLeadRepo persists inquiries submitted to an organizer's public profile.
type PublicLeadRepo struct {
	pool *pgxpool.Pool
}

func NewPublicLeadRepo(pool *pgxpool.Pool) *PublicLeadRepo {
	return &PublicLeadRepo{pool: pool}
}

const publicLeadFields = `
	id, organizer_user_id, name, contact, event_date, event_type,
	num_guests, message, source, is_read, created_at`

// Create inserts a public lead and returns the stored row.
func (r *PublicLeadRepo) Create(ctx context.Context, lead *models.PublicLead) error {
	err := r.pool.QueryRow(ctx, `
		INSERT INTO public_leads
			(organizer_user_id, name, contact, event_date, event_type, num_guests, message, source, submitted_from_ip)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING `+publicLeadFields,
		lead.OrganizerUserID, lead.Name, lead.Contact, lead.EventDate, lead.EventType,
		lead.NumGuests, lead.Message, lead.Source, nil, // submitted_from_ip set by handler via context if needed
	).Scan(
		&lead.ID, &lead.OrganizerUserID, &lead.Name, &lead.Contact, &lead.EventDate, &lead.EventType,
		&lead.NumGuests, &lead.Message, &lead.Source, &lead.IsRead, &lead.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("create public lead: %w", err)
	}
	return nil
}

// ListByOrganizer returns the most recent leads for an organizer.
func (r *PublicLeadRepo) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicLead, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+publicLeadFields+`
		FROM public_leads
		WHERE organizer_user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`, organizerUserID, GetAllSafetyLimit)
	if err != nil {
		return nil, fmt.Errorf("list public leads: %w", err)
	}
	defer rows.Close()

	var out []models.PublicLead
	for rows.Next() {
		var l models.PublicLead
		if err := rows.Scan(
			&l.ID, &l.OrganizerUserID, &l.Name, &l.Contact, &l.EventDate, &l.EventType,
			&l.NumGuests, &l.Message, &l.Source, &l.IsRead, &l.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan public lead: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// CountUnreadByOrganizer returns the number of unread leads for an organizer.
func (r *PublicLeadRepo) CountUnreadByOrganizer(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM public_leads WHERE organizer_user_id = $1 AND is_read = false`,
		organizerUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count unread public leads: %w", err)
	}
	return count, nil
}

// MarkRead flags a lead as read by the organizer.
func (r *PublicLeadRepo) MarkRead(ctx context.Context, id, organizerUserID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`UPDATE public_leads SET is_read = true WHERE id = $1 AND organizer_user_id = $2`,
		id, organizerUserID)
	if err != nil {
		return fmt.Errorf("mark public lead read: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("mark public lead read: %w", pgx.ErrNoRows)
	}
	return nil
}
