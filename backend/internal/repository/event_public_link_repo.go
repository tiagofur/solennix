package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tiagofur/solennix-backend/internal/models"
)

// EventPublicLinkRepo persists shareable client-portal links per event.
// Each event has at most one row with status='active' at any time; older
// rows stay around as `revoked` history. See PRD/12 feature A.
type EventPublicLinkRepo struct {
	pool *pgxpool.Pool
}

func NewEventPublicLinkRepo(pool *pgxpool.Pool) *EventPublicLinkRepo {
	return &EventPublicLinkRepo{pool: pool}
}

const eventPublicLinkColumns = `id, event_id, user_id, token, status, expires_at, revoked_at, created_at, updated_at`

func scanEventPublicLink(row pgx.Row) (*models.EventPublicLink, error) {
	var l models.EventPublicLink
	err := row.Scan(
		&l.ID, &l.EventID, &l.UserID, &l.Token, &l.Status,
		&l.ExpiresAt, &l.RevokedAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// Create revokes any existing active link for the event and inserts a new
// active row with the given token. Atomic — both statements run inside the
// same transaction so a concurrent Create on the same event either wins or
// loses cleanly (the partial unique index enforces the invariant).
func (r *EventPublicLinkRepo) Create(ctx context.Context, link *models.EventPublicLink) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // rollback is a no-op after commit

	// Revoke any active link for this event first.
	if _, err := tx.Exec(ctx, `
		UPDATE event_public_links
		SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
		WHERE event_id = $1 AND status = 'active'`, link.EventID); err != nil {
		return fmt.Errorf("failed to revoke previous active link: %w", err)
	}

	// Insert the new active row.
	row := tx.QueryRow(ctx, `
		INSERT INTO event_public_links (event_id, user_id, token, expires_at)
		VALUES ($1, $2, $3, $4)
		RETURNING `+eventPublicLinkColumns,
		link.EventID, link.UserID, link.Token, link.ExpiresAt,
	)
	result, err := scanEventPublicLink(row)
	if err != nil {
		return fmt.Errorf("failed to insert event public link: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	*link = *result
	return nil
}

// GetActiveByEventID returns the currently active link for the event, if
// any. Returns pgx.ErrNoRows if there is no active link. The user_id check
// is a multi-tenant guard — callers already know the userID from middleware.
func (r *EventPublicLinkRepo) GetActiveByEventID(ctx context.Context, eventID, userID uuid.UUID) (*models.EventPublicLink, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM event_public_links
		WHERE event_id = $1 AND user_id = $2 AND status = 'active'
		LIMIT 1`, eventPublicLinkColumns)

	row := r.pool.QueryRow(ctx, query, eventID, userID)
	link, err := scanEventPublicLink(row)
	if err != nil {
		return nil, fmt.Errorf("failed to get active event public link: %w", err)
	}
	return link, nil
}

// GetByToken returns a link by its public token regardless of status —
// the caller (public handler) is responsible for checking status and
// expiry so it can distinguish "wrong token" (404) from "revoked/expired"
// (410 Gone). Returns pgx.ErrNoRows if the token has never existed.
func (r *EventPublicLinkRepo) GetByToken(ctx context.Context, token string) (*models.EventPublicLink, error) {
	query := fmt.Sprintf(`
		SELECT %s FROM event_public_links
		WHERE token = $1`, eventPublicLinkColumns)

	row := r.pool.QueryRow(ctx, query, token)
	link, err := scanEventPublicLink(row)
	if err != nil {
		return nil, fmt.Errorf("failed to get event public link by token: %w", err)
	}
	return link, nil
}

// Revoke marks the active link for an event as revoked. No-op if no
// active link exists. Returns pgx.ErrNoRows if nothing was revoked, so
// the handler can respond 404.
func (r *EventPublicLinkRepo) Revoke(ctx context.Context, eventID, userID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE event_public_links
		SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
		WHERE event_id = $1 AND user_id = $2 AND status = 'active'`,
		eventID, userID,
	)
	if err != nil {
		return fmt.Errorf("failed to revoke event public link: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("no active public link to revoke: %w", pgx.ErrNoRows)
	}
	return nil
}

// Pool exposes the connection pool for handler-level transaction needs.
func (r *EventPublicLinkRepo) Pool() *pgxpool.Pool {
	return r.pool
}
