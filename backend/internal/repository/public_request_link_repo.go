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

// PublicRequestLinkRepo persists shareable public request links.
type PublicRequestLinkRepo struct {
	pool *pgxpool.Pool
}

func NewPublicRequestLinkRepo(pool *pgxpool.Pool) *PublicRequestLinkRepo {
	return &PublicRequestLinkRepo{pool: pool}
}

const publicRequestLinkFields = `
	id, organizer_user_id, token, label, status, submit_mode,
	max_uses, use_count, expires_at, created_at, updated_at`

func scanPublicRequestLink(row pgx.Row) (*models.PublicRequestLink, error) {
	var l models.PublicRequestLink
	var status, mode string
	err := row.Scan(
		&l.ID, &l.OrganizerUserID, &l.Token, &l.Label, &status, &mode,
		&l.MaxUses, &l.UseCount, &l.ExpiresAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	l.Status = models.PublicRequestLinkStatus(status)
	l.SubmitMode = models.SubmitMode(mode)
	return &l, nil
}

// Create inserts a new public request link.
func (r *PublicRequestLinkRepo) Create(ctx context.Context, link *models.PublicRequestLink) error {
	if link.SubmitMode == "" {
		link.SubmitMode = models.SubmitModeAutoEvent
	}
	if link.Status == "" {
		link.Status = models.PublicRequestLinkActive
	}
	query := `
		INSERT INTO public_request_links
			(organizer_user_id, token, label, status, submit_mode, max_uses, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING ` + publicRequestLinkFields
	row := r.pool.QueryRow(ctx, query,
		link.OrganizerUserID, link.Token, link.Label, string(link.Status),
		string(link.SubmitMode), link.MaxUses, link.ExpiresAt,
	)
	result, err := scanPublicRequestLink(row)
	if err != nil {
		return fmt.Errorf("create public request link: %w", err)
	}
	*link = *result
	return nil
}

// GetByToken returns a link by token regardless of status (caller checks usable).
func (r *PublicRequestLinkRepo) GetByToken(ctx context.Context, token string) (*models.PublicRequestLink, error) {
	query := `SELECT ` + publicRequestLinkFields + ` FROM public_request_links WHERE token = $1`
	link, err := scanPublicRequestLink(r.pool.QueryRow(ctx, query, token))
	if err != nil {
		return nil, fmt.Errorf("get public request link by token: %w", err)
	}
	return link, nil
}

// GetByID returns a link scoped to organizer (tenant isolation).
func (r *PublicRequestLinkRepo) GetByID(ctx context.Context, id, organizerUserID uuid.UUID) (*models.PublicRequestLink, error) {
	query := `SELECT ` + publicRequestLinkFields + `
		FROM public_request_links WHERE id = $1 AND organizer_user_id = $2`
	link, err := scanPublicRequestLink(r.pool.QueryRow(ctx, query, id, organizerUserID))
	if err != nil {
		return nil, fmt.Errorf("get public request link: %w", err)
	}
	return link, nil
}

// ListByOrganizer returns all links for an organizer, newest first.
func (r *PublicRequestLinkRepo) ListByOrganizer(ctx context.Context, organizerUserID uuid.UUID) ([]models.PublicRequestLink, error) {
	query := `SELECT ` + publicRequestLinkFields + `
		FROM public_request_links
		WHERE organizer_user_id = $1
		ORDER BY created_at DESC`
	rows, err := r.pool.Query(ctx, query, organizerUserID)
	if err != nil {
		return nil, fmt.Errorf("list public request links: %w", err)
	}
	defer rows.Close()

	out := make([]models.PublicRequestLink, 0)
	for rows.Next() {
		var l models.PublicRequestLink
		var status, mode string
		if err := rows.Scan(
			&l.ID, &l.OrganizerUserID, &l.Token, &l.Label, &status, &mode,
			&l.MaxUses, &l.UseCount, &l.ExpiresAt, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan public request link: %w", err)
		}
		l.Status = models.PublicRequestLinkStatus(status)
		l.SubmitMode = models.SubmitMode(mode)
		out = append(out, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public request links: %w", err)
	}
	return out, nil
}

const incrementUseSQL = `
	UPDATE public_request_links
	SET use_count = use_count + 1,
	    status = CASE
	        WHEN max_uses IS NOT NULL AND use_count + 1 >= max_uses THEN 'used'
	        ELSE status
	    END,
	    updated_at = NOW()
	WHERE id = $1
	  AND status = 'active'
	  AND (expires_at IS NULL OR expires_at > NOW())
	  AND (max_uses IS NULL OR use_count < max_uses)`

// IncrementUse bumps use_count; marks status=used when max_uses is reached.
// Atomic: only updates active links that still have capacity.
func (r *PublicRequestLinkRepo) IncrementUse(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, incrementUseSQL, id)
	if err != nil {
		return fmt.Errorf("increment public request link use: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("link not usable: %w", pgx.ErrNoRows)
	}
	return nil
}

// IncrementUseTx increments use_count inside a transaction.
func (r *PublicRequestLinkRepo) IncrementUseTx(ctx context.Context, tx pgx.Tx, id uuid.UUID) error {
	tag, err := tx.Exec(ctx, incrementUseSQL, id)
	if err != nil {
		return fmt.Errorf("increment public request link use: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("link not usable: %w", pgx.ErrNoRows)
	}
	return nil
}

// Revoke sets status=revoked for an active link owned by the organizer.
func (r *PublicRequestLinkRepo) Revoke(ctx context.Context, id, organizerUserID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_request_links
		SET status = 'revoked', updated_at = NOW()
		WHERE id = $1 AND organizer_user_id = $2 AND status = 'active'`,
		id, organizerUserID)
	if err != nil {
		return fmt.Errorf("revoke public request link: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("public request link not found or not active: %w", pgx.ErrNoRows)
	}
	return nil
}

// Delete hard-deletes a link (organizer-owned). Prefer Revoke for soft disable.
func (r *PublicRequestLinkRepo) Delete(ctx context.Context, id, organizerUserID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM public_request_links WHERE id = $1 AND organizer_user_id = $2`,
		id, organizerUserID)
	if err != nil {
		return fmt.Errorf("delete public request link: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("public request link not found: %w", pgx.ErrNoRows)
	}
	return nil
}

// CountActive returns active, non-expired links for plan limit checks.
func (r *PublicRequestLinkRepo) CountActive(ctx context.Context, organizerUserID uuid.UUID) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public_request_links
		WHERE organizer_user_id = $1
		  AND status = 'active'
		  AND (expires_at IS NULL OR expires_at > NOW())`,
		organizerUserID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active public request links: %w", err)
	}
	return count, nil
}

// ExpireStale marks active links past expires_at as expired.
func (r *PublicRequestLinkRepo) ExpireStale(ctx context.Context) (int, error) {
	tag, err := r.pool.Exec(ctx, `
		UPDATE public_request_links
		SET status = 'expired', updated_at = NOW()
		WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()`)
	if err != nil {
		return 0, fmt.Errorf("expire stale public request links: %w", err)
	}
	return int(tag.RowsAffected()), nil
}

// Pool exposes the connection pool for plan-limit transactions.
func (r *PublicRequestLinkRepo) Pool() *pgxpool.Pool {
	return r.pool
}

// GetPool returns the pool (handler plan-limit pattern).
func (r *PublicRequestLinkRepo) GetPool() *pgxpool.Pool {
	return r.pool
}

// Ensure time import used for documentation of expiry semantics.
var _ = time.UTC
