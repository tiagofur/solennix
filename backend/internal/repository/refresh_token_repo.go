package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RefreshTokenRepo handles refresh token family tracking for token rotation.
type RefreshTokenRepo struct {
	pool *pgxpool.Pool
}

func NewRefreshTokenRepo(pool *pgxpool.Pool) *RefreshTokenRepo {
	return &RefreshTokenRepo{pool: pool}
}

// Store saves a refresh token record (token_hash + family_id).
func (r *RefreshTokenRepo) Store(ctx context.Context, userID, familyID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO refresh_token_families (user_id, family_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
		userID, familyID, tokenHash, expiresAt)
	return err
}

// Consume marks a token as used and returns its family_id and user_id.
// Returns error if token not found or already used (reuse = compromise).
func (r *RefreshTokenRepo) Consume(ctx context.Context, tokenHash string) (uuid.UUID, uuid.UUID, error) {
	var familyID, userID uuid.UUID
	var used bool
	err := r.pool.QueryRow(ctx,
		`SELECT family_id, user_id, used FROM refresh_token_families WHERE token_hash = $1 AND expires_at > NOW()`,
		tokenHash).Scan(&familyID, &userID, &used)
	if err != nil {
		return uuid.Nil, uuid.Nil, fmt.Errorf("refresh token not found or expired")
	}
	if used {
		// TOKEN REUSE DETECTED — possible compromise
		return familyID, userID, fmt.Errorf("refresh token reuse detected")
	}
	// Mark as used
	_, err = r.pool.Exec(ctx,
		`UPDATE refresh_token_families SET used = TRUE WHERE token_hash = $1`, tokenHash)
	return familyID, userID, err
}

// RevokeFamily invalidates ALL tokens in a family (used when reuse is detected).
func (r *RefreshTokenRepo) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_token_families WHERE family_id = $1`, familyID)
	return err
}

// RevokeAllForUser invalidates ALL refresh tokens for a user (used on logout/password change).
func (r *RefreshTokenRepo) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM refresh_token_families WHERE user_id = $1`, userID)
	return err
}

// CleanupExpired removes expired token records.
func (r *RefreshTokenRepo) CleanupExpired(ctx context.Context) (int, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM refresh_token_families WHERE expires_at <= NOW()`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
