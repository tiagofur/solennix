package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// seedStaffAndAssignment inserts a staff row (owned by organizerID) and an
// event_staff assignment, returning (staffID, eventStaffID). When
// invitedUserID is non-nil the staff is linked to that user (the team member).
// This is the first event_staff seed helper in the test suite (#875).
func seedStaffAndAssignment(t *testing.T, pool *pgxpool.Pool, organizerID, eventID uuid.UUID, invitedUserID *uuid.UUID) (uuid.UUID, uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	var staffID uuid.UUID
	err := pool.QueryRow(ctx,
		`INSERT INTO staff (user_id, name, invited_user_id) VALUES ($1, $2, $3) RETURNING id`,
		organizerID, "Colaborador Test", invitedUserID,
	).Scan(&staffID)
	require.NoError(t, err, "seed staff")

	var eventStaffID uuid.UUID
	err = pool.QueryRow(ctx,
		`INSERT INTO event_staff (event_id, staff_id) VALUES ($1, $2) RETURNING id`,
		eventID, staffID,
	).Scan(&eventStaffID)
	require.NoError(t, err, "seed event_staff")
	return staffID, eventStaffID
}

func TestExecutionState_GetReturnsDefaults_WhenNeverSaved(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	orgID := seedUser(t, pool, "org@example.com")
	tmID := seedUser(t, pool, "team@example.com")
	clientID := seedClient(t, pool, orgID, "Cliente")
	eventID := seedEvent(t, pool, orgID, clientID, "2026-08-01")
	tmPtr := tmID
	_, esID := seedStaffAndAssignment(t, pool, orgID, eventID, &tmPtr)

	repo := NewStaffRepo(pool)
	state, err := repo.GetExecutionState(context.Background(), tmID, esID)
	require.NoError(t, err)
	assert.Equal(t, ExecutionChecklist{}, state.Checklist)
	assert.Equal(t, "", state.QuickNote)
}

func TestExecutionState_UpsertThenGet_RoundTrips(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	orgID := seedUser(t, pool, "org@example.com")
	tmID := seedUser(t, pool, "team@example.com")
	clientID := seedClient(t, pool, orgID, "Cliente")
	eventID := seedEvent(t, pool, orgID, clientID, "2026-08-01")
	tmPtr := tmID
	_, esID := seedStaffAndAssignment(t, pool, orgID, eventID, &tmPtr)

	repo := NewStaffRepo(pool)
	in := AssignmentExecutionState{
		Checklist: ExecutionChecklist{Arrival: true, Materials: false, Closing: true},
		QuickNote: "llevar mesa extra",
	}
	saved, err := repo.UpsertExecutionState(context.Background(), tmID, esID, in)
	require.NoError(t, err)
	assert.Equal(t, in, *saved)

	got, err := repo.GetExecutionState(context.Background(), tmID, esID)
	require.NoError(t, err)
	assert.Equal(t, in.Checklist, got.Checklist)
	assert.Equal(t, in.QuickNote, got.QuickNote)
}

func TestExecutionState_Get_NotFound(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	tmID := seedUser(t, pool, "team@example.com")

	repo := NewStaffRepo(pool)
	_, err := repo.GetExecutionState(context.Background(), tmID, uuid.New())
	assert.ErrorIs(t, err, ErrAssignmentNotFound)
}

func TestExecutionState_Get_ForbiddenWhenNotOwner(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	orgID := seedUser(t, pool, "org@example.com")
	tmID := seedUser(t, pool, "team@example.com")
	otherID := seedUser(t, pool, "other@example.com")
	clientID := seedClient(t, pool, orgID, "Cliente")
	eventID := seedEvent(t, pool, orgID, clientID, "2026-08-01")
	tmPtr := tmID
	_, esID := seedStaffAndAssignment(t, pool, orgID, eventID, &tmPtr)

	repo := NewStaffRepo(pool)
	_, err := repo.GetExecutionState(context.Background(), otherID, esID)
	assert.ErrorIs(t, err, ErrAssignmentForbidden)
}

func TestExecutionState_Upsert_ForbiddenWhenNotOwner(t *testing.T) {
	pool := openTestPool(t)
	defer pool.Close()
	resetDatabase(t, pool)

	orgID := seedUser(t, pool, "org@example.com")
	tmID := seedUser(t, pool, "team@example.com")
	otherID := seedUser(t, pool, "other@example.com")
	clientID := seedClient(t, pool, orgID, "Cliente")
	eventID := seedEvent(t, pool, orgID, clientID, "2026-08-01")
	tmPtr := tmID
	_, esID := seedStaffAndAssignment(t, pool, orgID, eventID, &tmPtr)

	repo := NewStaffRepo(pool)
	_, err := repo.UpsertExecutionState(context.Background(), otherID, esID, AssignmentExecutionState{})
	assert.ErrorIs(t, err, ErrAssignmentForbidden)
}
