package handlers

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrPlanLimitReached is returned by withPlanLimit when the user has hit their
// plan quota. Callers should map this to a 403 response using writePlanLimitError.
var ErrPlanLimitReached = errors.New("plan limit reached")

// withPlanLimit acquires a per-(user,resource) advisory lock, counts under it,
// rejects if the limit is reached, and runs insertFn — all in one transaction.
//
// resourceKey scopes the advisory lock (e.g. "clients", "events", "catalog").
// countSQL must accept exactly one positional parameter ($1 = userID) and
// return a single integer row.
//
// insertFn receives the open transaction and is responsible for executing the
// INSERT. On success it must NOT commit — withPlanLimit commits after insertFn
// returns nil.
//
// If pool is nil (e.g. unit tests using mocks) the function returns
// errPoolNil so callers can fall back to the non-transactional path.
func withPlanLimit(
	ctx context.Context,
	pool *pgxpool.Pool,
	userID uuid.UUID,
	resourceKey string,
	limit int,
	countSQL string,
	insertFn func(ctx context.Context, tx pgx.Tx) error,
) error {
	if pool == nil {
		return errPoolNil
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	// Acquire a PostgreSQL advisory lock scoped to this transaction.
	// hashtext($1) is deterministic and collides only within the same text
	// value, which is unlikely across different (user, resource) combinations.
	// Two concurrent requests for the same user + resource will serialize here.
	lockKey := userID.String() + ":" + resourceKey
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return err
	}

	var count int
	if err := tx.QueryRow(ctx, countSQL, userID).Scan(&count); err != nil {
		return err
	}
	if count >= limit {
		return ErrPlanLimitReached
	}

	if err := insertFn(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}
	committed = true
	return nil
}

// errPoolNil is a sentinel that signals withPlanLimit was called without a pool.
// Handlers use this to fall back to non-transactional behaviour so that
// existing mock-based unit tests remain unaffected.
var errPoolNil = errors.New("pool is nil: falling back to non-transactional path")
