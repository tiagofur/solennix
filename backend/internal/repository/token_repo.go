package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RevokedTokenRepo handles persistent token blacklisting.
type RevokedTokenRepo struct {
	pool *pgxpool.Pool
}

func NewRevokedTokenRepo(pool *pgxpool.Pool) *RevokedTokenRepo {
	return &RevokedTokenRepo{pool: pool}
}

// Revoke adds a token hash to the blacklist.
func (r *RevokedTokenRepo) Revoke(ctx context.Context, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO revoked_tokens (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING`,
		tokenHash, expiresAt)
	return err
}

// IsRevoked checks if a token hash has been blacklisted.
// Returns (false, err) on DB failure (fail-closed) so callers can respond with 503.
func (r *RevokedTokenRepo) IsRevoked(ctx context.Context, tokenHash string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE token_hash = $1)`,
		tokenHash).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}

// CleanupExpired removes tokens that have passed their expiry time.
func (r *RevokedTokenRepo) CleanupExpired(ctx context.Context) (int, error) {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM revoked_tokens WHERE expires_at < NOW()`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
