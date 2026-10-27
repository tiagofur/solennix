// Package planlimit is the single source of truth for basic-plan scale
// limits: the numeric caps, the canonical COUNT queries they are measured
// with, and the advisory-lock + count check that enforces them atomically
// inside an open transaction.
//
// Semantics (PRD 04_MONETIZATION §2.1): the free tier is capped at 4 events
// per calendar month, counted by the events' own event_date within the
// current month (not by created_at), and 20 total clients. Both the CRUD
// handlers (via handlers.withPlanLimit) and the public-request conversion
// path use this package so the limits can never drift apart again.
package planlimit

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ErrLimitReached is returned when the counted rows already sit at the limit.
var ErrLimitReached = errors.New("plan limit reached")

// Resource keys scope the per-(user,resource) advisory lock. They double as
// the `limit.type` value written into 403 plan_limit_exceeded responses.
const (
	ResourceEvents  = "events"
	ResourceClients = "clients"
)

// Basic-plan scale limits (PRD 04_MONETIZATION §2.1).
const (
	BasicEventLimit  = 4
	BasicClientLimit = 20
)

// Canonical COUNT queries. countSQL must accept exactly one positional
// parameter ($1 = userID) and return a single integer row.
const (
	EventCountSQL  = `SELECT count(*) FROM events WHERE user_id = $1 AND date_trunc('month', event_date) = date_trunc('month', CURRENT_DATE)`
	ClientCountSQL = `SELECT COUNT(*) FROM clients WHERE user_id = $1`
)

// CheckTx acquires the per-(user,resource) advisory lock, counts under it,
// and compares against the limit — all inside the caller's open transaction.
// The lock serializes concurrent limit-gated writes for the same user and
// resource (e.g. CRUD creates vs. public-request conversions), so a count
// taken under it is authoritative until the transaction commits.
//
// It returns the counted rows and ErrLimitReached when count >= limit.
// Callers keep responsibility for running their INSERT in the same
// transaction and committing; CheckTx never commits.
func CheckTx(ctx context.Context, tx pgx.Tx, userID uuid.UUID, resourceKey string, limit int, countSQL string) (int, error) {
	lockKey := userID.String() + ":" + resourceKey
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, lockKey); err != nil {
		return 0, err
	}
	var count int
	if err := tx.QueryRow(ctx, countSQL, userID).Scan(&count); err != nil {
		return 0, err
	}
	if count >= limit {
		return count, ErrLimitReached
	}
	return count, nil
}
