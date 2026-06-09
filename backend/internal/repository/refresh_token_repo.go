package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

// Consume atomically marks a token as used via a compare-and-set UPDATE.
// Only the first concurrent caller for a given token_hash will flip used=FALSE→TRUE.
//
// Returns:
//   - (familyID, userID, nil)   on success
//   - (familyID, uuid.Nil, "refresh token reuse detected")  when row exists but was already used
//   - (uuid.Nil, uuid.Nil, "refresh token not found or expired") when the row does not exist at all
func (r *RefreshTokenRepo) Consume(ctx context.Context, tokenHash string) (uuid.UUID, uuid.UUID, error) {
	var familyID, userID uuid.UUID

	// Atomic CAS: flip used FALSE→TRUE only if not yet used and not expired.
	err := r.pool.QueryRow(ctx,
		`UPDATE refresh_token_families
		    SET used = TRUE
		  WHERE token_hash = $1
		    AND used = FALSE
		    AND expires_at > NOW()
		RETURNING family_id, user_id`,
		tokenHash).Scan(&familyID, &userID)

	if err == nil {
		// Row flipped — success.
		return familyID, userID, nil
	}

	if err != pgx.ErrNoRows {
		// Unexpected DB error.
		return uuid.Nil, uuid.Nil, fmt.Errorf("refresh token consume: %w", err)
	}

	// Zero rows returned — either token was already used, expired, or never existed.
	// Query for a used=TRUE row (regardless of expiry) to detect reuse compromise.
	// Expired-but-unused tokens are treated as "not found or expired", not reuse.
	var used bool
	err2 := r.pool.QueryRow(ctx,
		`SELECT family_id, user_id, used FROM refresh_token_families WHERE token_hash = $1`,
		tokenHash).Scan(&familyID, &userID, &used)

	if err2 == nil && used {
		// Row exists and was already consumed — TOKEN REUSE DETECTED.
		return familyID, userID, fmt.Errorf("refresh token reuse detected")
	}

	// Row does not exist, or exists but unused (must have expired between UPDATE and now).
	return uuid.Nil, uuid.Nil, fmt.Errorf("refresh token not found or expired")
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
