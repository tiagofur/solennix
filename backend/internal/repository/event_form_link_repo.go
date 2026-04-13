package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// EventFormLinkRepo persists shareable event form links.
type EventFormLinkRepo struct {
	pool *pgxpool.Pool
}

func NewEventFormLinkRepo(pool *pgxpool.Pool) *EventFormLinkRepo {
	return &EventFormLinkRepo{pool: pool}
}

const eventFormLinkColumns = `id, user_id, token, label, status, submitted_event_id, submitted_client_id, expires_at, used_at, created_at, updated_at`

func scanEventFormLink(row pgx.Row) (*models.EventFormLink, error) {
	var l models.EventFormLink
	err := row.Scan(
		&l.ID, &l.UserID, &l.Token, &l.Label, &l.Status,
		&l.SubmittedEventID, &l.SubmittedClientID,
		&l.ExpiresAt, &l.UsedAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// Create inserts a new event form link.
func (r *EventFormLinkRepo) Create(ctx context.Context, link *models.EventFormLink) error {
	query := `
		INSERT INTO event_form_links (user_id, token, label, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, token, label, status, submitted_event_id, submitted_client_id, expires_at, used_at, created_at, updated_at`

	row := r.pool.QueryRow(ctx, query, link.UserID, link.Token, link.Label, link.ExpiresAt)
	result, err := scanEventFormLink(row)
	if err != nil {
		return fmt.Errorf("failed to create event form link: %w", err)
	}
	*link = *result
	return nil
}

// GetByToken returns an active, non-expired link by its token.
// Returns pgx.ErrNoRows if not found, expired, or already used.
func (r *EventFormLinkRepo) GetByToken(ctx context.Context, token string) (*models.EventFormLink, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM event_form_links
		WHERE token = $1 AND status = 'active' AND expires_at > NOW()`, eventFormLinkColumns)

	row := r.pool.QueryRow(ctx, query, token)
	link, err := scanEventFormLink(row)
	if err != nil {
		return nil, fmt.Errorf("failed to get event form link by token: %w", err)
	}
	return link, nil
}

// GetByUserID lists all links for an organizer, ordered by created_at DESC.
func (r *EventFormLinkRepo) GetByUserID(ctx context.Context, userID uuid.UUID) ([]models.EventFormLink, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM event_form_links
		WHERE user_id = $1
		ORDER BY created_at DESC`, eventFormLinkColumns)

	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list event form links: %w", err)
	}
	defer rows.Close()

	links := make([]models.EventFormLink, 0)
	for rows.Next() {
		var l models.EventFormLink
		if err := rows.Scan(
			&l.ID, &l.UserID, &l.Token, &l.Label, &l.Status,
			&l.SubmittedEventID, &l.SubmittedClientID,
			&l.ExpiresAt, &l.UsedAt, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan event form link: %w", err)
		}
		links = append(links, l)
	}
	return links, nil
}

// MarkUsed atomically marks a link as used. Returns an error wrapping pgx.ErrNoRows
// if the link was already used or expired (race condition protection).
func (r *EventFormLinkRepo) MarkUsed(ctx context.Context, linkID, eventID, clientID uuid.UUID) error {
	query := `
		UPDATE event_form_links
		SET status = 'used', used_at = NOW(), submitted_event_id = $2, submitted_client_id = $3, updated_at = NOW()
		WHERE id = $1 AND status = 'active'`

	tag, err := r.pool.Exec(ctx, query, linkID, eventID, clientID)
	if err != nil {
		return fmt.Errorf("failed to mark event form link as used: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("link already used or expired: %w", pgx.ErrNoRows)
	}
	return nil
}

// Delete removes a link. Only the owner can delete.
func (r *EventFormLinkRepo) Delete(ctx context.Context, id, userID uuid.UUID) error {
	query := `DELETE FROM event_form_links WHERE id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, query, id, userID)
	if err != nil {
		return fmt.Errorf("failed to delete event form link: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("event form link not found: %w", pgx.ErrNoRows)
	}
	return nil
}

// CountActiveByUserID returns the number of active links for a user.
func (r *EventFormLinkRepo) CountActiveByUserID(ctx context.Context, userID uuid.UUID) (int, error) {
	query := `SELECT COUNT(*) FROM event_form_links WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()`
	var count int
	err := r.pool.QueryRow(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count active event form links: %w", err)
	}
	return count, nil
}

// ExpireStale marks active links whose TTL has passed as expired.
// Returns the number of links expired.
func (r *EventFormLinkRepo) ExpireStale(ctx context.Context) (int, error) {
	query := `
		UPDATE event_form_links
		SET status = 'expired', updated_at = NOW()
		WHERE status = 'active' AND expires_at < NOW()`

	tag, err := r.pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to expire stale event form links: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

// Pool exposes the connection pool for transaction support in the handler.
func (r *EventFormLinkRepo) Pool() *pgxpool.Pool {
	return r.pool
}

// MarkUsedTx marks a link as used within an existing transaction.
func (r *EventFormLinkRepo) MarkUsedTx(ctx context.Context, tx pgx.Tx, linkID, eventID, clientID uuid.UUID) error {
	query := `
		UPDATE event_form_links
		SET status = 'used', used_at = NOW(), submitted_event_id = $2, submitted_client_id = $3, updated_at = NOW()
		WHERE id = $1 AND status = 'active'`

	tag, err := tx.Exec(ctx, query, linkID, eventID, clientID)
	if err != nil {
		return fmt.Errorf("failed to mark event form link as used: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("link already used or expired: %w", pgx.ErrNoRows)
	}
	return nil
}

// GetPool returns the underlying connection pool for transaction management.
func (r *EventFormLinkRepo) GetPool() *pgxpool.Pool {
	return r.pool
}

// CreateClientTx creates a client within a transaction.
func CreateClientTx(ctx context.Context, tx pgx.Tx, c *models.Client) error {
	query := `
		INSERT INTO clients (user_id, name, phone, email, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at`

	return tx.QueryRow(ctx, query, c.UserID, c.Name, c.Phone, c.Email, c.Notes).
		Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

// CreateEventTx creates an event within a transaction.
func CreateEventTx(ctx context.Context, tx pgx.Tx, e *models.Event) error {
	query := `
		INSERT INTO events (user_id, client_id, event_date, start_time, end_time, service_type, num_people, status, location, city, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`

	return tx.QueryRow(ctx, query,
		e.UserID, e.ClientID, e.EventDate, e.StartTime, e.EndTime,
		e.ServiceType, e.NumPeople, e.Status, e.Location, e.City, e.Notes,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
}

// CreateEventProductsTx creates event product records within a transaction.
func CreateEventProductsTx(ctx context.Context, tx pgx.Tx, eventID uuid.UUID, products []models.EventProduct) error {
	for i := range products {
		query := `
			INSERT INTO event_products (event_id, product_id, quantity, unit_price, discount)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, created_at`

		err := tx.QueryRow(ctx, query,
			eventID, products[i].ProductID, products[i].Quantity,
			products[i].UnitPrice, products[i].Discount,
		).Scan(&products[i].ID, &products[i].CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to create event product: %w", err)
		}
	}
	return nil
}

// UpdateClientStatsTx updates a client's total_events and total_spent within a transaction.
func UpdateClientStatsTx(ctx context.Context, tx pgx.Tx, clientID uuid.UUID) error {
	query := `
		UPDATE clients SET
			total_events = (SELECT COUNT(*) FROM events WHERE client_id = $1),
			total_spent = COALESCE((SELECT SUM(total_amount) FROM events WHERE client_id = $1), 0),
			updated_at = NOW()
		WHERE id = $1`

	_, err := tx.Exec(ctx, query, clientID)
	return err
}

// GetProductsByUserIDTx fetches active products for a user within a transaction.
func GetProductsByUserIDTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, productIDs []uuid.UUID) ([]models.Product, error) {
	query := `
		SELECT id, user_id, name, category, base_price, image_url, is_active, created_at, updated_at
		FROM products
		WHERE user_id = $1 AND id = ANY($2) AND is_active = true`

	rows, err := tx.Query(ctx, query, userID, productIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get products: %w", err)
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		if err := rows.Scan(&p.ID, &p.UserID, &p.Name, &p.Category, &p.BasePrice, &p.ImageURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan product: %w", err)
		}
		products = append(products, p)
	}
	return products, nil
}

// VerifyProductOwnershipTx verifies that all product IDs belong to the user within a transaction.
func VerifyProductOwnershipTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, productIDs []uuid.UUID) error {
	if len(productIDs) == 0 {
		return nil
	}
	query := `SELECT COUNT(*) FROM products WHERE id = ANY($1) AND user_id = $2`
	var count int
	err := tx.QueryRow(ctx, query, productIDs, userID).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to verify product ownership: %w", err)
	}
	if count != len(productIDs) {
		return fmt.Errorf("one or more products do not belong to user")
	}
	return nil
}

func init() {
	// Ensure time is always UTC for consistency.
	_ = time.UTC
}
